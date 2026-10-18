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

# Visual refresh QA — 2026-10-17

final result: blocked

Source: supplied archive home-light-v2 and desktop screenshots. Actual implementation
could not be captured: cloud browser refused terminal.local under its URL policy.
No policy bypass attempted. No pixel-fidelity or physical-iPhone claim is made.

Implemented draft: home, shared cards, dock, combined catalog mode, desktop rail.
Not complete: reference-faithful hero composition and logo, full detail/chat/profile/
creation screens and analytics. The reference analytics values are fictional and
were not copied into the application. Dark/mobile overflow and keyboard remain unverified.

Builds: Next production and Nest pass. Tests: 87 web and 35 targeted API pass.
Browser acceptance suite updated but unexecuted. Production remains unchanged.

---

## Previous QA record (before this refresh)

# Crystal Catalog implementation QA • 2026-09-05

### Toggle follow-up, 2026-09-06

Owner reports a much better homepage but stuttering mode selection. Code showed
immediate global theme mutation versus server-delayed active link. Replaced with
an optimistic, transform-based 200 ms indicator and commit-time preference sync.
Reduced-motion supported; modifier/new-tab navigation no longer changes this tab.
Lint, 15 existing web tests and build checked; no animation FPS/browser measurement.
Still needs device verification: slow navigation, rapid toggling, history, new tab.

## Update 2026-09-06

The owner viewed the previous preview and liked the direction, requesting the
Market/Barter control and image placeholders. Implemented both plus a shared
mobile/desktop listing editor. 92 API tests and 15 web tests pass; Next production
build and API TypeScript pass. Additional local HTTP SSR smoke was stopped
without a result, and is NOT a passing check. No new browser screenshots or
authenticated/mobile verification: preview protection remains unchanged (403).
Barter filtering requires a separately authorized API release. With the old API,
the new web displays an explicit unsupported message instead of unfiltered items.
Final visual acceptance remains blocked, not pixel-perfect certified.

**final result: blocked**

## Target and scope

Maxim selected the FIRST displayed concept (message `1`). Source visual truth:
`/workspace/scratch/21e2a3660a4e/generated_images/exec-320b45f4-f84d-45f4-a5e4-653cc753cbbe.png`.
Source opened and inspected. Target mobile CSS viewport:390×844; intended desktop:1440px.
The selected image's one-row categories are intentionally changed to TWO rows per
Maxim's explicit requirement. Existing mobile hub dimensions,5 destinations,
active indicator position and ring width are preserved; only surface/color/focus
and reduced-motion styles change.

## Browser evidence

Implementation screenshot: **unavailable**. No density normalization or paired
visual comparison was performed. Local preview was refused; two preview startup
attempts failed in the restricted preview runtime because the adapter could not
access the existing checkout/runtime outside its root. No fallback browser or
alternate browser control was used. Preview-only fixture server/adapter are
outside the repo; no production data was modified.

Follow-up, 2026-09-05: GitHub reports a successful Vercel deployment status for
commit `0d0d5b2cfa738adb9fac7f0fef80221c43381b48`. The branch preview is
[available here](https://web-git-feat-unified-design-search-plan-vraachmaxs-projects.vercel.app),
but opening it redirects to Vercel login. The connected Vercel workspace lookup
also returned 403. Deployment protection was not changed or bypassed. A successful
deployment status is not a visual pass; implementation captures remain unavailable.

## Findings

- [P1] Browser visual verification blocked. Need working preview of this branch;
  capture390×844 and compare against the selected source in one comparison input.
- [P2] Native filter dialog, focus return/Escape, horizontal category scrolling,
  touch layout360/390/430px, dark/light and both accent palettes need interactive QA.
- [P2] Production/authenticated paths and live API pagination remain unverified.

## Required fidelity surfaces

- Fonts/typography: existing local Golos retained. Prices18/20px; titles14/15px.
  Actual wrapping/zoom/font rasterization:unverified.
- Spacing/layout: shared square images, two-column mobile grid, two-row categories,
  original hub geometry retained by source diff. Rendered measurements:unverified.
- Colors/tokens: white content canvas, blue/orange accent palettes, darker solid
  CTA colors for white labels, shared glass token set and dark/fallback values.
  Actual composited contrast and materials:unverified.
- Image quality:9 generated192px WebP category illustrations from a measured3×3
  atlas; real existing brandSVG used. Listing photos continue to come from API.
  No generated product listings are inserted into application source.
- Copy/content: fake favorite count12 removed; city/filter controls have actual
  forms. No fake exchange wishes or demo results added. Search mode selector from
  concept is not reintroduced as a fake listing filter; accent preferences are
  explicitly named colors in the filter panel.

## Source checks

Production build, focused lint and6 existing unit tests are recorded in HANDOFF.md.
An additional HTTP smoke process could not be resumed because network approval
was cancelled; its results are not counted as passing. Native dialogs supply
focus/Escape semantics, but actual browser behavior remains a test gap.

## Comparison history

No valid browser capture available; no visual pass or claim of1:1 fidelity.
No full-view or focused-region comparison possible yet.

## Next verification checklist

1. Open branch preview with staging/API data, capture390×844 and desktop.
2. Compare source+implementation side by side; record intentional data differences.
3. Test filters/city/range error/Escape, search and preserved filters, category links,
   load-more retry/dedup, root-hub navigation and nested back.
4. Check widths360/390/430/768/1440, light/dark, orange/blue, reduced motion,
   keyboard,200% zoom, safe area, console errors. Fix P0–P2 before marking passed.
