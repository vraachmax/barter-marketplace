# Barter Match / Demo catalog (draft PR)

## Endpoint
`GET /match/listings/:id?limit=20` requires JWT and listing ownership.
Returns only reciprocal matches among active barter-enabled listings, including listing cards,
scores, price gap and human-readable reasons. Does **not** approve or reserve a deal.

Algorithm steps:
1. Exclude own/inactive/nonbarter listings.
2. Match explicit wanted categories, structured attributes or textual wishes.
3. Require interest from BOTH sides.
4. Require at least one shared handoff mode when both sides have configured modes.
5. Reject cash gaps that violate explicit add/accept limits.
6. Rank valid candidates by mutual relevance, same city, price proximity.
7. Add a small bounded category-affinity bonus from genuine 90-day interactions.

Limits: heuristic ranker (not trained ML), candidate scan limited to 1,000 newest listings.
To ship widely, add paged candidate retrieval, durable feedback history with accepted/rejected
offers, A/B metrics, abuse detection, explicit cold-start evaluation and optional learned
model weighting. The current signal is not proof of successful self-learning.

## Demo photo seed
`cd apps/api`
`node --test scripts/commons-demo-photos.test.cjs`
`node scripts/seed-match-demo.cjs` (dry-run, no DB writes)

To seed a disposable staging DB, with a matching `DATABASE_URL`:
`APPLY_DEMO_SEED=1 node scripts/seed-match-demo.cjs`
On Windows PowerShell: `$env:APPLY_DEMO_SEED='1'; node scripts/seed-match-demo.cjs`

The seed fetches Wikimedia Commons photo metadata at execution time. All 30 listings
must have at least two reusable-license raster images before it writes ANY database
records. It saves URLs in `ListingImage`, attribution in listing description and
`attributes.demoPhotoCredits`. Images illustrate generic/model products, never
the actual fictitious item or its condition. External Commons availability, quality
and individual model relevance require human review. Photos are not bundled in Git.

Staging-only by default. Public production requires explicit `ALLOW_PUBLIC_DEMO_SEED=1`,
but public deployment is **not recommended**: even marked fictional ads can dilute
trust. Never add demo activity to real engagement/conversion numbers.

Before running:
- Keep a database backup, correct `DATABASE_URL`, and a disposable environment.
- Check Wikimedia Commons license/author/title/photo relevance and that at least 2 photos
  per ad display correctly at app mobile sizes. Reject mismatches.
- Run API Jest/TypeScript/build and security CI.
- Run Meilisearch reindex after successful seed.
- Verify galleries, attribution and exchange preferences end-to-end.

No seed has been executed or production deployed by this PR.
