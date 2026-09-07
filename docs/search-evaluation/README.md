# Search quality evaluation v1

## Database guard migration validation (2026-09-07)

`20260907090000_search_guard_fields` adds two derived fields and a GIN index.
An INSERT/UPDATE trigger owns both fields, including when a caller tries to write
them directly. Existing rows are backfilled without changing their timestamps.
API filtering now uses these fields before count/skip/take for every sort.

Validation uses a temporary PGlite installation outside the repository:

```sh
npm install --prefix /tmp/barter-pg-validation --ignore-scripts --no-audit --no-fund @electric-sql/pglite@0.5.8
npm run build --workspace=@app/api
BARTER_PGLITE_MODULE=/tmp/barter-pg-validation/node_modules/@electric-sql/pglite/dist/index.js node scripts/verify-search-migration.mjs
```

Passed on embedded PostgreSQL 18.3: migration/backfill, insert/update, derived-field
tampering, JS/SQL parity on 36 examples, correct count of 450 matches among 900 rows,
20 results at offset 400, GIN index existence. Not an EXPLAIN/load benchmark.
The in-memory benchmark now models the derived fields with `searchIndexFields`;
the separate SQL test checks parity against actual migration functions.

**Release requirement:** rehearse on isolated PostgreSQL 16 with the existing full
migration chain, check locale/tokenization and backup/rollback. No live migration
has run. Migration takes a table lock and backfills all rows in one transaction;
measure lock duration before release. Deploy schema before this API version.
Previous API code can run with the added columns/trigger; a code rollback need not
drop derived fields. Do not remove fields while this API version is running.

Sources: [PostgreSQL 16 Unicode normalization](https://www.postgresql.org/docs/16/functions-string.html),
[GIN array support](https://www.postgresql.org/docs/16/gin.html).

Offline fixtures only. No real listings, users, secrets, network calls or database
writes. Judgments are authored development hypotheses, not user research.

## Run

From repository root:

```sh
npm run build --workspace=@app/api
node scripts/evaluate-search.mjs
node scripts/evaluate-search.mjs --json
node --test scripts/evaluate-search.test.mjs
```

The evaluator instantiates the compiled **actual ListingsService** with an
in-memory Prisma substitute and Meilisearch disabled. It exercises service query
construction, current fallback ranking and card mapping. The substitute implements
the query operators used here and rejects unknown ones. It does not reproduce
PostgreSQL collation, query planning, live data, index typo handling or concurrency.
Always rebuild before running. Do not describe this as a production benchmark.

## Corpus and measurements

60 queries: 18 families × exact/alternative/typo variants, plus 6 negative/filter
cases; 30 synthetic listings including adversarial distractors. Some distractors
deliberately use nonexistent models to expose substring leakage, not to describe
real products. Relevant document gets grade 3, other fixtures grade 0. This first
version has one relevant document per positive query, so Recall@20 is a hit rate;
future corpus versions need multiple relevant documents and intermediate grades.

Development: 48 queries. Holdout: 12 queries from four separate families. The same
author constructed and inspected both; this is not blind independent validation.
After tuning against these results, retire this holdout and create a fresh one.

- nDCG@10: order of useful results, using exponential gain `2^grade - 1`.
- Recall@20: retrieved relevant fixtures divided by known relevant fixtures.
- Forbidden-query count: queries returning explicitly marked wrong-model/accessory
  fixtures anywhere in their first 20 results, not the number of bad listings.
- Negative failures: unwanted nonempty result for a query expected to be empty.
- Empty count includes intentionally empty queries. Don't equate it with errors.

Negative queries have no nDCG/recall denominator and are excluded from their means.
Exit 0 means evaluation completed, **not** that search quality passed. Harness tests
validate consistency and reproducibility, not relevance targets. No p95/live UX
claims are supported. Keep the baseline unchanged when evaluating improvements.

## Sources and next actions

- [Baymard query types](https://baymard.com/blog/ecommerce-search-query-types):
  separate model, category, feature and need-based scenarios.
- [Elastic rank evaluation](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/search-rank-eval):
  use representative queries and relevance judgments for repeatable evaluation.

Next: protected numeric/model tokens; distinguish accessories from requested
products; normalize Russian ё/е and word forms; controlled typo correction.
Then replace the in-memory execution with an isolated PostgreSQL/Meili test
environment and obtain user-reviewed judgments on a larger realistic corpus.
