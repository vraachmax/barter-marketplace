# Barter Clone — Handoff Context

## Статус: ALPHA | Текущая фаза: Phase 1 ✅ ЗАВЕРШЕНО (2026-04-18)
## Следующая задача: Phase 2.1 — Prisma: модели `Wallet`, `Transaction`, `PromotionPackage` (монетизация)

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
