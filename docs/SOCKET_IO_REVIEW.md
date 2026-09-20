# UI-02: Socket.IO-приёмка в изоляции

Дата: 2026-09-20. Draft PR #29. Ветка: test/socket-conversation-acceptance.
Не опубликовано, не сливать до отдельного решения по выпуску.

## Что проверяется

Настоящий Nest ChatsGateway, Socket.IO server/client, JwtService, PresenceService,
ChatsController/ChatsService и PostgreSQL 16 после полной цепочки миграций.
Три тестовых пользователя: два участника чата и посторонний.
WebSocket аутентифицируется подписанным cookie JWT; HTTP guard заменён фикстурой.
Bot provisioning отключён в тесте, analytics/storage подменены; listing отсутствует.
Реальных пользователей, сообщений и внешнего media storage тест не затрагивает.
DB guard разрешает только 127.0.0.1/barter_message_ci.

Семь групп:

1. Подключение двух участников и вступление в комнату.
2. Отклонение отсутствующего, неверного, просроченного, повреждённого cookie JWT,
   а также подписанного JWT без корректного sub. В production-коде ветки добавлена
   проверка типа/непустого значения sub до изменения presence.
3. Посторонний не может вступить, отправить, печатать или отметить чат прочитанным.
4. HTTP POST доставляется сокетом; повтор с тем же clientMessageId не
   создаёт новую запись и не вызывает повторный emit.
5. Typing и read receipt доходят до участника, lastReadAt и isReadByPeer
   подтверждаются настоящей PostgreSQL/HTTP-историей.
6. Legacy socket send-message сохраняется и доставляется.
7. Явный disconnect/connect, повторный join, получение пропущенного сообщения
   из HTTP-истории и новая доставка; посторонний не получает события чата.

## Границы

Тест проверяет серверный путь, но не автоматическое переподключение UI.
WebSocket cookie передаётся Node-клиентом; браузерные SameSite/CORS/third-party
cookie и настоящие сессии аккаунтов этим не подтверждаются.
Для отсутствия повторного события есть ограниченное окно наблюдения 150ms;
уникальность записи отдельно проверяется в PostgreSQL.
Вложения, durable outbox, multi-instance presence, iPhone/клавиатура и production
health остаются открытыми. Legacy socket send-message пока без ключа повтора.
Отказы доступа дают текущий exception-event; формат ошибок отдельно не менялся.
Логи Nest при намеренно запрещённых действиях ожидаемы и не являются успешным
доступом. Удаляются только идентификаторы фикстур, созданных текущим тестом.

## Результаты

Проверенный код: `97e0d2a884c101c2e260ce93de6ebc341ecc0cfa`.
CI: https://github.com/vraachmax/barter-marketplace/actions/runs/35502348765
Полная цепочка миграций PostgreSQL 16, Prisma generate, production build API,
6/6 HTTP/PostgreSQL и 7/7 Socket.IO групп успешны.
Dependency security audit 35502349158: success.
Web browser suite и lint в этом блоке не запускались, frontend не менялся.

Первый прогон остановился на ECONNRESET прежнего конкурентного HTTP-теста.
Listener теперь явно открыт на время всей suite. Финальная проверка прошла.
