# Barter catalog v5 — published scope and rollout backlog

## Current release
- 9 verticals, 199 versioned category/subcategory nodes (append-only, no renaming old IDs).
- Dynamic server-owned attributes (text, numeric, select) per vertical/group.
- Model dependent lookup: 311 automotive makes, 5,465 models; 40 verified generation families for 6 model lines (BMW 3 Series/X5/X3, Toyota Camry, VW Golf, Mercedes C-Class). No invented generations.
- Electronics: 211 curated product models across 7 families, 26 brands.
- `GET /categories/coverage` reports exact coverage and missing verified automotive model generations.
- `GET /categories/:id/auto-fill?selected=<JSON>` proposes a human-reviewed title using ONLY selected labels. No fictional storage, power, engine, area or trim.
- `/new` now supports hierarchical category navigation and adding previously hidden server-defined attribute sections, with a user-confirmed title suggestion.

## Next measurable milestones
1. **Vehicles**: expand generation catalog using trusted manufacturer/dealer publication or permissioned vehicle catalog. Each record requires stable make/model IDs, generation/chassis code, market, start/end years and source+verification timestamp. Add facelift/body/engine only when sourced. Reject collisions. Benchmark coverage against all 5,465 model IDs. Need ongoing data acquisition; completion is not claimed in v5.
2. **Electronics**: extend brands/models to remaining device groups (cameras, appliances, drones, hardware), separate device generation, configuration, RAM/storage, chipset and release year. Every model configuration must be source-backed. Avoid treating device storage as a fixed property without vendor verification.
3. **Real estate**: branch apartment/new building/secondary/house/land/commercial into ownership, legal deal, building material, renovation, floor, utilities, layout, building completion year, land use and area. Add address suggestions only through a licensed address/geocoder provider.
4. **Remaining verticals**: expand services, special equipment, motorcycles, clothing, pets, jobs and children's goods beyond the initial templates. Build per-leaf metadata rather than globally guessed values.
5. **Editor and search**: async searchable dropdowns for >1000 options, category-specific field validation/requiredness, aliases/typos, keyboard/mobile accessibility, transactional import, structured search facet indexing and coverage tests.
6. **Data quality and legal**: documented provenance, licensing/terms, revisioned imports, additive IDs, reliable Russian labels, soft-deprecation not deletion, and periodic audit of new/retired models. Do not scrape Avito's proprietary taxonomy blindly.

## Release acceptance
- API unit tests and production TypeScript build.
- PostgreSQL 16 migration and idempotent category + automotive/electronics import rehearsal.
- Web functional tests for category browser, dependent model select, saving listings and legacy record edits.
- New select IDs never break values already stored in legacy forms.
- Validate `/categories/coverage` against database after deployment, and spot-check `/new` on mobile.
- Production should remain deployable independently of Meilisearch; re-enable and reindex Meilisearch when credentials are configured.

No claim of full Avito-level coverage is made until per-vertical coverage metrics are demonstrably complete.
