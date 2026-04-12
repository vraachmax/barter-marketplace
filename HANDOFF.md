# Barter Clone — Handoff Context

## Статус: ALPHA | Текущая фаза: Phase 1 (Дизайн-рефакторинг на shadcn/ui)
## Следующая задача: 1.1 — Переделать шапку сайта на shadcn/ui

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
