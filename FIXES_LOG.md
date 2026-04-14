# FIXES LOG — Бартер

История правок и решений. Используем для отката, если что-то сломается.

Формат: дата → проблема → решение → файлы → коммит.

---

## 2026-04-13

### 1. Кнопка «Объявления» вела в /profile вместо отдельной страницы
**Проблема:** Клик по «Объявления» в нижней навигации/сайдбаре переносил на /profile?tab=listings.
**Решение:** Создан standalone-роут `/listings` с собственной страницей. Все ссылки в навигации обновлены.
**Файлы:**
- `apps/web/src/app/listings/page.tsx` (новый, ~625 строк)
- `apps/web/src/components/mobile-bottom-nav.tsx` (href: '/listings')
- `apps/web/src/components/profile-sidebar.tsx` (href: '/listings')
- `apps/web/src/components/site-header.tsx` (href: '/listings')
- `apps/web/src/app/profile/profile-content.tsx` (href: '/listings')
- `apps/web/src/components/profile-archived-section.tsx` (href: '/listings?tab=ACTIVE')
**Коммит:** `fc18c48` feat: standalone /listings route + fix chat photo upload (JWT header)
**Откат:** revert fc18c48 (но это сломает и фикс фото).

### 2. Фото не отправлялись в чате
**Проблема:** При попытке отправить фото в чате запрос молча падал. Сервер отвечал 401, клиент не показывал ошибку.
**Причина:** `apiUploadImage()` и `apiUploadFile()` в `lib/api.ts` не передавали JWT Authorization-заголовок.
**Решение:** Добавлен `Authorization: Bearer <token>` в обе функции + `window.alert` при ошибке.
**Файлы:**
- `apps/web/src/lib/api.ts` (~281, ~317)
- `apps/web/src/app/messages/page.tsx` (~191-202)
**Коммит:** `fc18c48`
**Откат:** см. п.1.

### 3. Главная страница откатилась — потеряны логотип, статус-бар, тёмные категории, «Поднято», Heart, FeedLoadMore, SiteFooter
**Проблема:** Коммит `8cff745` «restore truncated files» обрезал page.tsx с 632 до 592 строк, удалив много мобильных правок.
**Решение:** Восстановлен `apps/web/src/app/page.tsx` из коммита `e7805a8` (статус-бар + баннер + поиск).
**Коммит:** `776b4d9` fix: restore homepage from regression in 8cff745
**Откат:** `git checkout 8cff745 -- apps/web/src/app/page.tsx` (но потеряете все правки).

### 4. Vercel не задеплоил коммит 776b4d9 автоматически
**Проблема:** Push прошёл на GitHub, но Vercel webhook не сработал.
**Решение:** Пустой коммит `89c8800 chore: trigger Vercel redeploy` запустил билд.
**Откат:** не нужен — это просто триггер.

### 5. На десктопе показывался дубликат логотипа+поиска под основной шапкой
**Проблема:** В `site-header.tsx` строка 191 — мобильная шапка имела `className="md:hidden"` И inline `style={{ display: 'flex' }}`. Inline-стиль побеждал класс, поэтому `md:hidden` (display:none на ≥768px) не срабатывал — мобильная шапка показывалась на десктопе.
**Решение:** Убрал `display: 'flex'` из inline-стиля, добавил `flex` в className. Теперь Tailwind корректно: flex на мобиле, hidden на md+.
**Файлы:**
- `apps/web/src/components/site-header.tsx:191`
**Коммит:** `854caac` fix: remove inline display:flex overriding md:hidden on mobile header
**Откат:** `git revert 854caac`

### 6. На мобильной версии главная — старый дизайн без многих правок
**Проблема:** Мобильная главная показывает версию из `e7805a8` (Apr 6), но у нас был WIP-стэш с улучшениями (унифицированная лента VIP+рекомендации+обычные, упрощённые имена категорий «Недвижимость» вместо «Недвижи-\nмость», новая десктопная панель категорий).
**Решение:** Применили `apps/web/src/app/page.tsx` из WIP-стэша `c310af4` (только этот файл — не весь стэш, чтобы не перезаписать фиксы /listings и messages).
**Файлы:**
- `apps/web/src/app/page.tsx` (632 → 603 строк, новый дизайн)
**Коммит:** TODO (запушить)
**Откат:** `git checkout 776b4d9 -- apps/web/src/app/page.tsx`
