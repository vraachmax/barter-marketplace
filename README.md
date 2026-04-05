# Barter clone

## Запуск локально

Из корня репозитория:

```bash
npm install
npm run dev
```

Поднимутся **Next.js** (http://127.0.0.1:3000) и **Nest API** (порт 3001).

Если порты заняты или Next ругается на lock — **`npm run dev:restart`** (освобождает 3000–3002 и перезапускает).

Нужны **PostgreSQL** и **Meilisearch** для полноценного поиска — проще всего `docker compose up -d` из корня. Пример переменных: [apps/api/.env.example](./apps/api/.env.example). Подробнее: [QUICKSTART.md](./QUICKSTART.md), поиск: [apps/api/docs/MEILISEARCH.md](./apps/api/docs/MEILISEARCH.md).

- Только фронт: `npm run dev:web`
- Только API: `npm run dev:api`
