Warning: truncated output (original token count: 78801)
Total output lines: 3530

## 2026-10-21: Telegram-style voice controls; production access blocked

PR82 merged as 9c181972363a5ab5571ee68b098217c8074d8595. Production release
is still blocked: Vercel explicitly rejects team_1C2wMLOvWO21CLlqN7v7D0iZ
(vraachmaxs-projects) with 403. The connection needs its team access regranted.
Do not bypass this scope denial or claim PR82 deployed. Last verified release is PR81.

Voice follow-up on feat/telegram-voice-controls adds 1x/1.5x/2x playback,
single active recording, unmount pause, and ignores expected play interruption.
Existing decoded waveform, seeking and codec fallback remain. Browser acceptance
now exercises actual playback rate, switching between two recordings and seeking.
Local syntax/diff checks pass; CI and physical iPhone acceptance pending.

Transcription is feasible through a server-side speech-to-text provider, but is not
implemented or enabled. No working provider integration was found in API source.
Required before shipping: server-only credentials, member-authorized message lookup,
trusted stored audio (no arbitrary URL fetching), limits, cached transcript, and a
clear user action before sending private voice content to the provider. Never add
an inactive transcription button or expose provider credentials to the browser.
Reference: https://developers.openai.com/api/docs/guides/speech-to-text

Next: restore Vercel connection access and release the already-checked PR82 first;
merge the voice follow-up only after its CI passes. PR80 remains untouched.

## 2026-10-21: PR82 reference follow-up ready for release

Application commit 83adcb5a45d91e409d7d29ad9b220f98adc593b8 passed Web quality
39582404251 (build, regression, account/catalog/messages and four exchange scenarios)
and dependency audit 39582404794. Final screenshots from artifact 12339335463 were
opened and compared side by side with normalized source images. The final documentation
commit does not change application code. Release through PR82 is authorized by Maxim.

Implemented: two-action pending offer, explicit discussion/acceptance/counteroffer,
compact exchange header/listing and pale-orange outgoing exchange messages, tighter
contact layout, actual-recording waveform/play/pause/seek with fallback. Ordinary
sale-chat styling is preserved. Reservation and confirmation backend is unchanged.
PR81 is already deployed; two labelled demo listings and pending test dialogue exist.
Live API verified accept/reserve, cancel/release, images and saved mute/unmute.
Test access was supplied privately in barter-test-access.txt, never committed.

Limits: screenshots use isolated fixture data; cloud browser verified the public test
listing, but authenticated cloud UI and physical iPhone recording/PWA remain unverified.
Do not claim literal pixel identity: 44px actions, expiry disclosure, real data and
missing phone/avatar availability are intentional runtime differences. See design-qa.md.
Next: merge PR82 and verify production READY; then physical iPhone acceptance.

## 2026-10-21: chat release verified; reference fidelity follow-up

PR #81 merged as 3b742ae; Vercel production READY and Render API LIVE on the
same commit. Native PostgreSQL and all four CI workflows passed. The two labelled
test listings and dialogue were created through the public API. Live acceptance
verified both photos, accept/reserve, cancel/release and persisted mute/unmute;
a fresh pending offer remains for testing. No secrets are committed.

Current follow-up: reference-style two-action offer card with an explicit discussion
review, single-item labels, tighter contact layout and a custom voice player whose
waveform is decoded from the actual recording. Production build passes; full repo
lint has pre-existing errors, no reported errors in the new audio/exchange components.
Visual and browser acceptance for this follow-up are pending, not claimed complete.
Next: inspect CI screenshots against reference, resolve drift, release only after checks.
Physical iPhone recording/PWA and authenticated cloud-browser checks remain unverified.

## 2026-10-21: PR #81 authorized; PostgreSQL passed, browser follow-up

Maxim explicitly authorized public publication, CI, release after successful checks,
and test listings. PR #81 is open; production is still unchanged at this checkpoint.
Native PostgreSQL 16 migration rehearsal and exchange/message acceptance passed.
OSV found existing dev-only follow-redirects 1.16.0 advisories; lockfile updated to
1.16.1 and security CI passed. Demo seed now uses the existing Electronics root
when phone/laptop subcategories are absent. Browser follow-up synchronizes stale
61/80/36 px assertions with the already-published approved 76/82/42 px layout and
checks the shared send/record action. No visual layout assertions are removed.
Next: finish PR browser CI, merge, verify Render/Vercel release and live test accounts.
Physical iPhone microphone/PWA acceptance remains unverified.

## 2026-10-21: chat exchanges implemented locally; public push blocked

Branch `feat/chat-exchange-2026-10-20`, base ea6b68c. Direct exchange lifecycle,
contact details, voice recording, image-backed test seed, return-to-chat creation,
and completed-exchange reviews implemented. Details and reference mapping:
`docs/design/barter-2026-10/CHAT_EXCHANGE_IMPLEMENTATION.md`.
API/web builds, 193 API + 94 web tests, four Chromium UI scenarios and PGlite
migration/service smoke passed. Native PostgreSQL race/full-chain CI, WebKit,
physical iPhone and live two-account acceptance remain required before release.
Test listings are prepared, NOT created on production. Production unchanged.
Automatic approval review denied public GitHub push for missing explicit public
publication authorization. Do not retry via another transport; obtain user approval.
Next: after authorization, push this branch, open PR, run native PostgreSQL and
browser CI, inspect evidence, then release and run the explicit test-data seed.

## 2026-10-19: premium image binaries CONFIRMED in PR #79

**Authoritative latest status (supersedes older historical notes below):** 4 distinct premium hero WebP, 16 individual premium category WebP and manifest are committed to `apps/web/public/visual-refresh/premium/` on branch `assets/premium-hero-category-handoff-2026-10-19` in asset commit `c4a82d8eb67afa14fd6b3c5b6f7559df4c21216c`. GitHub readback verified 4 hero files, 16 category files and the manifest. Each binary Git blob SHA was matched against its source, without base64 assets in runtime JS or CSS. Hero/carousel and category components already point at the new paths. PR #79 is DRAFT, not merged; production remains unchanged. CI/visual review and real iPhone/PWA acceptance are separate release gates. Next: review latest GitHub Web quality CI, open resulting light/dark 393×850 and 430×932 screenshots, resolve any regressions, and only then seek explicit release approval. Source PNGs stay in the separately supplied ZIP; browser uses optimized WebP.

## 2026-10-19: premium visuals integrated in GitHub branch (production pending)

**Current authoritative state:** branch \`assets/premium-hero-category-handoff-2026-10-19\` now contains 4 actual premium hero WebP, 16 separate circular category WebP and exact \`apps/web/public/visual-refresh/premium/manifest.json\`, with Git blob and checksum readback. React and CSS changed: live text/CTA, distinct images, smooth fade, orange pagination dots and premium art for real API-backed categories. Browser checks extended to 393×850/430×932 in light/dark. **Do not interpret this as tested, merged or deployed.** Next: create PR; CI/build and browser verification; visual comparison/iPhone PWA; only then merge and confirm Vercel production READY.

## 2026-10-19: historical handoff entry (superseded by verified status above)

Maxim supplied five high-resolution original images: four no-text hero compositions and one 4×4 category icon sheet. A portable source+optimized ZIP (`barter-premium-assets-source-and-optimized-2026-10-19.zip`) was prepared in the ChatGPT conversation, containing 4 banner WebPs, 16 individual category WebPs, originals, manifest and prep script. The repository now contains `scripts/prepare-premium-assets.py` and full instructions at `docs/design/barter-2026-10/PREMIUM_ASSETS_HANDOFF_2026-10-19.md` on branch `assets/premium-hero-category-handoff-2026-10-19`. Direct GitHub binary upload was blocked; **image binaries are NOT in Git yet**. No React changes, merge, or production deployment. Next: retrieve ZIP, upload the 20 WebPs + manifest, integrate into hero/categories, verify CI and 393px/430px screenshots in both themes. Do not claim 1:1 or release until verified.

## 2026-10-18: Claude visual reference integration, draft PR #76

Working branch `design/claude-reference-fidelity-2026-10-18`, not merged. Unified orange Bubble B vector in header + dock, reshaped mobile bottom navigation, bubble categories, home/cards, and copied 12 ready-to-use illustration assets. Shared styles for profile, chat, listing detail, analytics and publishing. Genuine API/search/auth/exchange behavior retained; no seeded demo listings. Initial CI found three legacy tests expecting old placeholder paths; tests and category-title mapping updated and CI rerun requested. Pixel-by-pixel comparison and physical iPhone/PWA acceptance still pending; PWA PNG icons and hero art not exact. Full record: `docs/design/barter-2026-10/IMPLEMENTATION_2026-10-18.md`. Next: check CI, compare 390px screenshots and fix discrepancies before any merge/deploy.

## 2026-10-18: release CI follow-up

251d45b: 6/6 account and 6/6 message browser scenarios passed. Catalog 8/12
passed; four publication scenarios hit an ambiguous text locator introduced by
live preview, and two late favorites reads reached the isolated fixture server.
Scoped confirmation text to .publication-form and added the known read-only
favorites fixture; no production guards or mutation assertions removed.
PWA assets are now committed under bubble-b-v2, generated from the existing
artwork; all seven sizing/alpha/maskable assertions pass. Web/API builds and
87 web + 4 analytics tests pass. Full new orange logo still requires clean artwork.
Deployment remains pending successful rerun; prior visual-browser restriction remains.

## 2026-10-18: mobile release preparation, not yet deployed

Owner now prioritizes deploying mobile. Restored checkout from remote a3d0204 after
previous worktree metadata vanished. Added photo selection and trade mode to first
publication step, two-row mobile logo/search header, fixed nonexistent bubble-b-v2
asset references to existing checked-in brand assets (exact new logo still pending).
Updated browser geometry assertions for the intentional 58px/700 mobile header and
profile heading rather than old 64px/600 design. Retained overflow/tap-target checks.
Prior CI a3d0204: account failed old geometry assertions, messages passed, listings
suite skipped. Local production build passed before asset/header changes; final
build/CI pending. Browser-policy block from prior session remains; no bypass.
Next: pass release CI, then deploy the scoped mobile increment authorized by owner.
Pixel-perfect all-pages completion remains open; do not conflate rollout with acceptance.

## 2026-10-17: screen refresh and real seller analytics (draft PR #75)

Mobile detail now uses edge-to-edge gallery, rounded content sheet and compact
attribute tiles. Profile identity/menu, chat bubble colors, full-screen filters,
publication step indicator and mode controls updated. Desktop header now has one
row, and publication has a live preview from the actual entered data and photos.
Added authenticated /analytics/seller endpoint and /profile/analytics: owner-scoped
recorded events, UTC daily buckets and own listing counters, bounded 7/30/90 days.
Audience/offer tracking is unavailable and explicitly shown as unavailable.
Checks: final web build PASS; API build PASS; 87 web tests PASS; 4 new analytics
tests PASS (period validation, UTC boundaries, authenticated owner, query scoping).
Browser verification remains blocked by the earlier cloud-browser URL-policy denial;
no alternate execution surface used. No pixel-fidelity, iPhone or release claim.
Generated logo extraction rejected for visible alpha artifacts, not added to app.
Still open: exact logo/hero; publication step reconciliation/photo-first mobile flow;
structured exchange-offer UI/backend; notification screen; analytics detail/audience;
remaining supporting screens; screenshot comparison at mobile and desktop sizes.
Next: resolve authorized visual-preview access, refine these gaps against references.
This is incremental implementation, not completion of the all-pages request.

## 2026-10-17: visual refresh, first implementation slice (draft)

Branch: design/mobile-desktop-refresh-2026-10-17, based on master 43e8c17.
Mobile: larger Cyrillic wordmark, single-row categories, marketing hero using supplied
optimized artwork, shared listing cards, central branded create button with existing
sale/barter/both links. New dock uses ordinary tabs rather than the old drag lens.
Desktop: shared category strip/hero/cards and navigation rail without duplicate categories.
Catalog: Purchase / Exchange / Both; combined mode implemented in DTO/service with
SQL eligibility before pagination, and fail-closed client handling for older servers.
Existing catalog/model work in a different local branch has not been touched.
Validation: web production build and API build pass; 87 web tests and 35 targeted
API tests pass. Browser suite adapted to new labels and tap navigation, NOT executed.
Browser visual QA BLOCKED by cloud-browser URL policy after local preview startup.
Do not merge/deploy this draft or claim iPhone/PWA acceptance. Remaining: visual comparison
at 360/390/430 and desktop, refine hero/logo against source, detail/chat/profile/create
screen-specific redesign, analytics real-data scope, full browser CI and physical iPhone.
Next: restore authorized visual verification, finish mobile screens before desktop acceptance.

## 2026-10-15: mobile viewport, hold preview, filled navigation

User reports PR72 still fails on iPhone. Separate the mobile safe-area inset from an inner scroll surface; keep the bottom dock outside it. Replace outlined dock icons with filled SVG silhouettes. Remove the native anchor around the photo gesture surface, retain tracked navigation on tap/Enter and the text link, and preload alternate photos. Add Chromium native touch hold regression alongside WebKit listener checks. Physical iPhone behavior is not yet verified. PR #73 merged as 9b468303bbd34a34eb3a3dad20f94611077080df. Production build and 86 unit tests pass. Web quality run 38775296117 passes: 6 account, 12 catalog/layout (including native Chromium touch at 390px in both themes), 6 messages scenarios; dependency audit 38775296674 passes. Backup: backup/pre-mobile-viewport-2026-10-15 at 570e233. Production Vercel deployment 6a6M5RK4MmStCZm834SK8kMgWQWC is SUCCESS. Cloud-browser reload of https://web-one-blond-66.vercel.app/ confirms app-viewport, all four SVG fills=currentColor, and actual two-photo Iphone preview outside an anchor. Test screenshots reviewed in both themes. Next step: physical iPhone safe-area/hold confirmation; native system chrome is not emulated by desktop WebKit.

# Barter Clone — Handoff Context

## 2026-10-13: публикация PR #72 подтверждена

Утром Vercel status для 0d5fa1c22b88f2a623d12e716bf0fdf10d78b147 = success,
выпуск CnuN6Lhgw1ETnfZfgZEcQaxPE2jS. На основном сайте через браузер проверены:
/favorites имеет screen-header, непрозрачный rgb(255,255,255), backdrop-filter:none;
в ленте у реального Iphone с двумя фото есть photo-hold-preview,
data-photo-index=0, data-photo-holding=false, фото загружено. Это подтверждает
доставку новой версии, но не фактический touch-жест на iPhone.
Первое открытие каталога превысило таймаут API. Render показал запуск Nest
13 октября 06:28:48 UTC, после запуска каталог загрузился с реальными данными.
Настройки/тарифы/данные не менялись. Vercel connector не имеет доступа к команде;
статус установлен через GitHub, DOM проверен на публичном сайте.
Вчера пользователь видел сохраняющиеся дефекты во время pending выпуска.
Не считать их закрытыми на основании deploy: следующий шаг, перезапустить PWA
и подтвердить верх/хаб/удержание фото на физическом iPhone после этого выпуска.

## 2026-10-12: safe-area сообщений и удержание фотографий

Максим показал на iPhone размытие верхнего заголовка и поднятый хаб в сообщениях.
В авторизованном messages отсутствовал safe-area-top. Добавлен полный контейнер
100dvh с верхним safe-area и нижним резервом; body не короче viewport, без
дублирующего padding на messages. Автопрокрутка теперь только внутри истории,
не scrollIntoView всей страницы. Общие шапки профиля/избранного непрозрачны.
Фото в карточках: удержание 320ms запускает смену кадров каждые 850ms,
горизонтальное движение выбирает кадр; отпускание возвращает обложку и не
открывает объявление. Обычный tap и вертикальная прокрутка сохранены.
Добавлены browser regression сценарии safe-area/list-thread/dock и touch photo.
86 unit tests и build/TypeScript успешны. Первый CI выявил Illegal constructor
в новом тесте Touch в WebKit; заменено на переносимые синтетические DOM-события.
Финальный head 869a4a68eb50d5131341c93c864ef40881e489c7: web CI 38298253158
(6 account / 10 layout / 6 messages), security 38298253622 success.
Снимки светлой/тёмной переписки с safe-area просмотрены; это fixture WebKit,
не физический iPhone. PR #72 слит в b33950c04eebb25397d3e77dc43cc05653be2e7e.
Production НЕ подтверждён: GitHub combined status пуст; Vercel get_deployment
для web-one-blond-66.vercel.app в vraachmaxs-projects после принятой авторизации
вернул 403 forbidden. CLI отсутствует. Preview первого head подтверждён ботом
Vercel Ready (J4Z4MX1kqdxyqoiuBoJiaD6PWbUV), это не production.
Ранее повторный live-browser просмотр был остановлен auto-review из-за лимита;
обходов не выполняли. На физическом iPhone новые правки ещё не проверены.
Следующий шаг: подтвердить production через доступ к команде Vercel, затем
проверить шапку/хаб при переходах и удержание фото на установленном PWA.

## 2026-10-12: чёткость логотипа и закрепление мобильной шапки

Максим подтвердил исправление цвета системной полосы PR #70 на iPhone,
но заметил размытие логотипа сверху. Убрана glass-panel с внешней мобильной
шапки каталога: фон непрозрачный, цвет страницы, поиск сохраняет стекло.
Отступ теперь safe-area + 12px вместо max(12px, safe-area). В браузере
воспроизведён уход шапки с логотипом вверх при scroll: overflow-x:hidden
на body создавал конкурирующий scroll-container и ломал sticky. Для браузеров
с поддержкой overflow:clip заменён только механизм горизонтальной обрезки.
Добавлена browser-проверка ненулевого safe-area=59px, зазора, отсутствия blur,
перекрытия логотипа и его закрепления после реальной прокрутки.
PR #71 опубликован: merge c90df1a, web CI 38207709530 и security 38207709765 success.
Vercel success, снимки CI просмотрены. Повторный просмотр production заблокирован
автоматической проверкой доступа из-за лимита использования. Позднее Максим
прислал скриншоты оставшихся дефектов; задача не закрыта, см. новую запись выше.

## 2026-10-12: системная область iPhone, опубликовано через PR #70

Максим сообщил о чёрной верхней полосе в светлой теме и белой в тёмной.
Добавлен viewport-fit=cover: существующие safe-area отступы шапок/нижнего
хаба теперь применяются к полной области экрана. Theme-color и color-scheme
задаются до первого кадра с учётом выбора LIGHT/DARK/SYSTEM, включая
недоступный storage; после pageshow/возврата из фона chrome синхронизируется.
Режим Barter Dash сохраняет #060914. Системный Dynamic Island не скрывается.
Добавлены проверки темы приложения против противоположной системной темы,
предзагрузки/перезагрузки, viewport и meta в browser acceptance. 86 tests,
build, account/layout/messages CI 38146963368 и security 38146963600 success.
Первый прогон поймал гонку теста drag со сменой reduced-motion в WebKit;
добавлено ожидание двух кадров после изменения media, строгая проверка сохранена.
Head 4fc96c40b6ac93e31d5f46496de6c13c67f6a769, PR #70, merge
3a7757392211ef5789253daccad4a06579a16380. Vercel production success.
На основном URL проверены viewport-fit=cover, light/#FFFFFF и dark/#141519
в meta/color-scheme. 12 октября Максим подтвердил исправление цвета на физическом iPhone.
Оставшееся размытие логотипа разбирается в новой записи выше.
Максиму нравится раздел чатов из интерактивного демо: сохранить его как
ориентир следующего оформления чатов, без подмены реальных переписок демо.
Следующий шаг: полностью закрыть/открыть установленный PWA и подтвердить
обе темы на iPhone; оформление чатов по демо остаётся следующим UI-ориентиром.

## 2026-10-11: Liquid Glass опубликован, PR #69

Максим попросил перенести интерактивное демо в действующий Barter, включая
тёмную гамму, предварительно сохранив старую версию. Работа от актуального
master f8fb8e4fc18f4f1fe43d8a2a4547bd16559b3aaf; PR #56 уже слит, хотя
предыдущая запись HANDOFF ещё описывала его приёмку как незавершённую.
Исходное состояние целиком сохранено в GitHub-ветке
backup/pre-liquid-glass-2026-10-11, SHA проверен fetch/readback.

Новая навигация: Лента / Избранное / Чаты / Профиль, отдельный «+» с тремя
реальными режимами /new?tradeMode=..., а также Поиском и Моими объявлениями.
Старая bubble-геометрия заменена по прямому разрешению пользователя.
Пружина и растяжение линзы работают через RAF без React-render на каждый кадр;
обычный tap сохраняет Link, drag маршрутизирует один раз, отмена жеста возвращает
индикатор. Base UI отвечает за focus, Escape и закрытие меню вне него.
На /new и в игре навигация скрыта. Существующие 116px + safe-area сохранены.
Палитра: #141519 / #202126 / #2b2d34, текст #f4f5f7 / #a3a5ae,
контур #2e3036. Общие токены, нативные поля и Safari theme-color согласованы.
Golos, Bubble B, реальные объявления, авторизация и backend остаются рабочими.

Проверено: 85 web tests, production build/TypeScript. Добавлены браузерные
проверки касания, drag/release, следующего tap, меню/Escape/focus, палитры,
областей касания и предвыбора публикации. CI 38145097261 success: 85 tests,
build/TypeScript, 6 account + 10 layout + 6 messages browser сценариев.
Security 38145097510 success. Мобильные снимки WebKit 360/440 light/dark просмотрены.
Проверенный head f182ab790db65c74401ba057b8b04657bd4026ec; PR #69 слит
в dc9b2657a32d2eab3735be79e7ca1b3abe1c66c7. Vercel production success.
На основном URL после reload подтверждены новая .liquid-nav, четыре вкладки,
отдельный «+», нейтральный переключатель и dark-токены #141519 / #202126.
Прямое подключение Vercel требует повторной авторизации; существующий GitHub
Git-deploy остаётся доступным, статус выпуска проверять через commit status.
Физический iPhone/PWA и авторизованный production не считать проверенными.
Следующий шаг: приёмка ощущения жестов на физическом iPhone; затем TXT-03.

## 2026-10-10: PR #56, продолжение приёмки и сверка master

Повторный audit 38073718353 на b7a2239 подтвердил устранение трёх прежних
проблем, но выявил ещё 11 исправимых advisory в Next/sharp/handlebars/shell-quote.
Обновление: Next/eslint-config-next 16.3.8, sharp 0.35.5, handlebars 4.7.10,
shell-quote 1.11.0. Исключения не расширялись; итог нового CI ещё ожидается.

Master 824b32d содержит 13 новых коммитов после bc6d122: Barter Dash,
скрытое открытие пятью нажатиями, профиль/рекорд, две модели персонажей,
адаптация HUD/PWA/iOS и переход со страницы Next на same-origin HTML без iframe.
Все изменения объединены в рабочую ветку PR #56 без конфликтов. Игра не
переписывалась; исходники и сборка не доказывают исправление на физическом iPhone.

Предыдущий head #56: PG acceptance 37431984133 success; web 37431984138
упал на точном доступном имени «Марка» в фильтре. Добавлен aria-label из схемы,
строгий browser сценарий сохранён. Audit 37431985166 обнаружил proxy-addr,
source-map-js и dev-only sprintf-js. Обновлены первые два; sprintf-js удалён
через js-yaml 4.3.2 в Istanbul config loader, с regression YAML fixture.
Новых OSV-исключений нет. Детали: docs/SECURITY_DEPENDENCIES_2026_10_10.md.

Локально: чистая установка, 85 web tests, 248 API tests, обе сборки успешны.
Модели игры восстановлены prebuild и их SHA-256 проверены штатным скриптом.
Повторный remote CI и выпуск этого head ещё не подтверждены. Следующий шаг:
проверить browser/PG/security CI PR #56, затем выпуск и production readback.
TXT-03 не закрыт; аналитика/Яндекс/платежи не включались.

## 2026-10-06: поколения BMW 3 Series, подготовка

Ветка feat/bmw-3-generations от master bc6d122c. Добавлены 7 исторических
семейств поколений I–VII по материалу BMW Group 11.07.2025, без ограничений
года выпуска/кузова и без заявления полного актуального ряда. Ревизия 4:
auto_generation с родителем auto_model, атомарный seed после существующего
набора марок/моделей. Новые поля схемы появляются в общем UI после родителя.
Фильтр поиска поддерживает все уровни и рекурсивную очистку. Публичная карточка
разрешает названия по тому же справочнику. Добавлены PG/HTTP и browser проверки.
27 category tests и API build успешны; итог CI/production пока не подтверждён.
Следующий шаг: закончить приёмку и выпустить. TXT-03 остаётся открытым.

## 2026-10-05: дополнение РФ опубликовано, PR #54

Merge adcdd2edbaa25f8074b328d889cfc34f9c07f5d9, проверенный head
a383a2a9349f3ba036c7357e060b24ca18900377. Отдельный набор кратких названий:
3 марки TANK/Belgee/EXEED, 10 моделей, источники на уровне каждой записи.
Базовый VehiclesDB неизменён. Ревизия 3 без удаления/переименования прежних ID.

PostgreSQL CI 37350078221 success: 191 API unit, build, HTTP, Socket.IO/media,
импорт 311/5 465, повторный запуск и восстановление v2 без изменения прежнего ID.
Web 37350078215 success: 82 unit, production build, account/layout/messages
browser acceptance. Security 37350079493 success с прежними исключениями.
Локально 26 category tests и API/web builds успешны.

Vercel production success на merge SHA. Render dep-db1u4r8473hc738ta7sg
live 17:48:17 UTC; ошибок в проверенном окне запуска нет. После live внешний
API подкатегории легковых вернул ревизию 3, 311 марок, 5 465 моделей и все
10 добавленных значений с правильными родителями; health ok:true. Запрос во
время seed видел промежуточные значения, итог повторно проверен после live.
Под реальным production-аккаунтом новые объявления не создавались.

TXT-03 не закрыт. Следующий конкретный срез: поколения BMW 3 Series по
официальному материалу BMW Group, ссылка в AUTO_CATALOG_SOURCE_REVIEW.md.
Сначала сверить коды/область кузовов; различающиеся в региональных материалах
годы нельзя объявлять универсальными. Полнота РФ, поколения прочих моделей,
matching и аналитика остаются открытыми. Платные сервисы не подключались.

## 2026-10-05: дополнение РФ, подготовка

Ветка feat/ru-car-catalog-supplement от master b94d18bd. Отдельный проверенный
набор 3 марок / 10 моделей, по одному official-source URL на запись.
Итого 311 / 5 465, исходный VehiclesDB не менялся. Ревизия 3 добавляет данные
без удаления/переименования старых ID; проверяется повторный и прерванный
импорт с v2. Страница /vehicle-data различает происхождение двух наборов.
Поколений нет, полное покрытие не заявлено. Следующий шаг: CI, публикация,
проверка production readback. Аналитика и matching не начинались.

## 2026-10-05: конкретные пожелания опубликованы, PR #52

Merge `b9ab77ba085e83c176ed8ef0ec154f121b765311`, проверенный head
`f017b91cc99aba6bbeb0ce570095efd8ca042fc4`. До пяти конкретных вариантов
из общего справочника работают в создании, редакторах и публичной сводке.
Категория собственной вещи не ограничивает пожелания. Марка/модель связаны;
API проверяет точные значения и родителей, старый PATCH сохраняет wantedItems,
[] очищает явно. Новый клиент проверяет structuredWishesVersion=1.

- Web quality 37326331574 success: 82 unit, build/TypeScript, 6 account +
  10 layout + 6 messages browser scenarios. Светлые/тёмные WebKit-снимки
  просмотрены, включая мобильную форму конкретного пожелания.
- PostgreSQL acceptance 37326331888 success: API unit/build, HTTP create/read/
  PATCH/clear пожеланий, наследование схемы, неверные родители и старый клиент;
  сообщения, Socket.IO, multipart media и VehiclesDB import также прошли.
  Первый прогон упёрся в лимит пяти активных fixture-объявлений; тест архивирует
  уже использованную fixture перед шестым созданием. Production-лимит не изменён.
- Dependency audit 37326333627 success с существующими ограниченными
  исключениями; новых зависимостей/миграций и платных сервисов нет.
- Vercel production success на merge SHA, главная отвечает HTTP 200.
  Render `dep-db1t4r2vcj2c73amh090` live с 16:40:50 UTC. Внешний API подтвердил
  structuredWishesVersion=1; health ok:true, persistent media. В error-логах
  проверенного окна запуска нет записей. Во время rollout первый ответ
  capabilities ещё был от старого экземпляра; после live проверен повторно.

Физический iPhone, запись под реальным production-аккаунтом и доступность из РФ
без VPN не проверены. Это хранение предпочтений, не автоматический подбор.
TXT-03 остаётся открыт: поколения, пробелы РФ и использование справочника
в подборе. Следующий шаг: проверенный источник поколений/пропусков РФ по
docs/AUTO_CATALOG_SOURCE_REVIEW.md; не импортировать сомнительные данные и не
выдавать текущий справочник за полный. TXT-09/10 ещё не начаты.
Яндекс/платежи не включались. Срок бесплатной БД остаётся 2 ноября, 23:23 МСК.

## 2026-10-05: структурированные пожелания, подготовка

От master `4e9dc392`, ветка `feat/structured-wishes`, additive wantedItems в
exchangePreferences: до 5 {categoryId, attributes}, 1–10 select-значений.
API проверяет разрешённую категорию, активную наследуемую схему и точного
родителя. Старый PATCH без wantedItems сохраняет их; [] очищает, null очищает
все условия. Capability structuredWishesVersion=1 защищает новый клиент от
тихой потери. Старые поля и межкатегорийный обмен сохранены.
Общий UI создания/редакторов умеет категорию, зависимые поля, ошибку/повтор,
удаление и загрузку названий в публичной сводке; никаких заявлений о matching.
Локально 82 web и 190 API tests, API/web build пройдены. Добавлены HTTP/PG и
браузерные сценарии сохранения/родителей/старого API/перечитывания/очистки,
но CI и выпуск этого блока ещё не подтверждены. Следующий шаг: CI и приёмка,
затем выпуск при успехе. Поколения/полнота РФ остаются отдельным пробелом.

## 2026-10-05: следующий срез после выпуска редактора

PR #49 опубликован, итоговые документы слиты PR #50 (`685fcbf`). После выпуска
production API повторно вернул 308 марок, 5 455 моделей, 7 кузовов, 3 привода,
5 типов топлива, 4 КПП. Рабочее дерево релиза сохранено; старые PR #35/#48
не слиты. Повторная проверка источников/конкретных пропусков записана в
docs/AUTO_CATALOG_SOURCE_REVIEW.md. Готовый проверенный источник поколений
для импорта пока не выбран; новые данные и произвольные aliases не добавлялись.
Следующий реализуемый пункт TXT-03: структурированные пожелания на текущих
categoryId/catalog values в API и общем UI. Существующие wantedCategoryIds,
wantedDescription и доплата должны сохраниться; новая capability должна
блокировать тихую потерю полей на старом API. Точный подбор/ранжирование после
этого проверяется отдельным срезом. Поколения/полнота остаются открытыми,
аналитика TXT-09/10 не объявлена начатой.

## 2026-10-05: редактор TXT-03, PR #49 слит

Merge `81332c9e896598902ebb7ab14f6ed33764021df8`. Общий справочник теперь
работает в создании и редакторах списка/профиля. Зависимые значения сбрасываются
при смене родителя; очистка удаляет поле; старые неизменённые значения сохраняются
только в той же категории с прежними родителями. Ошибка загрузки блокирует
сохранение и предлагает повтор. Атрибуция и предупреждение о неполноте сохранены.

Финальный head `5ab781aa52b0870a9d41fdc406a61597e5173c0e`:
- Web quality 37260072497 success: 80 unit, build/TypeScript, 6 account +
  10 layout + 6 messages browser scenarios. Проверены category reset, dependent
  make/model, reload/clear, failure/retry. Снимки WebKit светлой/тёмной темы
  просмотрены: исправлены доступные имена и native color-scheme.
- PostgreSQL acceptance 37260072413 success: 176 API unit, миграции, HTTP
  legacy attributes, Socket.IO, multipart media и VehiclesDB import.
- Dependency audit 37260072903 success. Исправленные версии и ограниченное
  dev-only исключение braces до 4 ноября: docs/SECURITY_DEPENDENCIES_2026_10_04.md.
  Проверка не означает отсутствия всех рисков: OSV учитывает два явных исключения.
- Физический iPhone и сохранение под реальным production-аккаунтом не проверены.

Production: Vercel success на merge SHA; Render `dep-db1hp6ivcj2c73a90980`
live 2026-10-05 03:44:19 UTC на том же SHA. Внешний `/health` ответил 200,
`ok:true`, mediaStorage persistent. В error-логах окна запуска записей нет.

Следующий шаг: поколения/пробелы покрытия авто и структурированные пожелания
на тех же ID. TXT-03 остаётся открытым; после него TXT-09/10. Яндекс на паузе,
draft PR #48 не сливать. Новая free Render БД истекает 2 ноября, 23:23 МСК.

## 2026-10-05: PR #49, исправления после первой CI-приёмки

PR #49 открыт, не слит. PostgreSQL/HTTP приёмка предыдущего head прошла,
браузерная остановилась на доступном имени поля «Состояние». Общая форма
получила явные aria-labelledby/aria-describedby; авто-тесты ждут combobox,
а не промежуточный text input до загрузки схемы.
Обновлены Next 16.3.6, Multer 2.4.0, Engine.IO 6.6.11, brace-expansion и fast-uri.
Подробности и временное dev-only исключение braces: SECURITY_DEPENDENCIES_2026_10_04.md
в docs; отдельный CI guard запрещает его попадание в production dependency graph.
После чистого npm ci: 80 web / 176 API тестов и обе production-сборки успешны.
Повторные CI/browser/security и выпуск ещё ожидаются. Следующий шаг: проверить
новый head PR #49, устранить остаточные ошибки, затем выпустить редактор.
TXT-03 целиком не закрыт, Яндекс остаётся на паузе.

## 2026-10-04: Render восстановлен, редактор TXT-03 подготовлен

По разрешению Максима `DATABASE_URL` API заменён на внутреннее подключение
новой free БД `barter-db-20261003` (`dpg-db0m8ek9v7es73c2ecs0-a`). Старые данные
не переносили. Deploy `dep-db0ulp7avr4c739e28b0` live, 27 миграций успешны.
HTTP `/health` 200; `/categories` и полный endpoint вариантов легковых авто
читают новую БД: 308 марок, 5 455 моделей, 7 кузовов, 5 типов топлива,
4 КПП, 3 привода. Это подсчёт production API, не прямой SQL. Внешний доступ
PostgreSQL не открывали. Free БД истекает 2026-11-02 20:23:22 UTC.
Яндекс на паузе: draft PR #48 сохранён, ресурсы/домен не переключены.

Продолжение от master `dad1b21`, ветка `feat/catalog-editor`. Старый открытый
PR #35 использует иной, уже заменённый контракт и не сливается. Новый срез
подключает текущие attribute-schema/attribute-options к редакторам `/listings`
и профиля, вместе с `/new` использует общий загрузчик. Есть блокировка при
ошибке/загрузке, повтор, сброс модели при смене марки, сброс характеристик
при смене категории. Очистка поля удаляет значение; неизвестные поля прежней
категории сохраняются. Старые варианты можно сохранить без изменений только
в той же категории и с прежним родителем; новые значения API проверяет строго.
Добавлены regression проверки редактора и HTTP/PG сценарий сохранения legacy.
Локально: 80 web tests, 176 API tests, API build и web production build успешны.
CI/browser/выпуск этого среза ещё не подтверждены. Физический iPhone не проверен.
Следующий шаг: CI, выпуск, затем поколения/полнота авто и структурированные
пожелания/matching. TXT-03 остаётся открытым; аналитика TXT-09/10 после него.

## 2026-09-28: TXT-03, VehiclesDB выпущен PR #46

PR #46 слит в `2668d73ee7014957ff123ddad0f7de532f5f430c`.
Проверки dependency, PostgreSQL import acceptance и web browser CI успешны;
Vercel production status success, Render `dep-data3cgu01pc73frph80` live,
ошибок запуска в проверенном окне логов нет. CI подтвердил 308 марок,
5 455 моделей, scoped 38 моделей Lada и идемпотентность. Прямой подсчёт строк
production-БД не выполнен: read-only инструмент вернул INVALID_ARGUMENT.
Нет поколений/комплектаций, полной РФ-полноты, редактора и обменного matching;
TXT-03 продолжается. Не переходить к аналитике TXT-09/10 до следующего решения
о границе этого блока. База Render free имеет указанный платформой срок
окончания 2026-10-03 — проверить план/сохранность отдельно.

## 2026-09-28: TXT-03, импорт VehiclesDB в текущей ветке

Полный blob закреплённого VehiclesDB v2026.09.1 проверен: 308 марок,
5 455 моделей, уникальные ID и существующие родители. Срез ID/названий
импортируется при запуске API идемпотентно в `auto_make`/`auto_model`, версия
схемы авто повышается до 2 после успешной загрузки. `/new` использует уже
имеющийся зависимый контрол; `/search` загружает модели по выбранной марке.
Публичная `/vehicle-data` содержит атрибуцию и все уведомления источника.
Сборки API/web и локальные 231 API + 78 web тестов прошли. PostgreSQL HTTP,
браузерная проверка и production не подтверждены в этой ветке. Для CI добавлен
отдельный PostgreSQL acceptance реального импорта. Нет поколений,
полного покрытия РФ, редактора и обменного matching. Старые значения объявлений
не изменены. Дальше: CI с PostgreSQL/браузером, публикация и мониторинг,
потом следующий срез TXT-03. Обзор в `docs/AUTO_CATALOG_SOURCE_REVIEW.md`.

## 2026-09-28: TXT-03, фильтры характеристик, PR #44 опубликован

PR #44 слит коммитом `4b604374e9c5b1bf1ca2b58c5ce8cfc37f1983cc`.
`/search` загружает
активные корневые select-поля и значения по категории из того же каталога, что
форма публикации; сейчас UI охватывает четыре независимых поля авто, но не
зависимые марку/модель. `GET /listings?categoryId=...&attrs=...` проверяет
активные значения у ближайшего предка с полями и фильтрует JSON до VIP,
сортировки и пагинации в Market и Barter. Ответ подтверждает `appliedAttrs`,
чтобы старый сервер не показывал нефильтрованную выдачу под видом новой.
Смена категории очищает выбор, режим и сортировка его сохраняют. Для
атрибутного текстового поиска используется SQL, поскольку индекс Meili не
поддерживает этот фильтр; релевантность опечаток может быть ниже. Локально
API build/230 unit, web build/78 unit прошли; PostgreSQL HTTP, браузерные
account/listings/messages и audit в CI успешны. Vercel status success, Render
`dep-dat8klivcj2c73bjtv1g` live, Nest запущен; в коротком окне после
выкладки error-логов нет. Реальный авторизованный/iPhone сценарий в production
не проверен. Обзор VehiclesDB уточнён: тег `v2026.09.1` есть, manifest и
README расходятся по car counts, большой файл моделей не прочитан; данные
не импортировались. Следующий шаг: получить и сверить полный лицензированный
файл make/model с атрибуцией до импорта; потом зависимые фильтры и matching.
Аналитика TXT-09/10 после TXT-03.

## 2026-09-28: TXT-03, иерархия категорий, PR #42 опубликован

PR #42 слит коммитом `5a8bbaa03cb32620e3d87fe5cc4ec945fe294b50`. Seed добавляет
одну подкатегорию `passenger-cars` («Легковые автомобили») к `auto`, не переносит
старые объявления. API `/categories` отдаёт `rootSlug` и наследует доступность
обмена от корня; невалидная цепочка закрывает обмен. Schema и options берутся у
ближайшего предка с активными полями, серверная проверка использует те же опции.
Поиск и карта по родителю включают потомков до фильтрации, подсчёта и пагинации;
для текстового поиска родителя с потомками применяется SQL-путь вместо точного
фильтра Meilisearch, пока индекс не умеет несколько категорий. Форма публикации
использует базовую конфигурацию полей корня, ручной выбор и редактор обозначают
родителя дочерней категории. HTTP acceptance дополнен тремя уровнями, режимами,
сортировками и наследованием. Локально: API build/229 unit, web build/75 unit
успешны. PostgreSQL HTTP и браузерные CI сценарии, аудит зависимостей прошли.
Vercel status success, Render `dep-dat81jc9v7es73fo8l6g` live; Nest запущен.
Реальный авторизованный сценарий на iPhone не проверен, ручная проверка
на production отдельно не проведена. Следующий шаг: выбрать закреплённый
легальный набор марок/моделей и расширить справочник, фильтры и matching.
Аналитика TXT-09/10 после TXT-03 по решению Максима.

## 2026-09-28: TXT-03, PR #40 опубликован; следующий блок подкатегории

PR #40 слит коммитом `5acaf62edf77ca73746404916c92bfb85434327f`.
Загрузка корневых опций по полю и дочерних по выбранному родителю работает
в форме; старый API обслуживается прежним контрактом. Смена родителя очищает
потомков. В CI успешны 227 API и 75 web unit-тестов, сборки, PostgreSQL
migration/HTTP acceptance и браузерные account/listings/messages сценарии.
Vercel status success; Render deploy `dep-dat3b7ou01pc73fid5cg` live,
миграция `20260928040000_catalog_field_parent` применена, Nest запущен; в
коротком окне после запуска error-логов нет. Реальный авторизованный сценарий
на iPhone не проверен. В продакшене по-прежнему только четыре коротких списка
характеристик авто, не марки/модели/поколения. Следующий шаг TXT-03: безопасная
иерархия подкатегорий с наследованием полей и поиском по потомкам; затем
закреплённый, проверенный набор марок/моделей с обязательной атрибуцией.
Аналитика TXT-09/10 идёт после каталога, без фиктивных событий сделок.

## 2026-09-28: TXT-03, загрузка вариантов по требованию (ветка)

PR #39 слит в master коммитом `76219efad627a9dcb097d7a8ef946255fea438a7`;
PostgreSQL HTTP acceptance и audit успешны, Render deploy
`dep-dat35t8u01pc73fi6gig` live. Новая ветка `feat/lazy-catalog-options`:
поле каталога получило `parentKey`, schema API сообщает
`optionsQueryVersion: 1`, форма запрашивает корневые варианты отдельно по полю,
а дочерние только после выбора родителя. При старом API сохраняется прежняя
загрузка. Смена родителя очищает потомков до ответа сети. Новая миграция
аддитивная, существующие объявления не меняет. Локальные Prisma validate,
API build/227 unit и web build/75 unit прошли. PostgreSQL CI и браузерная
проверка новой ветки ещё не выполнены. Следующий шаг: проверить в CI и
опубликовать, затем подкатегории и легальный набор марок/моделей. Аналитика
TXT-09/10 остаётся следующей крупной очередью после TXT-03.

## 2026-09-28: TXT-03, серверная выборка зависимых значений

Ветка `feat/scoped-catalog-options` от master после PR #38. Существующий
`GET /categories/:id/attribute-options` без параметров сохраняет старый
контракт. С `fieldKey` возвращает корневые значения выбранного поля; с
`fieldKey`, `parentFieldKey` и `parentValue` возвращает только дочерние опции
нужного родителя. Неполная тройка параметров даёт 400. PostgreSQL HTTP
acceptance дополнен корневыми и дочерними сценариями. Локально API build и
227 unit-тестов прошли; PostgreSQL и production для новой ветки не проверены.
Форма пока использует полный ответ: клиентскую загрузку по требованию сделать
следующим срезом перед импортом больших данных. Затем подкатегории и
проверенный источник марок/моделей. TXT-03 и аналитика TXT-09/10 остаются
в работе согласно ROADMAP.

## 2026-09-28: TXT-03, определения полей, PR #37

PR #37 слит в master коммитом `2d7bafda40dc8e358d43364e3b64c9cdb888a799`.
Добавлены
`CategoryAttributeField`, `Category.catalogRevision`, аддитивная миграция,
идемпотентный seed метаданных четырёх контролируемых полей авто и
`GET /categories/:id/attribute-schema`. Форма читает подписи из этой схемы,
сохраняя совместимость со старым API; значения по-прежнему поступают из
`attribute-options`. PostgreSQL HTTP acceptance дополнен проверкой схемы.
Prisma validate/generate, API build и 227 unit-тестов, web build и
74 unit-теста локально прошли. В CI успешно выполнены PostgreSQL migration
rehearsal, HTTP acceptance, browser account/listings/messages и dependency
audit. Vercel status success для merge-коммита. Render deploy
`dep-dasvhgrncjis73euffp0` live: миграция `20260928030000` применена,
Nest запущен; в коротком окне после запуска error-логов нет. Реальный
авторизованный сценарий и iPhone не проверены. Следующий шаг:
подкатегории и проверенный источник марок/моделей, затем единые фильтры/поиск.
Аналитика TXT-09/10 после текущего каталога.

## 2026-09-28: TXT-03, PR #36 опубликован; продолжаем определения полей

Максим явно разрешил отправить ветку. PR #36 слит в master коммитом
`395e6f8b186599dbfe165f2e7e62bd52c8ff4347`. Четыре справочника авто,
зависимые значения, форма и серверная проверка опуб…48801 tokens truncated…a CTA)

Задача #53 из директивы Максима «Всё подряд: #55 → #53 → #54 → #48». До:
4 таба (ВСЕ/ACTIVE/SOLD/ARCHIVED), пользователь вынужден отдельно искать
объявления с проблемами (PENDING модерация, дубликат фото, без цены), CTA
размещения была на `bg-[#00AAFF]` хардкоде → синяя в обоих режимах + не
выделялась как primary action.

**Что сделано:** `apps/web/src/app/listings/page.tsx` (+258/−101):

- **Таксономия:** `ListingTab` тип `'ALL'|'ACTIVE'|'ARCHIVED'|'SOLD'` →
  `'ACTIVE'|'NEEDS_ACTION'|'COMPLETED'`. URL backward-compat: `ALL`→`ACTIVE`,
  `ARCHIVED`/`SOLD`→`COMPLETED` (старые ссылки не ломаются).

- **`needsAction(x)` helper** определяет «требует действия» с reason-строкой:
  - `PENDING` → «Ожидает модерации — подтвердите публикацию»
  - `BLOCKED` → «Объявление скрыто модерацией»
  - `duplicateImageFlag` → «Фото совпало с другим объявлением — замените»
  - `ACTIVE` без `priceRub` → «Не указана цена»
  - `ACTIVE` без `images` → «Нет ни одного фото»

- **Mobile view** (новый): sticky header с back/title/search, табы-pills с
  mode-accent индикатором (нижняя 2px-полоса), компактная строка-карточка
  80×80 thumb + meta (город, статус) + per-card amber chip с reason.
  Sticky bottom CTA «Разместить объявление» на `var(--mode-cta)` (лайм для
  Маркета, оранж для Бартера) + `boxShadow: var(--mode-accent-ring)` +
  PlusCircle prefix; над bottom-nav (h=56) с зазором 72px.

- **Desktop view:** title + та же mode-cta CTA в шапке. Segmented tabs на
  `bg-muted` с 3 пилюлями; для активной NEEDS_ACTION (count > 0) — color
  переключается на `var(--mode-accent)` чтобы привлечь внимание.

- **Palette migration** (полный sweep):
  - `bg-[#00AAFF]` (CTA) → `var(--mode-cta)` + ring shadow
  - `bg-primary` (Save, empty-state CTA) → `var(--mode-accent)` / `--mode-cta`
  - `text-primary` (title hover) → `hover:[color:var(--mode-accent)]`
  - `border-secondary/30 bg-secondary/10 text-secondary` (PENDING confirm) →
    `border-success/30 bg-success/10 text-success` (зелёный = «можно публиковать»)
  - Edit form `focus:border-primary/30 focus:ring-primary/30` →
    `focus:[border-color:var(--mode-accent-ring)] focus:[--tw-ring-color:var(--mode-accent-ring)]`
  - Spinner Suspense fallback → inline `borderColor: var(--mode-accent-ring)`
  - Mobile header `bg-[#f4f4f4]` / `text-[#1a1a1a]` → `bg-muted` / `text-foreground`
  - need_auth state хексы → `var(--mode-accent-soft)` / `var(--mode-accent)`

- **Status-чипы** (как в Hotfix #10 на /profile): ACTIVE→success,
  PENDING/SOLD→mode-accent, BLOCKED→destructive, ARCHIVED→muted.

- **`shrink-0`** добавлен на ArrowLeft, Search (mobile header), Sparkles,
  PlusCircle×2, AlertTriangle, FileText, спиннер — продолжение Hotfix #11.

**Верификация:** `npx tsc --noEmit` → exit 0. Grep на `bg-primary|text-primary|
bg-secondary` → только JSDoc-комментарии в шапке файла.

**Commit:** `cdd5016` (master, pushed → Vercel auto-deploy).

## 2026-04-19 (7) — Hotfix #11: «вытянутые» иконки → shrink-0

Максим: «иконки в /new, /messages, /избранное какие-то вытянутые». Корень: lucide
рендерит `<svg width={size} height={size}>`; как прямой ребёнок flex-контейнера
SVG получает default `flex: 0 1 auto` → ширина может сжаться, высота держится из
атрибута → визуально иконка «вытягивается» вертикально. Тот же баг у спиннер-spans
(`inline-block size-[N]` без `shrink-0`).

**Что сделано:** добавил `shrink-0` (= `flex-shrink: 0`) на каждый прямой
flex-child SVG/spinner, без других визуальных изменений.

- **`apps/web/src/app/new/page.tsx`** — 10 иконок (ChevronLeft, CheckCircle×2,
  Circle×2, PlusCircle×2 + кнопка-чип, UserCircle, LayoutGrid, Wallet, MapPin)
  - 2 спиннера (auth-loading 18px, publish-busy 22px).

- **`apps/web/src/app/messages/page.tsx`** — 7 иконок (ChevronLeft, MessageCircle
  mobile-header, Link2 desktop-cta, Link2 mobile-cta, CheckCircle read-state×2,
  Wand2 advise-chip) + 2 спиннера (chat-list loading 32px, advise-busy 14px).

- **`apps/web/src/app/favorites/page.tsx`** — 1 иконка (Home в «На главную» CTA).

**Файлы:** 3 файла, +24/−24 строки.
**Верификация:** `npx tsc --noEmit` → exit 0. Globals.css не имеет глобального
SVG-reset (только `.want-line svg { color }`), значит фикс через `shrink-0`
самодостаточный.

**Commit:** `83b8abc` (master, pushed).

## 2026-04-19 (6) — Hotfix #10: mobile /favorites + /profile palette & font audit

Задачи #50 и #51 из очереди Hotfix #9. Максим: «лента избранного выглядит как-то странно»

- общий палитра-контракт (синий = Маркет, оранжевый = Бартер). Профиль был забит
  хардкод-хексами синего Avito на всех уровнях (хедер модалок, KPI-плитки, кошелёк,
  trust-бейджи, статус-чипы, фокус-кольца инпутов) — в режиме Бартер это давало синие
  заплатки поверх оранжевой темы.

**Что сделано:**

- **`apps/web/src/app/favorites/page.tsx`** — полный rewrite (~175 строк). Убрали
  сломанный `bg-primary via-white` хедер и «custom» карточку-список. Теперь:
  sticky mode-accent хедер с Heart-иконкой, 2-col mobile / 3-col md / 4-col lg
  grid через `ListingCardComponent` (паритет с лентой), per-card Trash2-кнопка
  удаления в правом верхнем углу (z-3, bg-background/95, hover:destructive),
  empty-state на `--mode-accent-soft` + `--mode-accent`, русская плюрализация
  «объявление/объявления/объявлений». Loading skeleton: 6 `ListingCardSkeleton`
  заглушек такой же геометрии.

- **`apps/web/src/app/profile/profile-content.tsx`** (1142→1170 строк) — palette
  audit, без реорганизации layout:
  - Хардкод-хексы → `--mode-accent*`: `#007AFF`/`#0088FF`/`#00AAFF`/`#0099EE`/
    `#0066DD`/`#0077DD` → `--mode-accent` (+ `-hover`); `#E8F2FF`/`#f0f9ff` →
    `--mode-accent-soft`; `#FF6F00` sparkle → `--mode-accent`.
  - Tailwind brand-токены → семантика / mode-accent: `bg-primary` (кошелёк, CTA,
    эмпти-state, промо-кнопка, save-кнопка) → `--mode-accent`; `text-primary`
    (Диалоги, «На главную», title-hover, pricing-hover) → `--mode-accent`; avatar
    `bg-primary`/`text-primary` → `--mode-accent-soft`/`--mode-accent`;
    `bg-accent/10` archived tab → `bg-muted`.
  - Status-чипы (новая функция `statusLabel`): ACTIVE→success, PENDING→mode-accent,
    BLOCKED→destructive, SOLD→mode-accent, ARCHIVED→muted. Ring-цвет через
    `[--tw-ring-color:var(--mode-accent-ring)]` + `ring-1`.
  - Verified-badge (CheckCircle на аватаре) → `bg-success` вместо `bg-secondary/10`
    (неконсистентная прозрачность с белой иконкой поверх).
  - Focus-rings инпутов edit-формы и топ-ап-модалки → `focus:[border-color:
var(--mode-accent-ring)] focus:[box-shadow:0_0_0_2px_var(--mode-accent-ring)]`
    (раньше `focus:border-primary/30 focus:ring-primary/30`).
  - Star-rating `fill-accent text-accent` → inline `color: '#FFB800', fill: '#FFB800'`
    (нейтральный «рейтинговый» gold, как у Google/Yandex; не оранжевый Avito).
  - «Все основные задачи выполнены» panel: `secondary` → `success` (семантика).
  - PENDING «Подтвердить публикацию» button: `secondary` → `success`.
  - Добавлен leading JSDoc-блок с описанием миграции и font-audit сноской.

- **Font audit:** grep по `font-mono|font-serif|font-[|fontFamily` в profile-content.tsx
  → 0 совпадений. Страница inheritit `--font-sans` (= Golos Text) из `layout.tsx` через
  body className. Fallback-chain: `Golos → system-ui → sans-serif`. ✅

**Файлы тронутые в Hotfix #10:**

```
apps/web/src/app/favorites/page.tsx                     (rewrite, ~175 строк)
apps/web/src/app/profile/profile-content.tsx            (palette audit, +30 edits)
```

**Верификация Hotfix #10:**

- [x] `npx tsc --noEmit` в `apps/web` — exit 0, чистый
- [ ] Визуальная сверка `/favorites` + `/profile` в обоих режимах: ни одного
      синего пиксела в Бартере, ни одного оранжевого в Маркете (кроме звёзд
      рейтинга — они нейтрально-золотые).
- [ ] Регрессия: home / listing / messages должны выглядеть как были.

## 2026-04-19 (5) — Hotfix #9: listing-detail palette audit (orange-on-blue leak fix)

Фокус — задача #52 из бэклога Hotfix #8. Максим жаловался: «моментами когда заходишь на
объявление там где-то на синем фоне оранжевый шрифт». Проблема — на странице
`/listing/[id]/page.tsx` блок «Безопасная сделка» использовал статический `bg-accent/10
text-accent` (= оранжевый Avito #FF6D00), а вокруг — bridge-`primary` (= синий #00AAFF).
В режиме Бартер было наоборот: синие кнопки и аватары на оранжевом окружении. Полный палитра-лик.

**Что сделано:**

- **`apps/web/src/app/listing/[id]/page.tsx`** — все вхождения `text-primary`, `bg-primary`,
  `text-accent`, `border-accent/30`, `bg-accent/10` заменены на `--mode-accent*` через inline
  `style` (для CSS-переменных) или Tailwind v4 arbitrary `hover:[color:var(--mode-accent)]`.
  Конкретно: breadcrumbs hover, safety-notice (фон/бордер/текст/иконка), CTA «Написать
  сообщение», seller avatar bg, hover имени продавца, Badge «Документы проверены», ссылка
  «Все объявления продавца →».

- **`apps/web/src/components/show-phone-button.tsx`** — переписан, теперь использует класс
  `.btn-show-phone` (= зелёный CTA #87D32C в Маркете, оранжевый `--mode-accent` в Бартере).
  Раньше использовал статический `secondary` (зелёный Avito #009F44). «Расскрытое» состояние
  (телефон/email) теперь на `--mode-accent-soft` фоне с `--mode-accent` текстом.

- **`apps/web/src/components/favorite-toggle.tsx`** — hover-палитра кнопки «Добавить в
  избранное» теперь `--mode-accent*` (раньше красила в статический оранжевый `accent`).
  Сердечко оставлено `#f5576c` — семантический «like»-цвет.

- **`apps/web/src/components/listing-mini-map.tsx`** — pin-маркер на карте и MapPin-иконка
  под картой перевязаны на `--mode-accent` (раньше — статический primary-blue).

- **`apps/web/src/components/listing-gallery.tsx`** — обводка активной thumb-картинки
  привязана к `--mode-accent-ring` (раньше `border-primary/30 ring-2 ring-primary/30`).

- **`apps/web/src/components/seller-review-form.tsx`** — критический фикс: контейнер имел
  сломанный класс `bg-primary to-white` (без `bg-gradient-to-b`, фактически solid синий
  Avito-primary). Заменено на `bg-card`. Все `text-primary`/`bg-primary`/`text-accent`/
  `bg-accent` в дочерних элементах (auth-required notice, текстарея focus-ring, кнопка
  «Опубликовать», CTA «Перейти в чат», fallback-блок) — на `--mode-accent*`. Success-
  сообщения оставлены `text-success` (семантический зелёный).

- **`apps/web/src/components/listing-bot-assistant.tsx`** — фон, бейдж, заголовок, текст,
  ссылки на похожие — всё на `--mode-accent*`. Раньше сплошной `bg-primary` (Avito-blue).

**Файлы тронутые в Hotfix #9:**

```
apps/web/src/app/listing/[id]/page.tsx
apps/web/src/components/show-phone-button.tsx
apps/web/src/components/favorite-toggle.tsx
apps/web/src/components/listing-mini-map.tsx
apps/web/src/components/listing-gallery.tsx
apps/web/src/components/seller-review-form.tsx
apps/web/src/components/listing-bot-assistant.tsx
```

**Что НЕ тронули и почему:**

- `seller-presence-badge.tsx` — `text-secondary` для «В сети» зелёный — семантический
  online-indicator, общий для обоих режимов. Оставлено как было.
- `ListingCard` промо-ring — уже было прокомментировано в Hotfix #8 (промо-бейджи скрыты
  CSS-фильтром в Бартере, поэтому `ring-accent/40` не вытекает).
- `listing-actions.tsx` — `secondary` (зелёный) использован только для success-state
  «Жалоба отправлена», `destructive` (красный) — для опасных действий. Оба семантические.

**Верификация Hotfix #9:**

- [x] `npx tsc --noEmit` в `apps/web` — exit 0, чистый
- [ ] Визуальная сверка `/listing/[id]` в обоих режимах: orange-on-blue не должно быть нигде
- [ ] Регрессия по другим страницам: home / favorites / messages / profile

## 2026-04-19 (4) — Hotfix #8: bottom-nav mode-color + header chip + gradient-categories + Market-cluster

Фидбек Максима после Hotfix #7 (14 пунктов одним сообщением). Mobile-only scope.

**Что сделано в этом коммите:**

- **Bottom-nav теперь mode-aware** (`apps/web/src/components/mobile-bottom-nav.tsx`).
  Активная иконка + лейбл красятся в `var(--mode-accent)` (оранжевый в Бартере, синий в Маркете).
  FAB-кнопка «+Добавить» — тоже `--mode-accent` + `box-shadow: 0 4px 12px var(--mode-accent-ring)`.
  Переключение мгновенное (CSS-переменные, без ре-рендера).

- **Кнопка «Поиск» в nav ведёт на `/search`** (новый маршрут, Phase 1.x). Fallback: если /search
  ещё не смонтирован, пользователь видит Next.js 404 — планируется клон моб. Авито с полной
  решёткой категорий + фильтрами (Task #48).

- **MapPin переехал на место колокольчика в шапке** (`apps/web/src/app/page.tsx` mobile header).
  Bell удалён: уведомления и так агрегируются в `/messages`. Теперь в шапке справа — компактный
  pill-чипс с MapPin+городом+ChevronDown (`<button>`, обработчик селектора города — в Phase 1.x),
  а строка под поиском (ранее отдельная) полностью убрана. Экономим ~30px высоты шапки.

- **Категории получили градиентный круг** (`apps/web/src/app/globals.css` → `.cats-avito .cat-media`).
  56×56px круг с CSS-градиентом (из `--cat-*` токенов), 28px эмодзи, мягкая тень.
  Раньше был grey square 56×72 справа с плоской подложкой — теперь визуально ближе к Авито 2026.

- **«Все» убрана из мобильной сетки категорий.** На мобиле — сразу плитки по категориям
  (без «Все»-бабблов). На десктопе «Все» остаётся **только в режиме Маркет** через
  `data-market-only-strict="true"` (в Бартере CSS скрывает её; в Бартере «Все» бессмысленна,
  т. к. режим = фильтр).

- **Расширен список категорий** (page.tsx → `CATS`): добавлены `home` (Для дома и дачи),
  `kids` (Детские товары), `clothes` (Одежда и обувь), `hobby` (Хобби и отдых), `sport` (Спорт
  и туризм). Итого на мобиле в Бартере видны: Авто · Электроника · Для дома и дачи · Детские
  товары · Одежда и обувь · Хобби и отдых · Спорт и туризм · Жильё для путешествий.
  В Маркете добавляются `realty`, `job`, `services` (через снятие `data-market-only` фильтра).

- **`MarketExampleCluster` создан** (`apps/web/src/components/market-example-cluster.tsx`) —
  зеркало `BarterExampleCluster`, 8 товарных карточек с теми же фото + цена + CTA
  «Показать номер» (салатовый `--mode-cta` = #87D32C Avito-style). Показывается ТОЛЬКО в Маркете
  через существующий фильтр `html[data-mode="barter"] [data-market-only="true"] { display:none }`.
  Рядом в ленте больше не пусто ни в одном режиме до Phase 4/13.

- **`.btn-show-phone`** — новый класс в `globals.css` (для Market CTA). Цвет = `--mode-cta`,
  hover = `--mode-cta-hover`. В Бартере (если компонент случайно попадёт в DOM) деградирует
  к `--mode-accent` (оранжевый). Использует иконку `Phone` из lucide (12px).

- **ListingCard palette audit** — в `components/listing-card.tsx` промо-ring оставлен на
  `ring-accent/40` / `ring-primary/40` (бренд-palette), т. к. промо-бейджи сами по себе
  CSS-скрыты в Бартере. Палитра-лик на детальной странице (`/listing/[id]`) — отдельная
  задача #52 (orange-on-blue bug Максима).

**Файлы тронутые в Hotfix #8:**

```
apps/web/src/app/globals.css              → .cat-media gradient circle, .btn-show-phone
apps/web/src/app/page.tsx                 → CATS expanded, MapPin chip, Bell removed, Market cluster
apps/web/src/components/mobile-bottom-nav.tsx → --mode-accent bindings, /search route
apps/web/src/components/market-example-cluster.tsx → NEW (8 product cards, "Показать номер")
apps/web/src/components/listing-card.tsx → promoRing comment clarifying no leak
```

**Что НЕ сделано (остаётся в бэклоге):**

| #   | Задача                                                                                                                                 | Task ID |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 1   | `/search` мобильная страница — клон Авито 1:1 (широкий грид категорий + фильтры). Ссылки: есть git-репы Авито на GitHub, надо изучить. | #48     |
| 2   | `/messages` mobile — pinned support-chat (SupportTemplate backend уже готов), автоответы, фикс масштабирования превью.                 | #49     |
| 3   | `/favorites` mobile — фикс «вычурного» вида, стандартная 2-col grid геометрия как в ленте.                                             | #50     |
| 4   | `/profile` mobile — Avito-like аватар-header, stats, tabs; font-audit (Golos Text везде).                                              | #51     |
| 5   | Listing detail — palette-leak fix (оранжевый текст на синем фоне в Маркете).                                                           | #52     |

**Верификация Hotfix #8:**

- [ ] `npx tsc --noEmit` — чистый
- [ ] Визуальная сверка на мобиле: bottom-nav красится при переключении режима
- [ ] MapPin-чипс отображается на месте колокольчика, нет строки локации под поиском
- [ ] «Все» отсутствует на мобиле в обоих режимах; в Бартере нет realty/job/services
- [ ] MarketExampleCluster виден только при Маркете, CTA зелёный; BarterExampleCluster виден
      только при Бартере, CTA оранжевый
- [ ] Категории-плитки имеют градиентные круги, эмодзи крупнее
- [ ] Git commit + push в master

## 2026-04-19 (3) — Hotfix #7: точная сверка мобильной главной с handoff-bundle-v2/home.html

Пользователь запросил повторный handoff-бандл и попросил привести мобильную главную к реферу 1:1:
«пусть выглядит так как на референсе, включая статус бар. категории должны быть в два ряда,
а ты сделал в маркете три ряда, плюс много объявлений пропало из выдачи, плюс на референсе
есть доп кнопки, например обменять и тд, если нужно для примера сделай кластер объявлений для
обмена, чтобы раздел бартер не выглядел пустым. так же плашка "обмен без денег" можно убрать,
поскольку мы уже реализовываем этот режим».

**Что сделано (коммит `7304a32`, push to master):**

- **Шапка БЕЛАЯ** (реф `.app-header`) — акцент только у индикаторов: точка-бейдж у колокольчика +
  счётчик «12» у сердца. Убран коллажный блюр-фон, `var(--mode-primary)` больше не красит шапку.
- **Status-bar тоже белый** — `COLOR_BY_MODE` в `ModeThemeSync` теперь `{barter: '#FFFFFF',
market: '#FFFFFF'}` + pre-paint скрипт в `layout.tsx` прошит на `#FFFFFF`. Реф не использует
  цветной status-bar; оба режима = белый.
- **Категории — `cats-avito` 2-рядный горизонтальный скролл** (реф `.cats-avito`: grid
  `grid-auto-flow: column; grid-template-rows: repeat(2, 72px); grid-auto-columns: 150px`).
  Вместо старых 3+8 колонок — единая сетка из 7 плиток (Все с бабблами, Недвижимость, Работа,
  Авто, Электроника, Услуги, Жильё для путешествий). Белые плитки, текст-слева + эмодзи-справа
  на цветной подложке.
- **Убран баннер «Обмен без денег»** — режим уже реализован.
- **Карточки в Бартере получили:** swap-badge (чёрная пилюля `rgba(0,0,0,0.72)` внизу-слева
  превью), оранжевую «Хочу: …» строку, CTA «Хочу обменять» на `--mode-accent-soft`. Маркируются
  `data-barter-only="true"` и скрываются в Маркете CSS-правилом
  `html:not([data-mode="barter"]) [data-barter-only="true"] { display: none }`.
- **Мок-кластер `BarterExampleCluster`** (новый компонент) — 8 эталонных объявлений обмена
  1:1 из `home.html` (iPhone 13, Nike Air Max, Yamaha F310, диван, велосипед, книги, PS5,
  коляска). Виден только в Бартере, как временная витрина до Phase 13.
- **Новые CSS-токены** (`--mode-header-bg`, `--mode-accent`, `--mode-accent-soft`,
  `--mode-accent-hover`, `--mode-accent-ring`) переопределены для обоих режимов.
- **main теперь `bg-background`** на мобильном (убран `-mt-5 rounded-t-3xl bg-muted` занавес —
  когда шапка белая, он создавал лишнюю серую полосу).

**Верификация:** `npx tsc --noEmit` — clean (exit 0). Визуальный тест на мобиле — за пользователем.

## 2026-04-19 (2) — Mode-aware UI-система: палитра, плейсхолдер, фильтрация категорий

Пользователь попросил: при переключении Бартер↔Маркет менять **всё мобильное оформление**, а не
только режим фильтра. Реализовано полностью mode-aware через CSS-переменные + `<html data-mode="...">`.

**Чем управляется режим:**

- `localStorage.getItem('barter_mode')` — `'barter' | 'market'`, дефолт = `barter`.
- `MobileModeToggle` сохраняет режим и диспатчит `barter:mode-change` CustomEvent.
- Инлайновый pre-paint скрипт в `<head>` ставит `<html data-mode="...">` и корректный
  `<meta name="theme-color">` ДО первого кадра — статус-бар iOS/Android красится в цвет режима
  без FOUC.
- Новый клиентский `ModeThemeSync` (смонтирован в `layout.tsx`) следит за событиями и синком
  между вкладками.

**Цветовые токены (`globals.css`):**

- Default `:root` = Маркет (синий `#00AAFF` + салатовый CTA `#87D32C`, как Авито 2026).
- `html[data-mode="barter"]` = оранжевый `#E85D26` / мягкий фон `#FFEFE6`.
- `html[data-mode="market"]` = синий Avito 2026 + салатовый CTA.
- Переменные: `--mode-primary`, `--mode-primary-hover`, `--mode-primary-soft`,
  `--mode-primary-ring`, `--mode-cta`, `--mode-cta-hover`, `--mode-msg-bubble`.

**CSS-фильтры:**

- `html[data-mode="barter"] [data-market-only="true"] { display: none !important; }` —
  скрывает в бартер-режиме категории «Недвижимость», «Работа», «Услуги», «Для бизнеса».
- `html[data-mode="barter"] [data-promo-badge="true"] { display: none !important; }` —
  прячет TOP/XL/VIP бейджи (в бартере продвижения нет).

**Точки применения:**

- `apps/web/src/app/page.tsx` — мобильная sticky-шапка, категории и fade-градиент — теперь на
  `var(--mode-primary)` вместо хардкодного `#00AAFF`. Категории с `marketOnly: true` помечены
  `data-market-only="true"`. Добавлена «Для бизнеса» в CATS_TOP (только для маркета).
- `apps/web/src/components/mobile-search-input.tsx` (новый клиент-компонент) — плейсхолдер
  меняется: `Бартер → «Что обмениваем?»`, `Маркет → «Что ищем?»` (как в Авито).
- `apps/web/src/components/listing-card.tsx` — промо-бейджи TOP/XL/VIP получили
  `data-promo-badge="true"`.
- `apps/web/src/app/messages/page.tsx` — список чатов: левая 3px-граница в цвете режима
  связанного объявления (`getChatMode(listing)` с fallback на `market` до Phase 13), мини-бейдж
  «Обмен»/«Продажа». Пузырь «моих» сообщений красится тем же цветом. Поправлена «кривость»:
  аватар пира `bg-primary` → `bg-muted` (было невидно текст), online-dot `bg-secondary/10`
  → `bg-success`.

**Верификация:**

- `npx tsc --noEmit` — clean (exit 0).
- Визуальная сверка на мобиле — за пользователем после деплоя.

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
