# Barter Web UI kit

Recreation of the Barter (Бартер) marketplace web app — sticky header with category mega-menu trigger, search, category gradient strip, listing feed with promo-ringed cards, listing detail with buy-box aside, messages, and profile.

## Navigate

Open `index.html`. Click a listing card to open the detail view; use footer/nav patterns and the "Написать сообщение" CTA on the detail page for the chat modal. Page state persists in `localStorage.barter_page`.

## Files

- `index.html` — app shell, Babel/React CDN loader
- `Icon.jsx` — inline SVG lucide glyphs (strokeWidth 1.8, 18–24px)
- `Header.jsx` — utility bar + main row + logo + search + region selector
- `Categories.jsx` — 40×40 gradient category tiles (from `category-gradient-icon.tsx`)
- `ListingCard.jsx` — feed card with VIP/TOP/XL promo rings (from `listing-card-visuals.ts`)
- `ListingDetail.jsx` — two-column detail page + Buy Box aside + quick-message modal
- `Pages.jsx` — Home feed, Messages, Profile, Footer
- `mockData.jsx` — 12 stock listings in Russian
- `App.jsx` — router, navigation state

## Conventions copied from source

- Colors: `#C8523A` terracotta primary, `#E8A87C` peach secondary, `#3D7A5E` deep-green accent, `#FAF6F1` warm bone page, white cards with `rounded-xl` and `shadow-[0_1px_4px_rgba(0,0,0,0.08)]`
- Promoted listings: `inset 0 0 0 1px rgba(61,122,94,0.35)` (VIP/TOP) or peach for XL
- All copy is Russian, sentence-case, second-person formal
- Icons are lucide-style at strokeWidth 1.8

## Notes / simplifications

- Replaced `next/font` Inter with Google Fonts
- Listing thumbnails use gradient placeholders with emoji, not real photos
- No real auth — profile state is hardcoded to "Иван Кузнецов"
- No API; all data is in `mockData.jsx`
