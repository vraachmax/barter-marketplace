import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const run = () => JSON.parse(execFileSync(process.execPath, [fileURLToPath(new URL('./evaluate-search.mjs', import.meta.url)), '--json'], { encoding: 'utf8' }));
const report = run();
test('covers 60 unique queries with separate development and holdout groups', () => {
  assert.equal(report.results.length, 60);
  assert.equal(new Set(report.results.map(x => x.id)).size, 60);
  assert.equal(report.summary.development.queries, 48);
  assert.equal(report.summary.holdout.queries, 12);
});
test('reports bounded metrics, deduplicated results and nullable empty-query metrics', () => {
  for (const result of report.results) {
    for (const value of [result.ndcg10, result.recall20]) {
      assert.ok(value === null || (Number.isFinite(value) && value >= 0 && value <= 1));
    }
    assert.equal(new Set(result.ranked).size, result.ranked.length);
    if (!Object.keys(result.grades).length) {
      assert.equal(result.ndcg10, null);
      assert.equal(result.recall20, null);
    }
  }
});
test('is reproducible with a fixed clock and corpus', () => {
  assert.deepEqual(run(), report);
});
