# UI-02: идемпотентность текстовых сообщений

Дата: 2026-09-19. PR #28: https://github.com/vraachmax/barter-marketplace/pull/28

## Контракт

POST /chats/:chatId/messages принимает необязательный clientMessageId (UUID v4).
Старые клиенты без ключа сохраняют прежнее поведение, каждая отправка новая.
Ключ изолирован по chatId и userId авторизованного участника.
Одинаковый ключ и текст возвращают исходное сообщение; другой текст с этим ключом
даёт 409 message_key_reused. Пустой/null/некорректный ключ не отключает защиту,
а даёт 400. Ключ нечувствителен к регистру UUID.

Идентификатор Message.id = msg_v1_ + SHA-256(JSON([chatId,userId,UUID])).
Используется существующий TEXT primary key, миграций и новых таблиц нет.
Перед чтением сохранённого результата проверяется участие в чате.
При гонке одна транзакция выигрывает, другая получает P2002 и после rollback
читает исходную запись. Повтор не меняет updatedAt/lastReadAt и не повторяет
analytics, WebSocket emit, автоответ продавца или помощника.
Новая запись явно обновляет updatedAt чата.

Клиент держит ключ попытки по чату и тексту до подтверждения.
После неоднозначной ошибки и переключения чатов повтор использует прежний ключ.
После подтверждения или изменения отправляемого текста создаётся новый UUID.
Черновики и ключи хранятся в памяти страницы; после reload этот контекст теряется.

## Проверки

Изолированная PostgreSQL 16 в GitHub Actions, полная существующая цепочка миграций,
Prisma generate, production build API и HTTP через Nest controller/ValidationPipe.
Auth guard заменён тестовым пользователем, проверка участия выполняется настоящим
ChatsService и БД. Socket.IO/analytics/автоответы заменены счётчиками вызовов.

Проверяются потерянное подтверждение, 20 одновременных повторов, один ряд и один
набор побочных вызовов, неизменность времён при повторе, конфликт тела, границы
пользователя/чата, запрет постороннему, валидация UUID/текста, одинаковый текст
с новым ключом и старый контракт без ключа.

Browser suite дополнена сценарием: серверная фикстура сохранила сообщение, но
ответила 503; после смены чата повтор использует тот же ключ и не создаёт дубль.
Новая отправка такого же текста получает новый ключ и создаёт новое сообщение.

## Ограничения

Гарантия относится к текстовому HTTP POST с ключом. Вложения и legacy Socket.IO
send-message пока без идемпотентности. Доставка события не является durable outbox:
при падении процесса после commit уведомление может не уйти, историю надо обновить.
Физический iPhone, реальные аккаунты и доставка между ними не проверены.
Никаких реальных сообщений ради QA не создавали. Полная UI-02 остаётся открытой.

## Результат выпуска

Проверенный head: `1b2912d0472a2ceef265f99c41c7f240c10fa56b`.
Merge commit PR #28: `f681ed936fd0bbe947bb1593c373a2d15261103f`.
API/PostgreSQL CI: https://github.com/vraachmax/barter-marketplace/actions/runs/35476995870
Полная цепочка миграций, Prisma generate, build API и 6 групп HTTP/PostgreSQL
проверок прошли, включая 20 одновременных повторов.
Web CI: https://github.com/vraachmax/barter-marketplace/actions/runs/35476995977
69/69 web tests, build/TypeScript, 6/6 account, 8/8 layout и 6/6 messages
browser runs успешны. Messages suite теперь содержит 7 групп сценариев.
Dependency security audit 35476996336: success.
Artifacts (14 дней): messages-browser-evidence 10593464956,
account-browser-evidence 10595185215, listings-layout-evidence 10595220166.

Vercel frontend: success, «Deployment has completed».
Деплой: https://vercel.com/vraachmaxs-projects/web/3pATt82x43cz9VryTo6maeb99t2U
Это подтверждение frontend, не production API в Render.

Production API пока не подтверждён: Render требует подтверждения рабочей области My Workspace.
