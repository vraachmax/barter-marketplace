# Barter: listing illustrations without orange ribbons (2026-10-19)

Replaced the ten existing 3D listing-placeholder visuals with clean studio compositions. Each is a 640x640 WebP produced from the corresponding user-supplied, no-ribbon artwork. No URLs, component layouts, text, category IDs, cards, carousel controls, or listing data were changed.

## Replaced files
- `apps/web/public/visual-refresh/placeholders/cars.webp`
- `apps/web/public/visual-refresh/placeholders/clothing.webp`
- `apps/web/public/visual-refresh/placeholders/furniture.webp`
- `apps/web/public/visual-refresh/placeholders/gaming.webp`
- `apps/web/public/visual-refresh/placeholders/heavy-machinery.webp`
- `apps/web/public/visual-refresh/placeholders/laptops.webp`
- `apps/web/public/visual-refresh/placeholders/miscellaneous.webp`
- `apps/web/public/visual-refresh/placeholders/real-estate.webp`
- `apps/web/public/visual-refresh/placeholders/services.webp`
- `apps/web/public/visual-refresh/placeholders/watches.webp`

The existing placeholders `headphones.webp` and `smartphones.webp` were deliberately left unchanged because no new corresponding artwork was supplied.

Usage: `apps/web/src/lib/listing-placeholder.ts` maps category titles/slugs to these existing file paths; `apps/web/src/components/listing-placeholder.tsx` displays them only when photos are unavailable. Actual seller-uploaded listing photos continue to take precedence.

PR #80 (`fix/ios-pwa-nav-category-centering-neutral-listings-2026-10-19`) is separate and was not merged, edited, or cherry-picked as part of this change. The premium 16-icon category rail, hero banners, and their assets are unchanged.

Verification: locally resized and encoded to WebP; all ten Git blobs matched the calculated SHA-1 for their source bytes before this commit. Check the live Vercel deployment and real iPhone PWA separately; a repository commit does not by itself prove visual or production acceptance.
