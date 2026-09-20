# Bubble B: логотип и home-screen icon

PR #30 опубликован. Merge a8746ca879a4f8c8deea7cd69725e7e8644f694f.
Vercel: https://vercel.com/vraachmaxs-projects/web/KF6hcTS715QtVTd5fKFqTPDCijCk (success).

Используются оригинальные файлы Максима из barter-icons-ready.zip и PNG-вложений.
SHA-256:
- mark 1024: a138841c91aaeb80ce590b7c8a042f829ddb328269fbac6e7dd9d7394a232e52
- Apple icon 180: 744c2063532dbfacac73f8576d5bef2298ffd006776eb3e8cd3a91e129b9e13b
- icon 192: 63f042011e3dbb055afee6b75ad2d586d8bc6e14806b5625994edb13f3410bd2
- icon 512: d679fac232c0e35618e3c3ce6a3618321eefb206d50b84b9daeac8b0ac7f97bc
- maskable 512: 6fac349ce9a7f7f522dcfc2619698b3bdafb42ba00b20c77dae4d8ecfd495d29

Сайт: общий BarterHomeLogo, прозрачный знак через next/image и БАРТЕР текстом.
Сохранены размеры контейнера, desktop/mobile переходы и нижний хаб.
Apple: /apple-touch-icon.png?v=bubble-b-1, 180x180 RGB.
Manifest: /manifest.json?v=bubble-b-1, standalone, scope/id '/', БАРТЕР,
иконки /brand/bubble-b/icon-192.png, icon-512.png и icon-maskable-512.png.
Favicon: новый app/favicon.ico и 32/48 PNG; старая SVG-ссылка больше не используется.
Палитра UI и иллюстрации категорий не менялись.

CI: https://github.com/vraachmax/barter-marketplace/actions/runs/35531003136
69 unit/regression tests, build/TypeScript, 20 browser configurations: success.
Layout suite проверяет загрузку logo, единственную Apple-ссылку, PNG-размеры/HTTP 200,
manifest/maskable. CI-снимок 440px обеих тем просмотрен.
Audit 35531003597: success. Отдельный lint не запускался.

Физический iPhone и обновление уже добавленного ярлыка не проверены.
Добавление в Safari: открыть сайт → Поделиться → На экран «Домой» →
включить Open as Web App, если показано → Добавить.
Источник: https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios
Не обещать автоматического обновления старой иконки; для новой установки использовать
актуальную страницу. Service worker/offline режим в рамках смены логотипа не добавлялся.
