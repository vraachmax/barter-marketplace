// Isolated in-memory PostgreSQL via PGlite. Never connects to DATABASE_URL.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const { PGlite } = await import(process.env.BARTER_PGLITE_MODULE ?? '@electric-sql/pglite');
const require = createRequire(import.meta.url);
const { searchIndexFields } = require('../apps/api/dist/search/search-eligibility.js');
const corpus = JSON.parse(readFileSync(new URL('../docs/search-evaluation/corpus.json', import.meta.url), 'utf8'));
const db = new PGlite();
try {
  await db.exec('CREATE TABLE "Listing" (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now())');
  await db.query('INSERT INTO "Listing" (id,title,description) VALUES ($1,$2,$3)', ['old', 'Чехол Samsung S24', '']);
  const before = (await db.query('SELECT "updatedAt" FROM "Listing" WHERE id=$1', ['old'])).rows[0].updatedAt;
  await db.exec(readFileSync(new URL('../apps/api/prisma/migrations/20260907090000_search_guard_fields/migration.sql', import.meta.url), 'utf8'));
  const old = (await db.query('SELECT * FROM "Listing" WHERE id=$1', ['old'])).rows[0];
  assert.equal(old.searchAccessory, true);
  assert.ok(old.searchTokens.includes('s24'));
  assert.equal(String(old.updatedAt), String(before));

  const examples = [...corpus.families, ...corpus.distractors,
    { title: 'НОВЫЙ СИЛИКОНОВЫЙ ЧЕХОЛ для iPhone 14' },
    { title: 'Защитное стекло для iPhone 14' },
    { title: 'iPhone 14 с чехлом' },
    { title: 'ＰＳ５ ПС5 Ёлка 205/55 R16' },
    { title: 'Без модели', description: 'Модель S24' },
    { title: '' },
  ];
  for (const [i, item] of examples.entries()) {
    const expected = searchIndexFields(item);
    const inserted = (await db.query('INSERT INTO "Listing" (id,title,description) VALUES ($1,$2,$3) RETURNING "searchTokens","searchAccessory"', [`new-${i}`, item.title, item.description ?? ''])).rows[0];
    assert.deepEqual(inserted, expected, item.title);
  }
  await db.query('UPDATE "Listing" SET title=$1, description=$2 WHERE id=$3', ['Samsung S25', 'Новая модель', 'old']);
  const updated = (await db.query('SELECT "searchTokens","searchAccessory" FROM "Listing" WHERE id=$1', ['old'])).rows[0];
  assert.deepEqual(updated, searchIndexFields({ title: 'Samsung S25', description: 'Новая модель' }));
  await db.query('UPDATE "Listing" SET "searchTokens"=$1,"searchAccessory"=true WHERE id=$2', [['fake'], 'old']);
  assert.deepEqual((await db.query('SELECT "searchTokens","searchAccessory" FROM "Listing" WHERE id=$1', ['old'])).rows[0], updated);

  await db.exec('DELETE FROM "Listing"');
  await db.exec(`INSERT INTO "Listing" (id,title,description)
    SELECT lpad(i::text,4,'0'), CASE WHEN i % 2 = 0 THEN 'Samsung S24' ELSE 'Samsung S240' END, ''
    FROM generate_series(1,900) AS i`);
  const count = (await db.query('SELECT count(*)::int AS n FROM "Listing" WHERE "searchTokens" && $1::text[] AND NOT "searchAccessory"', [['s24']])).rows[0].n;
  assert.equal(count, 450);
  const page = (await db.query('SELECT id FROM "Listing" WHERE "searchTokens" && $1::text[] AND NOT "searchAccessory" ORDER BY id OFFSET 400 LIMIT 20', [['s24']])).rows;
  assert.equal(page.length, 20);
  assert.equal(page[0].id, '0802');
  assert.equal(page[19].id, '0840');
  assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_indexes WHERE indexname='Listing_searchTokens_idx'")).rows[0].n, 1);
  console.log(JSON.stringify({ ok: true, engine: (await db.query('SHOW server_version')).rows[0], parityExamples: examples.length, matchingRows: count, deepPageRows: page.length, checks: ['backfill', 'insert', 'update', 'tamper recomputation', 'JS/SQL parity', 'count', 'offset 400', 'GIN index'] }, null, 2));
} finally { await db.close(); }
