# Barter Project Plan (Function + Design)

## Mission
Build a marketplace better than Avito: reliable mechanics, high trust, and clean premium UX.

## Non-Negotiables
- Functionality and design are equally important.
- Every feature must be testable end-to-end on desktop and mobile.
- Every UI block must look visually balanced (composition, spacing rhythm, readability).
- Prefer incremental delivery: small finished blocks over large unstable rewrites.

## Design Quality Bar (Golden Ratio Aware)
- Use proportional layout thinking (roughly 1:1.6 relationships for content blocks where applicable).
- Keep visual hierarchy clear: title > metadata > controls.
- Avoid oversized empty bubbles/cards; component width should follow content.
- Keep spacing scale consistent (4/8/12/16/24/32 rhythm).
- Ensure contrast and readability in both light/dark themes.

## Execution Loop (Mandatory)
1. Read `HANDOFF.md`, `PRODUCT_BACKLOG.md`, and this file.
2. Pick one priority block.
3. Implement API + UI + validation together.
4. Build and lint.
5. Smoke test main user scenario.
6. Update context docs with what changed.

## Current Priorities (Ordered)

Owner decision, 2026-09-05. See `docs/PRODUCT_VISION.md` for acceptance gates.

1. Functional integrity: audit core journeys, remove misleading/no-op controls,
   fix publication, listing details, favorites and chat states on mobile/desktop.
2. Search correctness: filters, ordering, pagination, empty/error states,
   then measured relevance improvements on a fixed Russian query set.
3. Real barter mechanics: exchange preferences, mutual matching, structured
   proposals and lifecycle; useful saved searches and explainable matches.
4. Trust, usability and retention: reports, anti-spam, post-deal reputation,
   performance and accessible mobile interactions.
5. External integrations, only when Maxim explicitly resumes them.

**Deferred:** Yandex ID, Yandex Maps and payment providers including YooKassa.
Maxim has no Yandex access yet. Do not request keys or treat them as blockers.
Preserve the disabled OAuth foundation and existing local authentication.
Stability and security remain release requirements throughout, not a later phase.

## Definition of Done (for each task)
- Works on desktop + mobile.
- No console/runtime errors in normal flow.
- States covered: loading, empty, error, success.
- Visual pass completed (alignment, spacing, typography).
- Context docs updated (`HANDOFF.md`, `PRODUCT_BACKLOG.md` if scope changed).

## UX Review Checklist
- Is it obvious what item/conversation/user this screen refers to?
- Are touch targets comfortable on mobile?
- Is there unnecessary visual noise?
- Are status indicators understandable without explanation?
- Does short content remain compact and clean?

## Out of Scope for Quick Iterations
- Large architecture rewrites without user approval.
- Heavy re-branding before mechanics are stable.

