# Chat and direct exchange implementation, 20–21 October 2026

Scope: the three user-supplied conversation, exchange-card and contact-details references in `approved-chat-2026-10-20/`, plus the direct-exchange requirements in `Barter_Design_Exchange_Spec_2026-10-20.html` read from the user's document. Phone hardware/status bars are excluded from application UI.

## Implemented locally

- Existing approved thread retained; exchange cards appear at their message position through a structured offer record, not parsed message text.
- Select multiple owned/peer listings, explicit direction of cash in integer kopecks, terms, expiry, and a review step. The same request key is retained after an ambiguous failed send.
- Counteroffer is a new immutable revision; the superseded offer cannot be accepted. Only the recipient accepts or declines.
- Serializable acceptance checks ownership, availability and material listing snapshot, locks listing rows and reserves every item. Unique reservation per listing prevents double acceptance. Listing content/image writes are protected during reservation. View counts do not invalidate an offer.
- Acceptance is not completion. Each party confirms their own receipt. One confirmation cannot be replayed into two. After the first confirmation, unilateral cancellation is disabled and support is available. Both confirmations close listings and release reservations.
- Expiry releases pending/unconfirmed reserves and writes an assistant notification; a minute timer and request-time checks handle expiry. A partly confirmed transfer keeps its reserve for support/completion.
- Completed exchanges grant both participants review eligibility for the received listing; incomplete exchange records do not grant a completed-deal review.
- Contact screen: seller profile, own notification setting, search within messages, shared listings, own saved shared listings, actual attached media, report and account-level block/unblock. Peer favorites are not exposed.
- Audio recording via MediaRecorder, stop, local playback, explicit send, upload and actual audio playback; microphone stops after two minutes, chat changes or unmount. Native phone link remains only when the peer has a phone.
- Creating a first owned item preserves return-to-chat intent.

## Test data

`node scripts/seed-exchange-demo.mjs` prepares two explicitly labelled test accounts/listings (iPhone 15 Pro and MacBook Air M2), a dialogue and a pending offer through the normal API. It requires `BARTER_API_URL` and a private 16+ character `DEMO_PASSWORD`; no credentials are committed and it does not run on deployment. Photo sources/licensing are recorded in `apps/web/public/demo-exchange/SOURCES.md`.

The script has been syntax-checked but **has not been run against production**. The two downloaded photos were visually inspected. Test capacities, condition and price are illustrative, not representations about a real seller's goods.

## Evidence and remaining gates

- API and Next production builds passed locally.
- 193 listing/category API tests and 94 web tests passed.
- New Chromium browser scenarios passed at 393/430 px in both themes: details, persisted mute contract, message search, exchange review/send/accept, loaded product photos and no client page errors. Screenshots reviewed internally in `apps/web/test-results/exchange/` (not committed).
- PGlite schema/migration + service smoke test passed: participant/owner/recipient guards, duplicate request, superseding revision, reservation uniqueness, protected listing mutation, independent confirmations/replay, completion/reviews, stale listing rejection, expiry/release/notification, block/unblock/mute/report.
- **PGlite serializes connections. This is not evidence of native PostgreSQL multi-process concurrency.** The unchanged `exchange-offers.cjs` must run in the PostgreSQL 16 CI service before release. Full migration chain is also a CI gate.
- Native iPhone microphone permission, keyboard, installed PWA and WebKit still need device/CI acceptance. No claim of pixel-perfect parity.
- Browser fixtures isolate API responses; they do not prove live account/database integration. Live two-account testing and seeding follow successful backend release.

## Publication authorization and CI follow-up

The initial public push was blocked pending authorization. Maxim explicitly authorized public publication, CI, release after successful checks and test seeding on 2026-10-21. PR #81 is open. Native PostgreSQL 16 migration rehearsal and exchange/message acceptance passed. Existing follow-redirects advisories were fixed with version 1.16.1; security CI passed. Browser follow-up updates assertions left behind by the prior approved thread redesign and handles the shared send/record action. Production release and live test seeding are still pending at this checkpoint.
