# Barter — marketplace обмена и продажи

## Что это

Mobile-first площадка, где объявление создаётся меньше чем за 2 минуты,
а система помогает найти взаимовыгодный обмен и безопасно довести его до сделки.
Продажа остаётся полноценным сценарием, но обмен — главное отличие продукта.

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
- `docs/PRODUCT_VISION.md` — цель, метрики и актуальный порядок развития
- `PRODUCT_BACKLOG.md` — подробный реестр функций (не задаёт приоритет сам по себе)
- `FULL_AVITO_SPEC.md` — полная спецификация функционала
- `.cursor/rules/` — правила UI, архитектуры, поиска, тарифов

## Правила работы

1. **Контекст**: в начале сессии читать `docs/PRODUCT_VISION.md` и верхнюю актуальную запись `HANDOFF.md`
2. **Приоритет**: стабильность → barter core → доверие → UX/поиск → рост
3. **UI**: shadcn/ui компоненты, sky→cyan градиенты, dark mode обязателен
4. **Код**: TypeScript strict, no `any`, Tailwind only, server components по умолчанию
5. **После задачи**: обновить HANDOFF.md и PRODUCT_BACKLOG.md
6. **Продакшен**: никаких dev-endpoint, тестовых денег и fallback-секретов

## API Modules

auth, categories, listings (ranking, geo, promotions), search (meilisearch), favorites, chats (socket.io), reviews, users, analytics, presence

## Web Routes

`/` `/auth` `/new` `/listing/[id]` `/seller/[id]` `/favorites` `/messages` `/profile` `/profile/settings` `/profile/reviews` `/profile/orders` `/map`

## Текущий статус

Alpha, Phase 0 — стабилизация продакшна. PostgreSQL и API восстановлены 2026-09-03.
Следом: закрыть критические риски и начать barter core.
