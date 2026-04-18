# Barter Design System

**Barter (Бартер)** — Russian-language marketplace for used goods, services and barter-style exchange. Positioned as a cheaper, faster alternative to Avito: free listings for individuals, promotion tools priced ~2× cheaper than the incumbent.

Product surface is a **single responsive web app** (`apps/web`) plus an API. There is no native mobile app yet — the "mobile" experience is a responsive variant of the site with a fixed bottom tab bar.

---

## Sources used to build this system

- **Repo:** `github.com/vraachmax/barter-marketplace` (default branch `master`)
- **Spec:** `FULL_AVITO_SPEC.md` — full functional spec
- **Architecture notes:** `CLAUDE.md` — stack, UI rules, current phase
- **Styles:** `apps/web/src/app/globals.css` — tokens
- **Components (shadcn/ui on Base UI):** `apps/web/src/components/ui/*`
- **Page shell:** `site-header.tsx`, `site-footer.tsx`, `mobile-bottom-nav.tsx`, `mega-menu.tsx`
- **Brand:** `apps/web/public/brand/logo_light.svg`, `logo_dark.svg`, `logo_icon.svg`

Readers without repo access can still use everything in this folder — assets, tokens, and UI kit components are self-contained here.

---

## Stack (for context when writing production code)

- Monorepo (npm workspaces): `apps/api` (NestJS + Prisma + Postgres + Meilisearch) + `apps/web`
- Web: **Next.js 16, React 19, Tailwind CSS v4, shadcn/ui (Base UI), lucide-react, TypeScript strict**
- shadcn components live under `apps/web/src/components/ui/*`
- Theme toggle via `data-theme="light|dark"` on `<html>`
- `server components` by default

---

## Index (what's in this folder)

| Path | What |
|---|---|
| `README.md` | This file — context, content & visual foundations, iconography |
| `SKILL.md` | Claude Code / Skills-compatible entry point |
| `colors_and_type.css` | CSS variables for color, type, radius, shadow, spacing |
| `assets/` | Brand logos (light / dark / icon) |
| `ui_kits/web/` | React UI kit recreation of the Barter web app |
| `preview/` | Small HTML cards that populate the Design System tab |

---

## CONTENT FUNDAMENTALS

### Language
All UI copy is **Russian**. The brand name is **Бартер** in Cyrillic (rendered as "Barter" only in the wordmark and URLs). Documentation can be in English; product surfaces never are.

### Voice & tone
- **Direct, unceremonious, utilitarian.** No warmth-as-marketing, no exclamation marks. This is a classifieds site — users arrive with a task (buy, sell, find).
- **Imperative verbs on CTAs.** "Разместить объявление", "Написать сообщение", "Поднять просмотры", "Войти", "Показать телефон". Never "Давайте..." or softened phrasings.
- **Second person formal (вы), lowercase.** "Для вас", "Вы искали", "Вы смотрели". Never "ты".
- **Labels are nouns, not sentences.** Menu items: "Мои объявления", "Заказы", "Мои отзывы", "Избранное", "Кошелёк", "Сообщения", "Настройки". No articles, no endings.
- **Meta info is terse.** `"Осталось дней"`, `"На Barter с 2025"`, `"Отвечает за несколько часов"`, `"Документы проверены"`.
- **No emoji in the product UI.** Ever. Icons come from lucide-react. Emoji show up only in moderated user-generated content.

### Casing
- **Sentence case** for buttons, menu items, cards. "Разместить объявление", not "РАЗМЕСТИТЬ ОБЪЯВЛЕНИЕ".
- **UPPERCASE with letter-spacing** only for small eyebrow labels in the footer: `"ПОКУПАТЕЛЯМ"`, `"ПРОДАВЦАМ"`, `"ИНФОРМАЦИЯ"` (11px, bold, tracking ~0.06em).
- **Brand wordmark** in the logo mixes a lowercase Cyrillic "Бартер" with three circular marks.

### Microcopy tropes (lift these)
- Prices are plain: `"19 ₽"`, `"1 990 ₽"`. Promoted tiers are named like commodities: "Поднятие ×2", "Поднятие ×5", "XL-объявление", "VIP-размещение", "Турбо-продажа".
- Trust signals are short noun phrases with a check or shield glyph: "Документы проверены", "Телефон подтверждён".
- Empty states prefer a one-liner plus a CTA, not an illustration with a paragraph: "Пока нет объявлений" + `[Разместить объявление]`.
- Date/location meta stacks as `"Сегодня, 14:30 · Москва, Басманный"`.

### Numbers & units
- Ruble: `₽` symbol, always space-separated thousands: `1 290 ₽`.
- Multiplier promos use the math × sign: `×2`, `×5`, `×10`.
- Counts are integers with no `pcs`: `"23 просмотра"`, `"5 в избранном"` (Russian plural rules).

---

## VISUAL FOUNDATIONS

### Color vibe
**Clean, white, utilitarian.** Grey canvas (`#F2F3F5`) with stacked white rounded "section-white" cards. One blue for interaction (`#007AFF`), orange (`#FF6F00`) reserved for paid-promotion accents (VIP/TOP rings on listings). Everything else is neutral grey.

There are **no gradient backgrounds** on the shell. Gradients appear only as **40×40 category tiles** — small rounded squares behind a white lucide icon. Each category has its own 135° two-stop gradient (auto = pink→red, electronics = teal→indigo, home = green mint, etc). This is the brand's single decorative move.

### Typography
- **Inter** (`next/font/google`, Latin + Cyrillic subsets). Fallback `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`.
- Body is **14px / 1.5**. Prices and card titles step up to **16px bold**. Utility bar is 12px. Bottom nav labels are 10px.
- Negative tracking (~-1%) on headings; default on body.
- Weight range: 400 regular, 500 medium, 600 semibold, 700 bold. No 300/light.

### Spacing & layout
- Container: `max-w-7xl` (1280px), horizontal padding `24px` desktop / `16px` mobile.
- Vertical rhythm: **8px grid** (gaps of 8/12/16/24/32).
- Fixed **sticky header** (`z-[100]`) with a 36px utility row + 56px main row on desktop, 56px single row on mobile.
- Fixed **mobile bottom nav** at `z: 1000`, 5 items, 24px icons, 10px labels. Active item is `#00AAFF` and filled.

### Cards
- Listing cards: `rounded-xl` (12px), white background, `shadow-[0_1px_4px_rgba(0,0,0,0.08)]`. On hover they step up to `shadow-[0_4px_16px_rgba(0,0,0,0.1)]` with a 150ms transition.
- Promoted listings add a **1px ring** in `#FF6F00/30` (VIP/TOP) or `#007AFF/30` (XL).
- Section blocks use `rounded-2xl` (16px) and sit flush on the grey page bg with small 8px gaps between them.

### Shadows
- `--shadow-card: 0 1px 4px rgba(0,0,0,0.08)` — resting listing card
- `--shadow-hover: 0 4px 16px rgba(0,0,0,0.10)` — hover
- `--shadow-menu: 0 4px 24px rgba(0,0,0,0.12)` — profile dropdown, mega menu
- `--shadow-nav-top: 0 -2px 12px rgba(0,0,0,0.04)` — mobile bottom nav

No inner shadows, no coloured shadows.

### Borders & dividers
- Default border: `1px solid #E8E8E8` (or `#F0F0F0` for softer utility-bar rule).
- Inputs: `border-[#D1D5DB]`, rounded `lg` (8px), transparent bg, focus ring `ring-3 ring-ring/50`.
- Dividers inside menus are single 1px lines — never double, never dashed.

### Corner radii
| Element | Radius |
|---|---|
| Pill badges | 9999px (fully rounded) |
| Buttons (default) | 8px (`rounded-lg`) |
| Inputs | 8px |
| Mobile search bar | 22px (pill on field) |
| Category gradient tile | 10px |
| Listing cards | 12px (`rounded-xl`) |
| Section surfaces | 16px (`rounded-2xl`) |

### Backgrounds & imagery
- **No full-bleed hero photography** on the current product. Listing thumbnails are product photos the user uploaded, always cropped to `object-fit: cover`.
- Dark mode adds a subtle `filter: brightness(0.92) saturate(0.94)` to listing thumbnails so they don't fight the dark surface.
- No textures, no repeating patterns, no grain.
- No illustrations beyond the brand mark and lucide icons.

### Animation
- **Minimal.** A single `fadeInUp` keyframe (opacity + 12px translateY, 0.4s ease-out) for late-arriving content.
- Mega menu uses `megaFadeIn` / `megaSlideIn` (8px translateY).
- Everything else is `transition: all 150ms ease` — colors and shadows only. No spring physics, no bouncy scales.
- Mobile: no page transitions, no sliding drawers.

### Hover / press states
- **Text links:** color flips to `#007AFF` on hover, `#0066DD` on active press. No underline by default; `link` variant uses `underline-offset-4 hover:underline`.
- **Primary button:** `bg-[#007AFF] hover:bg-[#0066DD] active:translate-y-px`.
- **Outline/ghost buttons:** background fades in to `hover:bg-muted` with `aria-expanded:bg-muted` for open dropdowns.
- **Cards:** shadow steps up on hover; no scale, no lift.
- **Bottom nav active:** icon fills with primary color, label weight jumps to 700.

### Transparency & blur
- Profile dropdown and mega menu use a solid white surface — no glass/blur.
- Dark overlays on thumbnails are a **15% black top-to-bottom gradient** (`.listing-thumb-shade`) to keep meta legible.
- No backdrop-filter anywhere in the production CSS.

### Dark mode
First-class. Toggled via `data-theme="dark"` on `<html>` (synced to `localStorage["barter_theme_pref"]`). Surfaces become `zinc-950` / `zinc-900`; primary blue brightens to `#4DA6FF`. Every color token has a dark variant.

### Layout rules (fixed elements)
- Header: `position: sticky; top: 0; z-index: 100`.
- Mobile bottom nav: `position: fixed; bottom: 0; z-index: 1000`; body gets `padding-bottom: 72px` on mobile to compensate.
- Profile menu and mega menu use `absolute` anchored to the header with `z: 300`+.
- `.page-content` reserves `60px + safe-area` top and `72px + safe-area` bottom for iOS safe insets.

---

## ICONOGRAPHY

**Primary icon system: [lucide-react](https://lucide.dev).** All glyphs in the product come from lucide, rendered at **14–24px with strokeWidth `1.8`** (this is critical — default 2.0 strokes look noticeably heavier and break the feel).

Common icons observed in use:
- Nav / shell: `Search`, `Heart`, `MessageCircle`, `Bell`, `User`, `Plus`, `MapPin`, `LayoutGrid`, `SlidersHorizontal`, `ShoppingCart`
- Profile menu: `Tag`, `Package`, `Star` (filled for ratings), `Wallet`, `Settings`, `LogOut`
- Categories: `Car`, `Building2`, `Tv`, `Home`, `Trophy`, `Shirt`, `Briefcase`, `Wrench`, `Baby`, `Flower2`
- Footer: `CheckCircle`, `HelpCircle`, `FileText`, `Building2`

**Filled vs stroke:** almost all icons are stroke-only. Exceptions are the **active bottom-nav icon** (filled with primary color) and the **rating star** (`fill="currentColor"`).

**Category gradient tiles** (`CategoryGradientSquare`, `category-gradient-icon.tsx`): 40×40 rounded (`radius: 10px`), 135° linear gradient, white lucide icon at 22px `strokeWidth=1.8` centered. This is the one place the design uses colour decoratively — adopt it when building category navigation.

**Logo:** three overlapping rounded blobs in blue/green/amber gradients (see `assets/logo_icon.svg`) paired with the wordmark "Бартер" in a bold grotesque. A `light` and `dark` wordmark SVG exists; the dark version is used in dark theme. The standalone icon-mark works as a favicon and mobile header lockup.

**No emoji. No unicode glyph icons** (no `→` as an arrow, no `★` as a rating). Always lucide.

**For this design system:** load lucide via CDN in HTML previews:
```html
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
```
or use the React package in JSX: `import { Search } from 'lucide-react'` (already pulled via the official lucide CDN in our kit's JSX via a thin shim, since we render icons from an inline sprite).

---

## Caveats & substitutions

- **Fonts:** the repo uses Inter via `next/font/google`. We load it from Google Fonts directly (no local `.ttf`), which is the same source but not offline. Swap in the codebase's local variable font if offline delivery matters.
- **The app defines two "primary" blues.** `globals.css` has `--color-primary: #00677D` (teal) but every component file uses `#007AFF`. We follow the component-file convention; if the teal is the intended rebrand, flip `--brand-primary` in `colors_and_type.css` and the kit updates automatically.
- **Base UI / shadcn implementations** are simplified in the UI kit — they render like the originals but are not API-compatible drop-ins.
- **No native mobile app exists** in the repo; the "mobile" preview is the responsive web app.

---

## Index — what lives in this folder

| Path | What it is |
| --- | --- |
| `README.md` | This file — brand brief, content + visual foundations, iconography |
| `SKILL.md` | Agent-Skill manifest for reusing this system in Claude Code |
| `colors_and_type.css` | All CSS variables — base tokens + semantic classes (h1, body, etc) |
| `assets/` | Logos (`logo_light.svg`, `logo_dark.svg`, `logo_icon.svg`) + brand marks |
| `preview/*.html` | Design-System tab cards — colors, type, components, spacing, brand |
| `ui_kits/web/` | React recreation of the web app (home, listing detail, messages, profile) — open `ui_kits/web/index.html` |

No slide template was provided so no `slides/` folder exists.
