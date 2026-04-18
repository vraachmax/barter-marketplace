# Barter Clone — Handoff Context

## Статус: ALPHA | Текущая фаза: Phase 3 ✅ · Hotfix #6 ✅ · Mobile Redesign v1 ✅ (2026-04-19)
## Следующая задача: Phase 4 — поиск + персонализация. Phase 13 — раздел «Бартер» (USP, запланирован)

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
