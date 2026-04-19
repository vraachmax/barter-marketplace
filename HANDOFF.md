# Barter Clone — Handoff Context

## Статус: ALPHA | Текущая фаза: Phase 3 ✅ · Hotfix #6–#14 ✅ · Mobile Redesign v1 ✅ · Mode-aware UI ✅ (2026-04-19)
## Следующая задача (очередь):
1. **Hotfix #14 (только что):** `/search` → Avito-стиль мобильного поиска с live-suggestions, fuzzy-match категорий, недавними запросами, FiltersSheet. ✅
2. **Phase 1.x mobile sprint (#55→#53→#54→#48):** все 4 задачи директивы Максима ✅✅✅✅ закрыты.
3. **Phase 1.x остальное:** `/messages` (#49, pinned support + автоответы).
4. **Phase 4** — поиск + персонализация. **Phase 13** — раздел «Бартер» (USP).

## 2026-04-19 (10) — Hotfix #14: /search → Avito-стиль мобильного поиска

Задача #48 — финальная из директивы Максима «Всё подряд: #55 → #53 → #54 → #48».
До: `/search` был тонким редиректом на главную с тем же feed — пользователь,
который тапал по search-input в шапке, получал ленту «как была», без состояний
«пустой запрос / набираю / есть результаты». Нет недавних, нет фильтров по цене,
нет сортировки, нет подсказок категорий.

**Что сделано:** новый файл `apps/web/src/app/search/page.tsx` (914 строк):

- **Sticky-шапка:** [←] + `<input>` с auto-focus (когда initialQ пустой),
  enterKeyHint="search", кнопка [×] внутри поля для clear, кнопка «Найти»
  справа (видима на sm+).

- **Состояние «пустое поле»:**
  - **Недавние запросы:** чипы из localStorage
    (ключ `barter:recentSearches`, max 8, lowercase-dedup). Кнопка
    «Очистить» справа. При клике — немедленный commit.
  - **Популярные запросы:** 8 hardcoded
    (iPhone, Велосипед, Диван, Коляска, Кроссовки, PlayStation,
    Ноутбук, Куртка зимняя). Grid 2×4 на мобильном, flex-wrap на десктопе.
  - **Категории:** icon-bubble grid 2/3/4 col (mode-accent-soft фон,
    mode-accent иконка), клик → commit + set categoryId.

- **Состояние «набираю» (draftQuery.length >= 2):**
  - **Live-suggestions:** debounce 180ms → `GET /search/suggestions?q&limit=6`
    (Meilisearch + Prisma fallback на бэке). HighlightedText для
    match-фрагмента (`<mark>` на `var(--mode-accent)`).
  - **Fuzzy-match категорий:** локально, мгновенно, top-4 по
    substring match title (`fuzzyMatchCategoriesByTitle`).

- **Состояние «результаты» (activeQuery || categoryId):**
  - **Чип-ряд:** [Фильтры •N] + активные чипы с «✕»
    (категория/сортировка/цена).
  - **2-col grid** из `ListingCardComponent` (thumbHeight=160, apiBase).
  - **Skeleton ×8** во время loading (ListingCardSkeleton).
  - **Пустое состояние:** card с советами («попробуйте изменить запрос
    или сбросить фильтры»).
  - **SummaryRow:** «{N} {объявление/объявления/объявлений}» с плюрализацией.

- **FiltersSheet (bottom-anchored modal):**
  - Backdrop click-to-close + content click-stopPropagation.
  - **Категории:** pill-chips из `cats`, активная на `var(--mode-accent)`.
  - **Сортировка:** 4 radio-варианта
    (relevant / new / cheap / expensive), visual-radio-row.
  - **Цена:** `<input type="number">` × 2 (priceMin / priceMax),
    inline-валидация через Tailwind arbitrary.
  - **Футер:** [Сбросить] + [Показать N результатов] на `var(--mode-cta)`.

- **URL-sync:** `router.push('/search?q=…&sort=…&priceMin=…&categoryId=…')`
  на commitQuery() и applyFilters() — shareable links, работает [Back].
  Начальные значения из `useSearchParams`.

- **localStorage helpers:** `loadRecent()` / `saveRecent(q)` / `clearRecent()` —
  SSR-safe (проверка `typeof window !== 'undefined'`).

- **Палитра:** только `var(--mode-accent*)` и `var(--mode-cta)` +
  семантические токены (foreground / muted / border / card).
  0 использований `bg-primary` / `text-primary` / `bg-secondary` / brand-токенов.

- **Иконки:** все `lucide-react` с `shrink-0` (Hotfix #11 convention).

- **Доступность:** `aria-label` на всех icon-only buttons,
  `role="dialog" aria-modal="true"` на FiltersSheet,
  `enterKeyHint="search"` + `inputMode="search"` на input.

- **Suspense-wrap:** страница импортируется `SearchContent`, обёрнутая в
  `<Suspense>` со spinner-fallback (избегаем Next 16 warning об
  useSearchParams без Suspense).

**Верификация:**
- `npx tsc --noEmit` → exit 0
- `npx eslint src/app/search/page.tsx` → 0 errors, 0 warnings
  (после ESLint-disable для 2 legitimate setState-in-effect сайтов:
  `setRecent(loadRecent())` в init-effect и `setSuggestions([])` в guard-clause
  debounce-effect — это sync external localStorage/draftQuery → React state).

**Commit:** `933087f` (master, pushed → Vercel auto-deploy).

**Закрыта директива Максима «#55 → #53 → #54 → #48»:** все 4 задачи финально
выполнены. `/search` теперь равноценный Avito-экран: набор→подсказки→результаты
→фильтры, с модульной палитрой, shareable URL, и memory of recent queries.

## 2026-04-19 (9) — Hotfix #13: /new → Avito-style 5-step wizard

Задача #54 из директивы Максима: «Локально (fuzzy match по title/keywords) —
мгновенно, без AI». До: `/new` была «всё-на-одной-странице» с фото, описанием,
характеристиками и сайдбаром цены/города/категории — длинный скролл, пустой
`<select>` категории пугал новичков.

**Что сделано:** полный рефакторинг `apps/web/src/app/new/page.tsx`
(768 → 1359 строк, 74% rewrite):

- **5 шагов мастера** с прогресс-баром сверху и sticky bottom-bar:
  1. **«Что продаёте?»** — один большой Input + live-подсказки категорий.
     Алгоритм fuzzyMatchCategory(): score = 100 (title-substring) +
     50 + 2*len(kw) на каждое keyword-совпадение, top-4 в подсказках.
     Fallback `<details>` «Выбрать вручную» с полным списком (раскрывается
     автоматически если текст ≥2 символа и подсказок нет).
  2. **«Категория и описание»** — breadcrumb выбранной категории
     (с кнопкой «Изменить» → возврат на step 1), цена, описание (10+),
     характеристики (ListingCategoryAttributesForm) динамически по slug.
  3. **«Фото»** — drag-n-drop с подсветкой mode-accent, лимит 10,
     первое фото помечено бейджем «обложка», preview grid 3/4/5 col.
  4. **«Где?»** — город + подсказка про приватность точного адреса.
  5. **«Готово»** — auth-card (loading/ok/need-login), summary
     (категория/город/фото-count/desc-len), кнопка «Опубликовать»
     на `var(--mode-cta)`.

- **Локальный fuzzy-match словарь** (~230 keywords across 9 categories):
  - `auto`: bmw/audi/mercedes/lada/тойота/хендай/мотоцикл/газель/…
  - `realty`: квартир/комнат/студи/дом/дач/гараж/аренда/однушк/…
  - `job`: работа/вакансия/курьер/программист/водитель/…
  - `services`: ремонт/сантехник/клининг/репетитор/маникюр/юрист/…
  - `electronics`: айфон/galaxy/macbook/наушники/airpods/playstation/…
  - `home`: диван/кровать/шкаф/стиральн/пылесос/дрель/…
  - `clothes`: куртк/платье/джинс/кроссовк/nike/zara/…
  - `kids`: коляск/игрушк/lego/самокат/подгузник/…
  - `hobby`: велосипед/гитара/настольн/гантел/рыбал/палатк/…

- **canGoNext(step)** + **nextStepHint(step)**: per-step валидация с inline
  подсказкой («Выберите категорию из подсказок», «Описание: минимум 10
  символов», «Войдите, чтобы опубликовать»). Кнопка «Далее» disabled +
  серая до выполнения условия.

- **PostPublishScreen** — отдельный компонент с success-card на
  `--mode-accent-soft`, две CTA («Открыть объявление» / «Создать ещё»),
  и опциональный upload-more блок.

- **Палитра**: только `var(--mode-accent*)` и `var(--mode-cta)`. Никаких
  `bg-primary` / `text-accent` / `text-secondary` / brand-токенов
  (которые в Бартер-режиме даём оранжевые/синие пятна).

- **Бизнес-логика сохранена 1-в-1**: `submit()`, `uploadPendingToListing()`,
  `addFiles()`, `revokePending()`, error handling
  (listing_daily_limit / listing_active_limit / listing_duplicate_similarity).

**Верификация:** `npx tsc --noEmit` → exit 0. ESLint clean (после удаления
unused `Camera` import). 

**Commit:** `236a3f0` (master, pushed → Vercel auto-deploy).


## 2026-04-19 (8) — Hotfix #12: /listings → Avito-стиль (3 таба + mode-cta CTA)

Задача #53 из директивы Максима «Всё подряд: #55 → #53 → #54 → #48». До:
4 таба (ВСЕ/ACTIVE/SOLD/ARCHIVED), пользователь вынужден отдельно искать
объявления с проблемами (PENDING модерация, дубликат фото, без цены), CTA
размещения была на `bg-[#00AAFF]` хардкоде → синяя в обоих режимах + не
выделялась как primary action.

**Что сделано:** `apps/web/src/app/listings/page.tsx` (+258/−101):

- **Таксономия:** `ListingTab` тип `'ALL'|'ACTIVE'|'ARCHIVED'|'SOLD'` →
  `'ACTIVE'|'NEEDS_ACTION'|'COMPLETED'`. URL backward-compat: `ALL`→`ACTIVE`,
  `ARCHIVED`/`SOLD`→`COMPLETED` (старые ссылки не ломаются).

- **`needsAction(x)` helper** определяет «требует действия» с reason-строкой:
  - `PENDING` → «Ожидает модерации — подтвердите публикацию»
  - `BLOCKED` → «Объявление скрыто модерацией»
  - `duplicateImageFlag` → «Фото совпало с другим объявлением — замените»
  - `ACTIVE` без `priceRub` → «Не указана цена»
  - `ACTIVE` без `images` → «Нет ни одного фото»

- **Mobile view** (новый): sticky header с back/title/search, табы-pills с
  mode-accent индикатором (нижняя 2px-полоса), компактная строка-карточка
  80×80 thumb + meta (город, статус) + per-card amber chip с reason.
  Sticky bottom CTA «Разместить объявление» на `var(--mode-cta)` (лайм для
  Маркета, оранж для Бартера) + `boxShadow: var(--mode-accent-ring)` +
  PlusCircle prefix; над bottom-nav (h=56) с зазором 72px.

- **Desktop view:** title + та же mode-cta CTA в шапке. Segmented tabs на
  `bg-muted` с 3 пилюлями; для активной NEEDS_ACTION (count > 0) — color
  переключается на `var(--mode-accent)` чтобы привлечь внимание.

- **Palette migration** (полный sweep):
  - `bg-[#00AAFF]` (CTA) → `var(--mode-cta)` + ring shadow
  - `bg-primary` (Save, empty-state CTA) → `var(--mode-accent)` / `--mode-cta`
  - `text-primary` (title hover) → `hover:[color:var(--mode-accent)]`
  - `border-secondary/30 bg-secondary/10 text-secondary` (PENDING confirm) →
    `border-success/30 bg-success/10 text-success` (зелёный = «можно публиковать»)
  - Edit form `focus:border-primary/30 focus:ring-primary/30` →
    `focus:[border-color:var(--mode-accent-ring)] focus:[--tw-ring-color:var(--mode-accent-ring)]`
  - Spinner Suspense fallback → inline `borderColor: var(--mode-accent-ring)`
  - Mobile header `bg-[#f4f4f4]` / `text-[#1a1a1a]` → `bg-muted` / `text-foreground`
  - need_auth state хексы → `var(--mode-accent-soft)` / `var(--mode-accent)`

- **Status-чипы** (как в Hotfix #10 на /profile): ACTIVE→success,
  PENDING/SOLD→mode-accent, BLOCKED→destructive, ARCHIVED→muted.

- **`shrink-0`** добавлен на ArrowLeft, Search (mobile header), Sparkles,
  PlusCircle×2, AlertTriangle, FileText, спиннер — продолжение Hotfix #11.

**Верификация:** `npx tsc --noEmit` → exit 0. Grep на `bg-primary|text-primary|
bg-secondary` → только JSDoc-комментарии в шапке файла.

**Commit:** `cdd5016` (master, pushed → Vercel auto-deploy).


## 2026-04-19 (7) — Hotfix #11: «вытянутые» иконки → shrink-0

Максим: «иконки в /new, /messages, /избранное какие-то вытянутые». Корень: lucide
рендерит `<svg width={size} height={size}>`; как прямой ребёнок flex-контейнера
SVG получает default `flex: 0 1 auto` → ширина может сжаться, высота держится из
атрибута → визуально иконка «вытягивается» вертикально. Тот же баг у спиннер-spans
(`inline-block size-[N]` без `shrink-0`).

**Что сделано:** добавил `shrink-0` (= `flex-shrink: 0`) на каждый прямой
flex-child SVG/spinner, без других визуальных изменений.

- **`apps/web/src/app/new/page.tsx`** — 10 иконок (ChevronLeft, CheckCircle×2,
  Circle×2, PlusCircle×2 + кнопка-чип, UserCircle, LayoutGrid, Wallet, MapPin)
  + 2 спиннера (auth-loading 18px, publish-busy 22px).

- **`apps/web/src/app/messages/page.tsx`** — 7 иконок (ChevronLeft, MessageCircle
  mobile-header, Link2 desktop-cta, Link2 mobile-cta, CheckCircle read-state×2,
  Wand2 advise-chip) + 2 спиннера (chat-list loading 32px, advise-busy 14px).

- **`apps/web/src/app/favorites/page.tsx`** — 1 иконка (Home в «На главную» CTA).

**Файлы:** 3 файла, +24/−24 строки.
**Верификация:** `npx tsc --noEmit` → exit 0. Globals.css не имеет глобального
SVG-reset (только `.want-line svg { color }`), значит фикс через `shrink-0`
самодостаточный.

**Commit:** `83b8abc` (master, pushed).


## 2026-04-19 (6) — Hotfix #10: mobile /favorites + /profile palette & font audit

Задачи #50 и #51 из очереди Hotfix #9. Максим: «лента избранного выглядит как-то странно»
+ общий палитра-контракт (синий = Маркет, оранжевый = Бартер). Профиль был забит
хардкод-хексами синего Avito на всех уровнях (хедер модалок, KPI-плитки, кошелёк,
trust-бейджи, статус-чипы, фокус-кольца инпутов) — в режиме Бартер это давало синие
заплатки поверх оранжевой темы.

**Что сделано:**

- **`apps/web/src/app/favorites/page.tsx`** — полный rewrite (~175 строк). Убрали
  сломанный `bg-primary via-white` хедер и «custom» карточку-список. Теперь:
  sticky mode-accent хедер с Heart-иконкой, 2-col mobile / 3-col md / 4-col lg
  grid через `ListingCardComponent` (паритет с лентой), per-card Trash2-кнопка
  удаления в правом верхнем углу (z-3, bg-background/95, hover:destructive),
  empty-state на `--mode-accent-soft` + `--mode-accent`, русская плюрализация
  «объявление/объявления/объявлений». Loading skeleton: 6 `ListingCardSkeleton`
  заглушек такой же геометрии.

- **`apps/web/src/app/profile/profile-content.tsx`** (1142→1170 строк) — palette
  audit, без реорганизации layout:
  - Хардкод-хексы → `--mode-accent*`: `#007AFF`/`#0088FF`/`#00AAFF`/`#0099EE`/
    `#0066DD`/`#0077DD` → `--mode-accent` (+ `-hover`); `#E8F2FF`/`#f0f9ff` →
    `--mode-accent-soft`; `#FF6F00` sparkle → `--mode-accent`.
  - Tailwind brand-токены → семантика / mode-accent: `bg-primary` (кошелёк, CTA,
    эмпти-state, промо-кнопка, save-кнопка) → `--mode-accent`; `text-primary`
    (Диалоги, «На главную», title-hover, pricing-hover) → `--mode-accent`; avatar
    `bg-primary`/`text-primary` → `--mode-accent-soft`/`--mode-accent`;
    `bg-accent/10` archived tab → `bg-muted`.
  - Status-чипы (новая функция `statusLabel`): ACTIVE→success, PENDING→mode-accent,
    BLOCKED→destructive, SOLD→mode-accent, ARCHIVED→muted. Ring-цвет через
    `[--tw-ring-color:var(--mode-accent-ring)]` + `ring-1`.
  - Verified-badge (CheckCircle на аватаре) → `bg-success` вместо `bg-secondary/10`
    (неконсистентная прозрачность с белой иконкой поверх).
  - Focus-rings инпутов edit-формы и топ-ап-модалки → `focus:[border-color:
    var(--mode-accent-ring)] focus:[box-shadow:0_0_0_2px_var(--mode-accent-ring)]`
    (раньше `focus:border-primary/30 focus:ring-primary/30`).
  - Star-rating `fill-accent text-accent` → inline `color: '#FFB800', fill: '#FFB800'`
    (нейтральный «рейтинговый» gold, как у Google/Yandex; не оранжевый Avito).
  - «Все основные задачи выполнены» panel: `secondary` → `success` (семантика).
  - PENDING «Подтвердить публикацию» button: `secondary` → `success`.
  - Добавлен leading JSDoc-блок с описанием миграции и font-audit сноской.

- **Font audit:** grep по `font-mono|font-serif|font-[|fontFamily` в profile-content.tsx
  → 0 совпадений. Страница inheritit `--font-sans` (= Golos Text) из `layout.tsx` через
  body className. Fallback-chain: `Golos → system-ui → sans-serif`. ✅

**Файлы тронутые в Hotfix #10:**
```
apps/web/src/app/favorites/page.tsx                     (rewrite, ~175 строк)
apps/web/src/app/profile/profile-content.tsx            (palette audit, +30 edits)
```

**Верификация Hotfix #10:**
- [x] `npx tsc --noEmit` в `apps/web` — exit 0, чистый
- [ ] Визуальная сверка `/favorites` + `/profile` в обоих режимах: ни одного
      синего пиксела в Бартере, ни одного оранжевого в Маркете (кроме звёзд
      рейтинга — они нейтрально-золотые).
- [ ] Регрессия: home / listing / messages должны выглядеть как были.


## 2026-04-19 (5) — Hotfix #9: listing-detail palette audit (orange-on-blue leak fix)

Фокус — задача #52 из бэклога Hotfix #8. Максим жаловался: «моментами когда заходишь на
объявление там где-то на синем фоне оранжевый шрифт». Проблема — на странице
`/listing/[id]/page.tsx` блок «Безопасная сделка» использовал статический `bg-accent/10
text-accent` (= оранжевый Avito #FF6D00), а вокруг — bridge-`primary` (= синий #00AAFF).
В режиме Бартер было наоборот: синие кнопки и аватары на оранжевом окружении. Полный палитра-лик.

**Что сделано:**

- **`apps/web/src/app/listing/[id]/page.tsx`** — все вхождения `text-primary`, `bg-primary`,
  `text-accent`, `border-accent/30`, `bg-accent/10` заменены на `--mode-accent*` через inline
  `style` (для CSS-переменных) или Tailwind v4 arbitrary `hover:[color:var(--mode-accent)]`.
  Конкретно: breadcrumbs hover, safety-notice (фон/бордер/текст/иконка), CTA «Написать
  сообщение», seller avatar bg, hover имени продавца, Badge «Документы проверены», ссылка
  «Все объявления продавца →».

- **`apps/web/src/components/show-phone-button.tsx`** — переписан, теперь использует класс
  `.btn-show-phone` (= зелёный CTA #87D32C в Маркете, оранжевый `--mode-accent` в Бартере).
  Раньше использовал статический `secondary` (зелёный Avito #009F44). «Расскрытое» состояние
  (телефон/email) теперь на `--mode-accent-soft` фоне с `--mode-accent` текстом.

- **`apps/web/src/components/favorite-toggle.tsx`** — hover-палитра кнопки «Добавить в
  избранное» теперь `--mode-accent*` (раньше красила в статический оранжевый `accent`).
  Сердечко оставлено `#f5576c` — семантический «like»-цвет.

- **`apps/web/src/components/listing-mini-map.tsx`** — pin-маркер на карте и MapPin-иконка
  под картой перевязаны на `--mode-accent` (раньше — статический primary-blue).

- **`apps/web/src/components/listing-gallery.tsx`** — обводка активной thumb-картинки
  привязана к `--mode-accent-ring` (раньше `border-primary/30 ring-2 ring-primary/30`).

- **`apps/web/src/components/seller-review-form.tsx`** — критический фикс: контейнер имел
  сломанный класс `bg-primary to-white` (без `bg-gradient-to-b`, фактически solid синий
  Avito-primary). Заменено на `bg-card`. Все `text-primary`/`bg-primary`/`text-accent`/
  `bg-accent` в дочерних элементах (auth-required notice, текстарея focus-ring, кнопка
  «Опубликовать», CTA «Перейти в чат», fallback-блок) — на `--mode-accent*`. Success-
  сообщения оставлены `text-success` (семантический зелёный).

- **`apps/web/src/components/listing-bot-assistant.tsx`** — фон, бейдж, заголовок, текст,
  ссылки на похожие — всё на `--mode-accent*`. Раньше сплошной `bg-primary` (Avito-blue).

**Файлы тронутые в Hotfix #9:**
```
apps/web/src/app/listing/[id]/page.tsx
apps/web/src/components/show-phone-button.tsx
apps/web/src/components/favorite-toggle.tsx
apps/web/src/components/listing-mini-map.tsx
apps/web/src/components/listing-gallery.tsx
apps/web/src/components/seller-review-form.tsx
apps/web/src/components/listing-bot-assistant.tsx
```

**Что НЕ тронули и почему:**
- `seller-presence-badge.tsx` — `text-secondary` для «В сети» зелёный — семантический
  online-indicator, общий для обоих режимов. Оставлено как было.
- `ListingCard` промо-ring — уже было прокомментировано в Hotfix #8 (промо-бейджи скрыты
  CSS-фильтром в Бартере, поэтому `ring-accent/40` не вытекает).
- `listing-actions.tsx` — `secondary` (зелёный) использован только для success-state
  «Жалоба отправлена», `destructive` (красный) — для опасных действий. Оба семантические.

**Верификация Hotfix #9:**
- [x] `npx tsc --noEmit` в `apps/web` — exit 0, чистый
- [ ] Визуальная сверка `/listing/[id]` в обоих режимах: orange-on-blue не должно быть нигде
- [ ] Регрессия по другим страницам: home / favorites / messages / profile


## 2026-04-19 (4) — Hotfix #8: bottom-nav mode-color + header chip + gradient-categories + Market-cluster

Фидбек Максима после Hotfix #7 (14 пунктов одним сообщением). Mobile-only scope.

**Что сделано в этом коммите:**

- **Bottom-nav теперь mode-aware** (`apps/web/src/components/mobile-bottom-nav.tsx`).
  Активная иконка + лейбл красятся в `var(--mode-accent)` (оранжевый в Бартере, синий в Маркете).
  FAB-кнопка «+Добавить» — тоже `--mode-accent` + `box-shadow: 0 4px 12px var(--mode-accent-ring)`.
  Переключение мгновенное (CSS-переменные, без ре-рендера).

- **Кнопка «Поиск» в nav ведёт на `/search`** (новый маршрут, Phase 1.x). Fallback: если /search
  ещё не смонтирован, пользователь видит Next.js 404 — планируется клон моб. Авито с полной
  решёткой категорий + фильтрами (Task #48).

- **MapPin переехал на место колокольчика в шапке** (`apps/web/src/app/page.tsx` mobile header).
  Bell удалён: уведомления и так агрегируются в `/messages`. Теперь в шапке справа — компактный
  pill-чипс с MapPin+городом+ChevronDown (`<button>`, обработчик селектора города — в Phase 1.x),
  а строка под поиском (ранее отдельная) полностью убрана. Экономим ~30px высоты шапки.

- **Категории получили градиентный круг** (`apps/web/src/app/globals.css` → `.cats-avito .cat-media`).
  56×56px круг с CSS-градиентом (из `--cat-*` токенов), 28px эмодзи, мягкая тень.
  Раньше был grey square 56×72 справа с плоской подложкой — теперь визуально ближе к Авито 2026.

- **«Все» убрана из мобильной сетки категорий.** На мобиле — сразу плитки по категориям
  (без «Все»-бабблов). На десктопе «Все» остаётся **только в режиме Маркет** через
  `data-market-only-strict="true"` (в Бартере CSS скрывает её; в Бартере «Все» бессмысленна,
  т. к. режим = фильтр).

- **Расширен список категорий** (page.tsx → `CATS`): добавлены `home` (Для дома и дачи),
  `kids` (Детские товары), `clothes` (Одежда и обувь), `hobby` (Хобби и отдых), `sport` (Спорт
  и туризм). Итого на мобиле в Бартере видны: Авто · Электроника · Для дома и дачи · Детские
  товары · Одежда и обувь · Хобби и отдых · Спорт и туризм · Жильё для путешествий.
  В Маркете добавляются `realty`, `job`, `services` (через снятие `data-market-only` фильтра).

- **`MarketExampleCluster` создан** (`apps/web/src/components/market-example-cluster.tsx`) —
  зеркало `BarterExampleCluster`, 8 товарных карточек с теми же фото + цена + CTA
  «Показать номер» (салатовый `--mode-cta` = #87D32C Avito-style). Показывается ТОЛЬКО в Маркете
  через существующий фильтр `html[data-mode="barter"] [data-market-only="true"] { display:none }`.
  Рядом в ленте больше не пусто ни в одном режиме до Phase 4/13.

- **`.btn-show-phone`** — новый класс в `globals.css` (для Market CTA). Цвет = `--mode-cta`,
  hover = `--mode-cta-hover`. В Бартере (если компонент случайно попадёт в DOM) деградирует
  к `--mode-accent` (оранжевый). Использует иконку `Phone` из lucide (12px).

- **ListingCard palette audit** — в `components/listing-card.tsx` промо-ring оставлен на
  `ring-accent/40` / `ring-primary/40` (бренд-palette), т. к. промо-бейджи сами по себе
  CSS-скрыты в Бартере. Палитра-лик на детальной странице (`/listing/[id]`) — отдельная
  задача #52 (orange-on-blue bug Максима).

**Файлы тронутые в Hotfix #8:**
```
apps/web/src/app/globals.css              → .cat-media gradient circle, .btn-show-phone
apps/web/src/app/page.tsx                 → CATS expanded, MapPin chip, Bell removed, Market cluster
apps/web/src/components/mobile-bottom-nav.tsx → --mode-accent bindings, /search route
apps/web/src/components/market-example-cluster.tsx → NEW (8 product cards, "Показать номер")
apps/web/src/components/listing-card.tsx → promoRing comment clarifying no leak
```

**Что НЕ сделано (остаётся в бэклоге):**

| # | Задача | Task ID |
|---|--------|---------|
| 1 | `/search` мобильная страница — клон Авито 1:1 (широкий грид категорий + фильтры). Ссылки: есть git-репы Авито на GitHub, надо изучить. | #48 |
| 2 | `/messages` mobile — pinned support-chat (SupportTemplate backend уже готов), автоответы, фикс масштабирования превью. | #49 |
| 3 | `/favorites` mobile — фикс «вычурного» вида, стандартная 2-col grid геометрия как в ленте. | #50 |
| 4 | `/profile` mobile — Avito-like аватар-header, stats, tabs; font-audit (Golos Text везде). | #51 |
| 5 | Listing detail — palette-leak fix (оранжевый текст на синем фоне в Маркете). | #52 |

**Верификация Hotfix #8:**
- [ ] `npx tsc --noEmit` — чистый
- [ ] Визуальная сверка на мобиле: bottom-nav красится при переключении режима
- [ ] MapPin-чипс отображается на месте колокольчика, нет строки локации под поиском
- [ ] «Все» отсутствует на мобиле в обоих режимах; в Бартере нет realty/job/services
- [ ] MarketExampleCluster виден только при Маркете, CTA зелёный; BarterExampleCluster виден
      только при Бартере, CTA оранжевый
- [ ] Категории-плитки имеют градиентные круги, эмодзи крупнее
- [ ] Git commit + push в master

## 2026-04-19 (3) — Hotfix #7: точная сверка мобильной главной с handoff-bundle-v2/home.html

Пользователь запросил повторный handoff-бандл и попросил привести мобильную главную к реферу 1:1:
«пусть выглядит так как на референсе, включая статус бар. категории должны быть в два ряда,
а ты сделал в маркете три ряда, плюс много объявлений пропало из выдачи, плюс на референсе
есть доп кнопки, например обменять и тд, если нужно для примера сделай кластер объявлений для
обмена, чтобы раздел бартер не выглядел пустым. так же плашка "обмен без денег" можно убрать,
поскольку мы уже реализовываем этот режим».

**Что сделано (коммит `7304a32`, push to master):**
- **Шапка БЕЛАЯ** (реф `.app-header`) — акцент только у индикаторов: точка-бейдж у колокольчика +
  счётчик «12» у сердца. Убран коллажный блюр-фон, `var(--mode-primary)` больше не красит шапку.
- **Status-bar тоже белый** — `COLOR_BY_MODE` в `ModeThemeSync` теперь `{barter: '#FFFFFF',
  market: '#FFFFFF'}` + pre-paint скрипт в `layout.tsx` прошит на `#FFFFFF`. Реф не использует
  цветной status-bar; оба режима = белый.
- **Категории — `cats-avito` 2-рядный горизонтальный скролл** (реф `.cats-avito`: grid
  `grid-auto-flow: column; grid-template-rows: repeat(2, 72px); grid-auto-columns: 150px`).
  Вместо старых 3+8 колонок — единая сетка из 7 плиток (Все с бабблами, Недвижимость, Работа,
  Авто, Электроника, Услуги, Жильё для путешествий). Белые плитки, текст-слева + эмодзи-справа
  на цветной подложке.
- **Убран баннер «Обмен без денег»** — режим уже реализован.
- **Карточки в Бартере получили:** swap-badge (чёрная пилюля `rgba(0,0,0,0.72)` внизу-слева
  превью), оранжевую «Хочу: …» строку, CTA «Хочу обменять» на `--mode-accent-soft`. Маркируются
  `data-barter-only="true"` и скрываются в Маркете CSS-правилом
  `html:not([data-mode="barter"]) [data-barter-only="true"] { display: none }`.
- **Мок-кластер `BarterExampleCluster`** (новый компонент) — 8 эталонных объявлений обмена
  1:1 из `home.html` (iPhone 13, Nike Air Max, Yamaha F310, диван, велосипед, книги, PS5,
  коляска). Виден только в Бартере, как временная витрина до Phase 13.
- **Новые CSS-токены** (`--mode-header-bg`, `--mode-accent`, `--mode-accent-soft`,
  `--mode-accent-hover`, `--mode-accent-ring`) переопределены для обоих режимов.
- **main теперь `bg-background`** на мобильном (убран `-mt-5 rounded-t-3xl bg-muted` занавес —
  когда шапка белая, он создавал лишнюю серую полосу).

**Верификация:** `npx tsc --noEmit` — clean (exit 0). Визуальный тест на мобиле — за пользователем.

## 2026-04-19 (2) — Mode-aware UI-система: палитра, плейсхолдер, фильтрация категорий

Пользователь попросил: при переключении Бартер↔Маркет менять **всё мобильное оформление**, а не
только режим фильтра. Реализовано полностью mode-aware через CSS-переменные + `<html data-mode="...">`.

**Чем управляется режим:**
- `localStorage.getItem('barter_mode')` — `'barter' | 'market'`, дефолт = `barter`.
- `MobileModeToggle` сохраняет режим и диспатчит `barter:mode-change` CustomEvent.
- Инлайновый pre-paint скрипт в `<head>` ставит `<html data-mode="...">` и корректный
  `<meta name="theme-color">` ДО первого кадра — статус-бар iOS/Android красится в цвет режима
  без FOUC.
- Новый клиентский `ModeThemeSync` (смонтирован в `layout.tsx`) следит за событиями и синком
  между вкладками.

**Цветовые токены (`globals.css`):**
- Default `:root` = Маркет (синий `#00AAFF` + салатовый CTA `#87D32C`, как Авито 2026).
- `html[data-mode="barter"]` = оранжевый `#E85D26` / мягкий фон `#FFEFE6`.
- `html[data-mode="market"]` = синий Avito 2026 + салатовый CTA.
- Переменные: `--mode-primary`, `--mode-primary-hover`, `--mode-primary-soft`,
  `--mode-primary-ring`, `--mode-cta`, `--mode-cta-hover`, `--mode-msg-bubble`.

**CSS-фильтры:**
- `html[data-mode="barter"] [data-market-only="true"] { display: none !important; }` —
  скрывает в бартер-режиме категории «Недвижимость», «Работа», «Услуги», «Для бизнеса».
- `html[data-mode="barter"] [data-promo-badge="true"] { display: none !important; }` —
  прячет TOP/XL/VIP бейджи (в бартере продвижения нет).

**Точки применения:**
- `apps/web/src/app/page.tsx` — мобильная sticky-шапка, категории и fade-градиент — теперь на
  `var(--mode-primary)` вместо хардкодного `#00AAFF`. Категории с `marketOnly: true` помечены
  `data-market-only="true"`. Добавлена «Для бизнеса» в CATS_TOP (только для маркета).
- `apps/web/src/components/mobile-search-input.tsx` (новый клиент-компонент) — плейсхолдер
  меняется: `Бартер → «Что обмениваем?»`, `Маркет → «Что ищем?»` (как в Авито).
- `apps/web/src/components/listing-card.tsx` — промо-бейджи TOP/XL/VIP получили
  `data-promo-badge="true"`.
- `apps/web/src/app/messages/page.tsx` — список чатов: левая 3px-граница в цвете режима
  связанного объявления (`getChatMode(listing)` с fallback на `market` до Phase 13), мини-бейдж
  «Обмен»/«Продажа». Пузырь «моих» сообщений красится тем же цветом. Поправлена «кривость»:
  аватар пира `bg-primary` → `bg-muted` (было невидно текст), online-dot `bg-secondary/10`
  → `bg-success`.

**Верификация:**
- `npx tsc --noEmit` — clean (exit 0).
- Визуальная сверка на мобиле — за пользователем после деплоя.

## 2026-04-19 — Мобильный редизайн главной по Claude Design home.html

Получили handoff-бандл от Claude Design (`barter/` архив, распакован в `/sessions/.../design-bundle/`).
В нём: `README.md`, `chats/chat1.md`, `project/home.html`, `listing.html`, `icons.html`,
`shared.css`, `shared.js`, `assets/`, `fonts/`. Пользователь попросил внедрить элементы дизайна,
**кроме логотипа и категорий** — сохранить текущие (сине-голубая шапка с категориями на
полупрозрачных стеклянных карточках пользователю нравится больше).

**Что внедрено сейчас (mobile-only, `md:hidden`):**
- Sticky-шапка: пилл-поиск с иконкой фильтра внутри, **колокольчик уведомлений** (с точкой-бейджем),
  **сердце избранного** → /favorites. Поиск переименован в «Что обмениваем?».
- **Локация-чип** (MapPin + город + chevron) под поиском.
- **Mode toggle Бартер / Маркет** — новый клиентский `components/mobile-mode-toggle.tsx`
  (localStorage + `barter:mode-change` CustomEvent). Сейчас это UI-стаб — фильтрация по
  `isBarter` появится в Phase 13.
- **Hero-банер «Обмен без денег»** — оранжевый градиент, ссылка `/listings?mode=barter`,
  метка «скоро». Анонсирует раздел Phase 13.
- **Section header** «Свежие предложения · N объявлений · Город» (с корректным plural форматом
  через новый helper `pluralRu`).
- **Карточка** (`listing-card.tsx`): thumb теперь `aspect-square` по умолчанию (1:1,
  как в дизайне). Прошлая фиксированная высота 140px сохранена как опция через `thumbHeight`.
- **Bottom nav** пересобран (`components/mobile-bottom-nav.tsx`) по дизайну: Главная · Поиск
  (→ /listings) · **+Добавить (приподнятый FAB)** (→ /new) · Сообщения · Профиль. Избранное
  переехало в шапку.

**Что НЕ трогали (по запросу пользователя):**
- Логотип (текущий `/brand/logo_icon.svg`) — оставлен.
- Сине-голубая категорийная секция с glass-карточками — оставлена как есть.
- Десктопная версия — полностью нетронута.

**Phase 13 — «Бартер» раздел зафиксирован в PRODUCT_BACKLOG.md:**
13.1 `listing.isBarter`/`wantToExchange`/`exchangeSurcharge` в Prisma ·
13.2 API-фильтр `?mode=barter` ·
13.3 форма с «Без денег» toggle ·
13.4 функциональный mode toggle на главной ·
13.5 бейджи «Обмен» / «Обмен + N ₽» ·
13.6 «Хочу: X» подпись ·
13.7 кнопка «Хочу обменять» + модалка предложения ·
13.8 страница `/barter` ·
13.9 авто-матчинг по `wantToExchange` ·
13.10 чат-шаблон «Предлагаю обмен» ·
13.11 `/profile/barter-trades`.

Референсы лежат в `design-bundle/barter/` (вне репо). При старте Phase 13 — скопировать
нужные куски в `docs/design-system/barter/` как read-only reference.

**Верификация:**
- `npx tsc --noEmit` — clean.
- Визуальная сверка на мобиле — за пользователем после деплоя.

**Следующий шаг:**
Phase 4 — поиск + персонализация (продолжение по бэклогу), затем Phase 13 когда UI будет стабилен.

## 2026-04-18 — Hotfix #6: SSR-крэш главной (digest 1434632452) найден и починен

После Phase 3-деплоя главная на Vercel падала в error boundary «Что-то пошло не так» (`digest: 1434632452`). Пять предыдущих хотфиксов (defensive data fetching, `Promise.allSettled`, `force-dynamic`, нуклеарная главная, etc.) не помогали — данные грузились корректно, падал сам рендер.

**Путь диагностики:**
- `/build-check` → деплой доходит до Vercel.
- Nuclear `/` (полностью пустая главная) → рендерится чисто → layout/providers невиновны.
- Бисекция v1 (data-only панель) → `mergedFeed: 20`, API отвечает 24 объявления → пайплайн данных работает.
- Бисекция v2 (`?full=1&with=footer|header|cards|loadmore|all`) → cards/loadmore/all падают.
- Бисекция v3 (`?full=1&with=card-raw|card-card|card-tracked|card-hover|card-one`) → `card-one` (полный `ListingCardComponent`) падает, всё остальное рендерится.

**Корневая причина:**
`apps/web/src/components/listing-card.tsx` был server component и передавал `badges={<>…<button onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} />…</>}` в client-компонент `FeedListingHoverThumb`. React 19 / Next 16 запрещают передавать функции через server→client границу — отсюда digest `1434632452`.

**Три фикса:**
1. `apps/web/src/components/listing-card.tsx` — добавлен `'use client';` в самый верх файла (commit `f07332d`).
2. `apps/web/src/components/feed-load-more.tsx` — сломанный Tailwind класс `hover:shadow-[0_12px_40px_-20px_rgba(15,23,42,0.18)](0,0,0,0.35)]` → `hover:shadow-[0_12px_40px_-20px_rgba(15,23,42,0.18)]` (commit `7b4a569`).
3. Вычищена вся диагностика из `apps/web/src/app/page.tsx` (нуклеарные ветки, `BUILD_TAG`, бисекционные панели v1/v2/v3) и из `apps/web/src/app/error.tsx` (детали, digest, showDetails стейт). Cleanup-коммит в этом патче.

**Урок на будущее:**
Любой компонент, который рендерит `onClick`/`onChange`/`onSubmit`/`onKeyDown`/любой event-handler inline, обязан быть `'use client'`. Server component не имеет права передавать JSX с функцией в пропсах — даже если handler «невидимый» (вложен в `badges={<></>}`). Тихие крэши SSR с digest без текста — красный флаг именно на это.

**Верификация:**
- `npx tsc --noEmit` — clean.
- Пользователь подтвердил скриншотом `?full=1&with=all` — главная рендерится полностью.
- Осталось подтвердить: `https://web-one-blond-66.vercel.app/` без query-параметров.

## 2026-04-18 — Phase 3 завершён: бот поддержки + AI-ассистент + автоответы продавца

Полностью закрыли Phase 3 (3.1 → 3.5). Поддержка на сайте, быстрые ответы в чате, AI-подсказки по роли (продавец/покупатель), авто-ответ продавца на первое сообщение — всё на своих endpoint'ах без внешних LLM (rule-based для alpha).

**Сделано по задачам:**
- **3.1 Prisma + API** — миграция `20260418210000_support_templates_tickets/migration.sql`: enums `SupportTemplateCategory` (QUICK_REPLY_BUYER/SELLER, FAQ, SUPPORT_REPLY, AUTO_REPLY_SELLER) и `SupportTicketStatus`, модели `SupportTemplate` и `SupportTicket`, поля `User.sellerAutoReplyEnabled`/`sellerAutoReplyText`. Модуль `apps/api/src/support/` (`support.service.ts` ~340 строк, `support.controller.ts`, `dto.ts`, `support.module.ts`, shim `prisma-support.d.ts`). Seed 22 шаблона (6 покупательских quick-reply, 6 продавцовых, 7 FAQ, 2 SUPPORT_REPLY, 1 AUTO_REPLY_SELLER default) — idempotent upsert по `code` в `OnModuleInit`. Эндпоинты: `GET /support/templates?category=`, `GET /support/faq`, `GET /support/templates/:code`, `POST /support/tickets` (можно гостем), `GET /support/tickets/mine`, `POST /support/advise`, `GET /support/seller/auto-reply`, `PUT /support/seller/auto-reply`.
- **3.2 Web: quick-reply chips в чате** — в `apps/web/src/app/messages/page.tsx` добавлен горизонтальный ряд чипов над композером. Роль (buyer/seller) определяется через `ChatSummary.myRole` (добавлено в `chats.service.ts` по сравнению `listing.ownerId === userId`). Шаблоны грузятся один раз на монтирование. Клик — вставка текста в input + focus.
- **3.3 AI-ассистент** — `POST /support/advise`: rule-based keyword matching (торг/доставка/фото/когда/актуал/whatsapp+telegram) + роль-специфичные советы. В `/messages` показывается подсказка (плашка с лампочкой и кнопками-саджестами) при смене чата, + кнопка «Ещё» и «×» (скрыть). Ассистент активен только в выбранном чате, `setAdvise(null)` при смене.
- **3.4 Виджет поддержки** — `apps/web/src/components/support-widget.tsx` (floating FAB bottom-left). Вкладки: «Частые вопросы» (GET /support/faq, аккордеон) и «Написать нам» (форма POST /support/tickets с темой/сообщением/контактом, гостевой режим поддерживается). Смонтирован в `app/layout.tsx`, скрыт на `/messages` и `/auth`.
- **3.5 Автоответы продавца** — в `profile/settings/settings-content.tsx` внутри секции «Витрина продавца» новый блок: toggle «Включить автоответ» + textarea (до 1000 символов). GET/PUT `/support/seller/auto-reply`. Интеграция с чатом: `ChatsService.maybePostSellerAutoReply()` + `ChatsGateway.broadcastSellerAutoReply()` — срабатывает ровно один раз, когда buyer отправил 1-е сообщение, а seller ещё не отвечал. Сообщение помечается `isAutoReply: true` и рассылается в socket + REST.

**Архитектурные решения:**
- AI-ассистент — rule-based (KEYWORD_TO_CODES regex). Реальный LLM подключим в Phase 11 когда подключим биллинг/лимиты.
- Tickets поддерживают гостей (`userId` nullable) — виджет работает даже без логина.
- Seller auto-reply хранится в `User`, а не в отдельной таблице — чтобы проще отдавать через `/auth/me` в будущем.
- Добавлен next.js rewrite `/support/:path*` → `${apiUrl}/support/:path*` (раньше только для основных модулей).

**Верификация:**
- `apps/web`: `npx tsc --noEmit` — clean (исключая предсуществующую `next.config.ts(11,3)` про `eslint`).
- `apps/api`: `npx tsc --noEmit` — полностью clean.

**Следующий шаг:**
Phase 4 — attribute schemas для категорий (JSON-конфиг атрибутов + форма на web), улучшенная валидация формы размещения, подсказки по типовым полям.

## 2026-04-18 — Phase 2 завершён: монетизация (Wallet · Promotions · Barter Pro)

Полностью закрыли Phase 2 (2.1 → 2.7). Рубль-копейка модель денег, кошелёк, 14 пакетов продвижения (PERSONAL+BUSINESS), 3 плана Barter Pro (Старт/Профи/Бизнес), мгновенное списание/начисление и страница `/pricing` с интерактивной активацией.

**Сделано по задачам:**
- **2.1 Prisma** — `Wallet`, `WalletTransaction`, `PromotionPackage`, `ProPlan`, `UserProSubscription`; enum `PromotionType` расширен на `COLOR`, `LIFT`; новые enum `PromotionAudience`, `WalletTransactionType`, `WalletTransactionStatus`, `ProSubscriptionStatus`. SQL-миграция `20260418170000_wallet_promotions_pro/migration.sql` (написана вручную — Prisma engine недоступен в sandbox, на проде сгенерируется).
- **2.2 API wallet module** — `apps/api/src/wallet/` (`wallet.service.ts`, `wallet.controller.ts`, `dto.ts`, `wallet.module.ts`). Эндпоинты: `GET /wallet/balance`, `GET /wallet/transactions`, `POST /wallet/topup`, `POST /wallet/promote`, `POST /wallet/pro/subscribe`, `GET /wallet/pro/subscription`, `GET /wallet/packages?audience=`, `GET /wallet/pro-plans`. Все списания обёрнуты в `prisma.$transaction` для атомарности.
- **2.3 Seed** — `WalletService.ensureSeed()` по `OnModuleInit` upsert-ит 14 пакетов (7 PERSONAL + 7 BUSINESS) и 3 плана. Цены — ровно ½ от Avito (как обещано в README).
- **2.4 Web /wallet** — баланс, история операций (TOPUP/PROMOTION/PRO_SUBSCRIPTION/REFUND/BONUS/ADJUSTMENT), пресеты пополнения 100/300/500/1000/2000/5000 ₽, кастомная сумма, статус подписки.
- **2.5 Web «Продвинуть»** — `components/promote-dialog.tsx`. В кабинете (`profile-content.tsx`) одна кнопка вместо 3 inline-плиток. Диалог: выбор пакета (с метаданными типа/мульти/срок), баланс, ссылка на пополнение если не хватает, мгновенная активация и обновление списка.
- **2.6 Web /pricing** — `app/pricing/page.tsx`. Hero, табы PERSONAL/BUSINESS для пакетов, 3 плана Barter Pro карточками с «Рекомендуем»-бейджем, лоадинг-скелетоны, авто-определение текущей подписки и кнопка «Подключить»/«Продлить».
- **2.7 Barter Pro лимиты** — `assertActiveListingsLimit(ownerId)` в `listings.service.ts`. Без подписки — 5 активных объявлений; на тарифе — `plan.listingsLimit` (или `null` = без лимита). Ошибка `listing_active_limit` маппится на UX-сообщение в `app/new/page.tsx` со ссылкой на `/pricing`.

**Архитектурные решения:**
- Деньги хранятся как `Int` копейки (`balanceKopecks`, `priceKopecks`, `amountKopecks`). RUB вычисляется = kopecks/100. Никаких float.
- Транзакция = одна запись в `WalletTransaction` (даже PROMOTION), `balanceAfterKopecks` фиксирует состояние после операции — для корректной истории и аудита.
- `topup()` сейчас mock-instant credit (для разработки). Реальная интеграция с YooKassa/Stripe — отдельная задача Phase 12.
- Subscriptions используют `subscribePro` с продлением (если активна — `endsAt` сдвигается на +30 дней; иначе — новая запись).
- Shim-файл `apps/api/src/wallet/prisma-wallet.d.ts` дополняет `@prisma/client` новыми enum/делегатами для tsc — на проде после `prisma generate` он становится no-op merge.

**Верификация:**
- `apps/web`: `npx tsc --noEmit` — clean (только предсуществующая `next.config.ts(11,3)` про `eslint`).
- `apps/api`: `npx tsc --noEmit` — полностью clean.

**Следующий шаг:**
Phase 3 — каталог категорий по образцу Авито (~3000 узлов с attribute schemas), Phase 4 — улучшения формы размещения (атрибутные формы, валидация), Phase 5 — фильтры в поиске.

## 2026-04-18 — Phase 1 завершён: дизайн-рефакторинг на shadcn/ui + brand-токены

Полностью закрыли Phase 1 (1.1 → 1.6). Весь `apps/web/src/app/` и `apps/web/src/components/` переведены на семантические brand-токены CSS-переменных (из `@theme inline`). Legacy-палитра Tailwind (zinc/sky/cyan/slate/emerald/amber/violet/indigo/rose/teal/fuchsia/orange/red/pink) вычищена полностью вне базового `components/ui/`.

**Сделано по задачам:**
- **1.1 Шапка** — `site-header.tsx`, `mega-menu.tsx`, `site-footer.tsx`, `mobile-bottom-nav.tsx` на shadcn/ui примитивах, иконки lucide-react @strokeWidth 1.8, brand-токены.
- **1.2 Карточки ленты** — новый `components/listing-card.tsx` (shadcn `Card` + `Badge` + `Skeleton`), `feed-listing-hover-thumb`, `feed-load-more`, `home-*` виджеты, `listings-map` — на токенах.
- **1.3 Карточка объявления** — `app/listing/[id]/page.tsx`, `listing-gallery`, `listing-actions`, `listing-attributes-display`, `listing-bot-assistant`, `listing-mini-map`, `listing-placeholder`, `show-phone-button`, `seller-review-form`, `seller-presence-badge`, `listing/[id]/loading.tsx`.
- **1.4 Формы** — `app/auth/page.tsx` (Card + Input + Button), `app/new/page.tsx` полностью переписана (~700 строк: шаги-индикатор, фото-дропзона, описание, атрибуты, сайдбар с авторизацией и публикацией), `app/profile/settings/settings-content.tsx` (тогглы/пилюли на brand-токенах), `listing-category-attributes-form.tsx`, `search-input-with-suggestions.tsx`, `ui-select.tsx`.
- **1.5 Кабинет продавца** — `app/seller/[id]/page.tsx`, `app/profile/page.tsx`, `profile-content.tsx` (1177 строк, 408 рефов палитры), `profile/listings`, `profile/orders`, `profile/reviews`, `profile-sidebar`, `profile-menu-header`, `profile-archived-section`, `favorite-toggle`.
- **1.6 Чат/сообщения** — `app/messages/page.tsx` (772 строки), `messages/layout.tsx`, `home-chat-widget.tsx`.

**Скрипт миграции:** `scripts/migrate_brand_tokens.py`
- Убирает `dark:`-варианты из кастомного слоя (CSS-переменные уже переключают тему через `@theme inline`).
- Сворачивает `bg-gradient-to-r from-sky-500 to-cyan-500` → `bg-primary`.
- Мапит zinc/slate → muted/foreground/border, sky/cyan → primary, red → destructive, emerald → secondary, amber → accent, violet/indigo/fuchsia → accent.
- Нормализует whitespace внутри `className="..."` и `className={\`...\`}`.
- Фикс регулярок: для `hover:from-/to-/via-` используется ограниченный класс символов `[A-Za-z0-9_:/\[\]\-.#]+` вместо `\S+` — иначе ест закрывающую кавычку `"` у JSX-атрибута.

**Верификация:**
- `npx tsc --noEmit` — clean (остаётся только предсуществующая ошибка `next.config.ts(11,3): TS2353` про `eslint` — не от правок).
- Финальный аудит: `grep` не находит ни одного `zinc|sky|cyan|slate|emerald|amber|violet|indigo|rose|teal|fuchsia|orange|red|pink-[0-9]` в `apps/web/src/app/` и `apps/web/src/components/` (вне `components/ui/`).
- Визуальная сверка в браузере — за юзером после деплоя на Vercel.

**Что не трогал:**
- `apps/web/src/components/ui/*` — shadcn-шаблоны, legacy `dark:`-варианты здесь ожидаемы и корректны (часть base-ui стиля).
- API, Prisma, миграции — за пределами Phase 1.

## 2026-04-18 — Внедрён handoff-бандл Claude Design (фундамент)

Применён Phase 0.5 — фундаментальный слой из Claude Design handoff bundle (`docs/design-system/`).

**Сделано:**
- `docs/design-system/` — весь handoff-бандл (README, чаты, preview HTML, UI kit, assets, fonts) как read-only референс для всех будущих фаз
- `apps/web/src/fonts/golos/` — 6 TTF-файлов Golos Text (Regular 400 → Black 900) от Paratype
- `apps/web/src/app/layout.tsx` — шрифт переключён с Inter (Google) на Golos Text через `next/font/local` (переменная `--font-sans`, `display: swap`, preload, latin+cyrillic встроены в TTF)
- `apps/web/src/app/globals.css` — полная замена дизайн-токенов на Avito-matched pixel-for-pixel палитру 2026:
  - **Primary:** `#00AAFF` (hover `#0095E0`, soft `#E6F7FF`) — единый CTA/link/pill
  - **Secondary:** `#009F44` (green — "Показать телефон")
  - **Accent:** `#FF6D00` (orange — ТОП/промо)
  - **Нейтрали:** page `#FFFFFF`, muted `#F2F1F0`, fg `#2F2F2F`/`#000000`/`#757575`/`#A3A3A3`
  - **Radii/shadows/spacing** — в точности как в `docs/design-system/project/colors_and_type.css`
  - Back-compat алиасы `--color-primary`, `--color-text*` оставлены, чтобы существующие компоненты не сломались
  - Dark-theme блок обновлён (`#4DA6FF` primary, тёмные нейтрали `#0B1020`/`#0F172A`/`#1E293B`)
- Решение по конфликту `#00677D` vs `#007AFF` vs `#00AAFF` — **принят `#00AAFF`** (Avito)
- Проверка: `tsc --noEmit` проходит (единственная ошибка `next.config.ts` про `eslint` — предсуществующая, не от правок)

**Что НЕ трогал** (отложено до задачи 1.1+ по бэклогу):
- `site-header.tsx`, `mega-menu.tsx`, `site-footer.tsx`, `mobile-bottom-nav.tsx` — перекрасятся автоматически через CSS-переменные, пересборка раскладки — отдельные задачи
- `ui/button.tsx`, `ui/input.tsx` и остальные shadcn — те же токены подхватятся через `--brand-*` и `--color-*`
- Логотипы в `public/brand/` — содержимое handoff идентично (только self-closing whitespace diff), не перезаписывал

**Где искать гайд** при работе над 1.1 и далее:
- `docs/design-system/README.md` — Content & Visual Foundations, правила воркфлоу
- `docs/design-system/project/README.md` — подробный brand brief
- `docs/design-system/project/SKILL.md` — skills-совместимый entry point
- `docs/design-system/project/ui_kits/web/` — React-референс (Header/ListingCard/Categories/Pages)
- `docs/design-system/project/preview/*.html` — эталонные карточки компонентов



## Стек
- **Web:** Next.js 16 + React 19 + Tailwind 4 + **shadcn/ui** (порт 3000)
- **API:** NestJS 11 + Prisma 6 + PostgreSQL (порт 3001)
- **Search:** Meilisearch v1.11 (fallback Prisma)
- **Realtime:** Socket.IO
- **Карта:** Яндекс.Карты JS API 2.1
- **Auth:** JWT в localStorage + Bearer + AuthProvider context
- **Дизайн-система:** shadcn/ui (18 компонентов в `src/components/ui/`)

## Как запустить
```
npm run dev          # web + api
npm run dev:api      # API (3001)
npm run dev:web      # Web (3000)
```

## GitHub
- **Репо:** `vraachmax/barter-marketplace`, ветка `master`
- **Последний коммит:** `2b6be94` (force push 2026-04-12)
- **Vercel:** `web-one-blond-66.vercel.app`

## Ключевые документы
- `FULL_AVITO_SPEC.md` — ПОЛНАЯ спецификация всего функционала (тарифы, сервисы, каталоги, геймификация)
- `PRODUCT_BACKLOG.md` — 12 фаз с задачами, строго по порядку
- `.cursor/rules/pricing.mdc` — тарифы Barter (физлица / бизнес / Pro)
- `.cursor/rules/design-system.mdc` — правила shadcn/ui
- `.cursor/rules/execution-order.mdc` — строгий порядок: читать контекст → работать по backlog → обновлять docs
- `.cursor/rules/smart-search-reco.mdc` — алгоритмы персонализации

## Последний завершённый шаг (2026-04-12)

### Мобильный редизайн в стиле Avito
Полный редизайн мобильной версии. **Только мобилка (`md:hidden`)**, десктоп не трогали.

**Файлы — ЗАПУШЕНЫ на GitHub (коммит `2b6be94`):**

1. **`apps/web/src/components/mobile-bottom-nav.tsx`** ✅ PUSHED
   - "Объявления" href: `/profile?tab=ACTIVE` → `/profile/listings`
   - Кастомные `match` функции для каждого NavItem

2. **`apps/web/src/app/profile/listings/page.tsx`** ✅ PUSHED (НОВЫЙ файл)
   - Отдельный роут для мобильной страницы объявлений

3. **`TASKS.md`** ✅ PUSHED
   - Трекинг задач

**Файлы — ЗАПУШЕНЫ (коммит `0fd1c1b`, 2026-04-12):**

4. **`apps/web/src/app/profile/settings/settings-content.tsx`** ✅ PUSHED
   - Полный Avito-style мобильный редизайн настроек
   - Секции: Аккаунт (аватар-карточка + смена пароля), Уведомления (Push/Email/SMS тогглы с `bg-[#0088FF]`), Приватность (видимость телефона/email), Приложение (тёмная тема, RU/EN языковые пилюли), Danger zone (красная кнопка удаления)
   - Фиксированная кнопка "Сохранить" на `bottom-16` с градиентом

5. **`apps/web/src/app/profile/profile-content.tsx`** ✅ PUSHED
   - Добавлен `usePathname` import
   - Обновлена логика `showListingsView`: `currentPathname === '/profile/listings'`
   - Ссылка "Мои объявления" → `/profile/listings`
   - Модалка кошелька: `showTopUp`, `topUpAmount` state, пресеты `[100, 300, 500, 1000, 2000, 5000]`

### Git Push
- GitHub токен (classic) создан с полным доступом
- Пуш через терминал пользователя (sandbox не имеет сетевого доступа к GitHub)
6. Закоммитить через UI автоматизацию

### Дизайн-токены (мобильная версия)
- Иконки: `text-[#0088FF]`
- Текст: `text-[#1a1a1a]`
- Карточки: `rounded-2xl bg-white p-4`
- Кнопки-градиент: `from-[#0088FF] to-[#0066DD]`

### Предыдущие сессии
- Полный редизайн главной страницы (page.tsx) — Avito-style категории, карточки, VIP-лента
- Фикс мобильных переполнений текста
- Деплой на Vercel работает
- Установлен awesome-design-md (54 файла дизайн-референсов)

## Что делать дальше
1. **⚠️ ЗАПУШИТЬ 2 файла** — settings-content.tsx и profile-content.tsx (через Chrome MCP, метод выше)
2. **Проверить Vercel билд** — после пуша убедиться что `web-one-blond-66.vercel.app` работает
3. **Phase 1, задача 1.1** — Переделать шапку на shadcn/ui (DropdownMenu, Button, Command)
4. **Далее Phase 1** — карточки ленты (1.2), карточка объявления (1.3), формы (1.4), кабинет (1.5), чат (1.6)
5. shadcn/ui компоненты: `src/components/ui/` (Button, Card, DropdownMenu, Command и др.)
6. Главная страница: `apps/web/src/app/page.tsx` (~673 строк)

## Важно
- **Мобильная версия** — фокус на мобилке, десктоп пока не трогаем
- **Git через sandbox** не работает (коррапт `.git/index`), пушить только из терминала юзера
- **Force push** был необходим из-за рассинхрона коммитов (remote 68 vs local 10)
