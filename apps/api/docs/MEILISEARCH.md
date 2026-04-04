# Полнотекстовый поиск (Meilisearch)

## Надёжность: API и сайт не падают

- **Nest всегда стартует**, даже если Meilisearch выключен или временно недоступен.
- Поиск с `q` при недоступном Meili **автоматически идёт через Prisma** (без 500 из-за поиска).
- Если задан `MEILISEARCH_HOST`, но при старте Meili не отвечает, сервис **периодически повторяет** подключение (по умолчанию раз в **45 с**, переменная `MEILISEARCH_RECONNECT_MS`).
- После сетевой ошибки во время поиска Meili на время отключается и снова **подключается в фоне**; пока связи нет — снова Prisma.

Исправлен баг bootstrap: пустой индекс при первом успешном контакте с Meili **корректно заполняется** (раньше `reindexIfEmpty` не выполнялся до выставления `meiliReady`).

---

## Быстрый старт (локально)

```bash
docker compose up -d   # из корня репозитория: Postgres + Meilisearch
```

`apps/api/.env`:

```env
MEILISEARCH_HOST=http://127.0.0.1:7700
```

Опционально:

```env
MEILISEARCH_RECONNECT_MS=30000
```

---

## Переменные

| Переменная | Назначение |
|------------|------------|
| `MEILISEARCH_HOST` | URL Meilisearch. Без неё Meili не используется. |
| `MEILISEARCH_API_KEY` | Master key, если включён на сервере. |
| `MEILISEARCH_RECONNECT_MS` | Интервал повторных попыток подключения (мс), минимум 15000. |

## HTTP

- `GET /search/suggestions?q=...` — подсказки (пустой массив при недоступном Meili).
- `GET /search/status` — `{ "meilisearch": true|false }`.

## Синонимы

`src/search/search-synonyms.ts` — после правок перезапустите API.
