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

## Ключевые документы
- `FULL_AVITO_SPEC.md` — ПОЛНАЯ спецификация всего функционала (тарифы, сервисы, каталоги, геймификация)
- `PRODUCT_BACKLOG.md` — 12 фаз с задачами, строго по порядку
- `.cursor/rules/pricing.mdc` — тарифы Barter (физлица / бизнес / Pro)
- `.cursor/rules/design-system.mdc` — правила shadcn/ui
- `.cursor/rules/execution-order.mdc` — строгий порядок: читать контекст → работать по backlog → обновлять docs
- `.cursor/rules/smart-search-reco.mdc` — алгоритмы персонализации

## Последний завершённый шаг
- Web: иконки только **lucide-react**; удалены Solar (`solar-icon.tsx`, `solar-icons.ts`, subset JSON, скрипт `icons:subset`). Чат-виджет: ChevronUp/Down; `page.tsx`: алиас `Home as HomeIcon` (конфликт с `export default function Home`).
- Создан FULL_AVITO_SPEC.md с полным функционалом Авито + цены Barter
- Подключен shadcn/ui (18 компонентов)
- Обновлен PRODUCT_BACKLOG.md (12 фаз)
- Созданы правила: pricing.mdc, design-system.mdc

## Что делать дальше
Открой `PRODUCT_BACKLOG.md` → Phase 1 → задача 1.1 (шапка на shadcn/ui).
shadcn/ui компоненты: `src/components/ui/` (Button, Card, DropdownMenu, Command и др.)
Главная страница: `apps/web/src/app/page.tsx` (~1100 строк)
