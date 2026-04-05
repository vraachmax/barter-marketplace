# Быстрый старт (локально)

## 1. Запуск сайта

Из **корня** проекта одной командой поднимаются **веб (3000)** и **API (3001)**:

```bash
npm run dev
```

То же самое: `npm run dev:all`.

Только фронт (если API уже запущен отдельно):

```bash
npm run dev:web
```

Только API:

```bash
npm run dev:api
```

Сайт: **http://127.0.0.1:3000** (лучше не `localhost` на Windows — см. `apps/web/src/lib/api.ts`).

## 2. База и поиск без костылей

Из **корня** репозитория:

```bash
docker compose up -d
```

Поднимутся **Postgres** и **Meilisearch**. Шаблон переменных API:

```bash
cp apps/api/.env.example apps/api/.env
```

При необходимости поправьте `DATABASE_URL` под свой пароль/хост. Для полнотекстового поиска и подсказок нужны **`MEILISEARCH_HOST=http://127.0.0.1:7700`** и запущенный контейнер `meilisearch`.

Один раз миграции:

```bash
cd apps/api && npx prisma migrate deploy
```

Если Meilisearch не запущен, **API и сайт всё равно работают** — поиск временно через БД; при появлении Meili подключение восстанавливается в фоне.

Подробнее: `apps/api/docs/MEILISEARCH.md`.
