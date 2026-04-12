# ИНСТРУКЦИИ ДЛЯ НОВОЙ СЕССИИ

> **Скопируй всё содержимое этого файла и вставь как первое сообщение в новый чат.**

---

## 1. КОНТЕКСТ ПРОЕКТА

Проект **Бартер** — замена Авито. Monorepo: `apps/api` (NestJS) + `apps/web` (Next.js 16 + React 19 + Tailwind 4).
GitHub: `vraachmax/barter-marketplace`, ветка `master`.
Vercel: `web-one-blond-66.vercel.app`.

**Прочитай файлы перед началом работы:**
```
Read HANDOFF.md
Read PRODUCT_BACKLOG.md
```

---

## 2. НЕЗАВЕРШЁННАЯ РАБОТА — ЗАПУШИТЬ 2 ФАЙЛА

В прошлой сессии изменили 5 файлов. 3 запушены, **2 НЕТ**:

| Файл | Статус | Размер base64 |
|------|--------|---------------|
| `apps/web/src/app/profile/settings/settings-content.tsx` | ❌ НЕ ЗАПУШЕН | ~75KB (11 чанков) |
| `apps/web/src/app/profile/profile-content.tsx` | ❌ НЕ ЗАПУШЕН | ~88KB (13 чанков) |

**Что в этих файлах:**
- `settings-content.tsx` — полный мобильный редизайн настроек в стиле Avito (аккаунт, уведомления, приватность, приложение, danger zone). Только секция `md:hidden`, десктоп не тронут.
- `profile-content.tsx` — фикс вкладки "Объявления" (раньше вела в настройки, теперь в `/profile/listings`), + модалка пополнения кошелька с пресетами [100, 300, 500, 1000, 2000, 5000] ₽.

**Файлы лежат локально в sandbox**, их нужно прочитать и запушить.

---

## 3. МЕТОД ПУША (git из sandbox не работает!)

Git push из sandbox невозможен — нет сетевого доступа. Используем **Chrome MCP браузер**:

### Алгоритм для каждого файла:

```
Шаг 1: Прочитать файл из sandbox
  Read apps/web/src/app/profile/settings/settings-content.tsx

Шаг 2: Открыть edit-страницу на GitHub через Chrome MCP
  navigate → https://github.com/vraachmax/barter-marketplace/edit/master/apps/web/src/app/profile/settings/settings-content.tsx

Шаг 3: Закодировать содержимое файла в base64, разбить на чанки по ~7000 байт

Шаг 4: Отправить чанки в браузер через javascript_tool:
  window.__b64 = '';
  window.__b64 += 'чанк1';
  window.__b64 += 'чанк2';
  ... (все чанки)

Шаг 5: Декодировать и вставить в редактор:
  javascript_tool →
    const decoded = atob(window.__b64);
    const cmContent = document.querySelector('.cm-content');
    cmContent.focus();
    document.execCommand('selectAll');
    document.execCommand('insertText', false, decoded);

Шаг 6: Закоммитить:
  - Кликнуть кнопку "Commit changes..."
  - Подождать диалог
  - Вписать commit message через nativeInputValueSetter
  - Кликнуть зелёную "Commit changes"
```

### Важно:
- CodeMirror 6 — `cmEl?.cmView?.view` dispatch НЕ работает, юзать `execCommand`
- Чанки отправлять по одному через `javascript_tool`, каждый `window.__b64 += '...'`
- Если файл большой (>50KB), ОБЯЗАТЕЛЬНО чанковать, иначе браузер обрежет

---

## 4. ЭКОНОМИЯ ТОКЕНОВ — ИСПОЛЬЗУЙ СУБ-АГЕНТОВ

**КРИТИЧЕСКИ ВАЖНО**: Для рутинной работы создавай sub-агентов с `model: "haiku"` или `model: "sonnet"`, НЕ opus.

Примеры когда юзать агентов:
- Чтение больших файлов и подготовка base64 чанков → `Agent(model: "sonnet")`
- Поиск по коду → `Agent(subagent_type: "Explore", model: "haiku")`
- Верификация что файл запушился → `Agent(model: "haiku")`

Opus только для принятия решений и сложной логики.

---

## 5. ПРАВИЛА РАБОТЫ

- **Мобильная версия ТОЛЬКО** — все изменения в секциях `md:hidden`, десктоп (`hidden md:block` / `hidden md:grid`) не трогаем
- **Дизайн-токены**: иконки `text-[#0088FF]`, текст `text-[#1a1a1a]`, карточки `rounded-2xl bg-white p-4`, кнопки `from-[#0088FF] to-[#0066DD]`
- **TypeScript strict**, no `any`, Tailwind only
- **После задачи**: обновить HANDOFF.md

---

## 6. ПОРЯДОК ДЕЙСТВИЙ

1. ✅ Прочитать `HANDOFF.md` и `PRODUCT_BACKLOG.md`
2. ⚠️ **Запушить `settings-content.tsx`** через Chrome MCP (метод выше)
3. ⚠️ **Запушить `profile-content.tsx`** через Chrome MCP (метод выше)
4. Проверить Vercel билд на `web-one-blond-66.vercel.app`
5. Обновить `HANDOFF.md` (убрать ❌, поставить ✅)
6. **Phase 1, задача 1.1** — Переделать шапку на shadcn/ui
7. Далее: 1.2 (карточки ленты), 1.3 (карточка объявления), 1.4 (формы), 1.5 (кабинет), 1.6 (чат)

---

## 7. ЕСЛИ CHROME MCP НЕ ПОДКЛЮЧЕН

Скажи мне — я подключу. Или как альтернатива: скажи мне команды для терминала:
```bash
cd "C:\Users\vraac\OneDrive\Рабочий стол\тnew project"
git add apps/web/src/app/profile/settings/settings-content.tsx apps/web/src/app/profile/profile-content.tsx
git commit -m "feat: mobile settings redesign + wallet modal + listings fix"
git push origin master
```
