# Barter — Замена Авито

## Что это
Полномасштабная замена Авито. Размещение бесплатно, промо в 2 раза дешевле. Название: **Бартер**.

## Стек
- **Monorepo** (npm workspaces): `apps/api` + `apps/web`
- **API**: NestJS 11, Prisma 6, PostgreSQL 16, Meilisearch v1.11, Socket.IO (порт 3001)
- **Web**: Next.js 16, React 19, Tailwind 4, shadcn/ui, lucide-react (порт 3000)
- **Auth**: JWT в cookie + Bearer, 30d expiry
- **Infra**: docker-compose (postgres + meilisearch)

## Запуск
```bash
npm run dev          # web (3000) + api (3001)
docker compose up -d # postgres + meilisearch
```
Сайт: http://127.0.0.1:3000

## Ключевые документы
- `HANDOFF.md` — текущий статус, последний шаг
- `PRODUCT_BACKLOG.md` — 12 фаз задач (строго по порядку)
- `FULL_AVITO_SPEC.md` — полная спецификация функционала
- `.cursor/rules/` — правила UI, архитектуры, поиска, тарифов

## Правила работы
1. **Контекст**: в начале сессии читать HANDOFF.md + PRODUCT_BACKLOG.md
2. **Порядок фаз**: строго 1→2→...→12, не перескакивать
3. **UI**: shadcn/ui компоненты, sky→cyan градиенты, dark mode обязателен
4. **Код**: TypeScript strict, no `any`, Tailwind only, server components по умолчанию
5. **После задачи**: обновить HANDOFF.md и PRODUCT_BACKLOG.md
6. **Git**: коммиты только по запросу

## API Modules
auth, categories, listings (ranking, geo, promotions), search (meilisearch), favorites, chats (socket.io), reviews, users, analytics, presence

## Web Routes
`/` `/auth` `/new` `/listing/[id]` `/seller/[id]` `/favorites` `/messages` `/profile` `/profile/settings` `/profile/reviews` `/profile/orders` `/map`

## Текущий статус
Alpha, Phase 1 — Дизайн-рефакторинг на shadcn/ui. Следующая задача: 1.1 (шапка).
