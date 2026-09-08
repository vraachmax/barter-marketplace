// Offline only. Runs the actual ListingsService against an in-memory Prisma
// substitute, not PostgreSQL/Meili. Build API first. No network or database writes.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { ListingsService } = require('../apps/api/dist/listings/listings.service.js');
const { searchIndexFields } = require('../apps/api/dist/search/search-eligibility.js');
const corpus = JSON.parse(readFileSync(new URL('../docs/search-evaluation/corpus.json', import.meta.url), 'utf8'));
const fixedNow = new Date('2026-09-01T00:00:00Z');
const NativeDate = Date;
globalThis.Date = class extends NativeDate {
  constructor(...args) { super(...(args.length ? args : [fixedNow.getTime()])); }
  static now() { return fixedNow.getTime(); }
};

function row(entry) {
  const categoryId = entry.category ?? 'electronics';
  return {
    id: entry.id, title: entry.title, description: '', priceRub: entry.price ?? 1000,
    ...searchIndexFields({ title: entry.title, description: '' }),
    city: 'Краснодар', status: 'ACTIVE', categoryId,
    category: { id: categoryId, slug: categoryId, title: categoryId },
    ownerId: 'fixture-seller', owner: { id: 'fixture-seller', name: null, responseRate: 0 },
    createdAt: new Date('2026-08-25T00:00:00Z'), updatedAt: new Date('2026-08-25T00:00:00Z'),
    viewsCount: 0, clicksCount: 0, _count: { favorites: 0 },
    images: [], promotions: [], attributes: { isBarter: false },
    latitude: null, longitude: null,
  };
}

// Fail loudly for unsupported operators; don't silently report false success.
function condition(value, rule) {
  if (rule === null || typeof rule !== 'object') return value === rule;
  const normalize = x => rule.mode === 'insensitive' && typeof x === 'string' ? x.toLowerCase() : x;
  return Object.entries(rule).every(([op, operand]) => {
    if (op === 'mode') return true;
    if (op === 'equals') return normalize(value) === normalize(operand);
    if (op === 'contains') return typeof value === 'string' && normalize(value).includes(normalize(operand));
    if (op === 'in') return operand.includes(value);
    if (op === 'hasSome') return operand.some(x => value.includes(x));
    if (op === 'notIn') return !operand.includes(value);
    if (op === 'gte') return value != null && value >= operand;
    if (op === 'lte') return value != null && value <= operand;
    if (op === 'not') return !condition(value, operand);
    throw new Error(`Unsupported scalar operator: ${op}`);
  });
}
function matches(item, where = {}) {
  return Object.entries(where).every(([field, rule]) => {
    if (field === 'AND') return (Array.isArray(rule) ? rule : [rule]).every(x => matches(item, x));
    if (field === 'OR') return rule.some(x => matches(item, x));
    if (field === 'category') return matches(item.category, rule);
    if (field === 'promotions') {
      if (!rule.some) throw new Error('Unsupported promotion rule');
      return item.promotions.some(x => matches(x, rule.some));
    }
    if (field === 'attributes') {
      if (rule.path?.join('.') !== 'isBarter') throw new Error('Unsupported JSON path');
      return item.attributes.isBarter === rule.equals;
    }
    if (!(field in item)) throw new Error(`Unsupported field: ${field}`);
    return condition(item[field], rule);
  });
}

const listings = [...corpus.families, ...corpus.distractors].map(row);
const queries = [
  ...corpus.families.flatMap(f => f.queries.map((query, i) => ({
    id: `${f.id}-${i}`, query, split: f.split ?? 'development',
    kind: ['exact', 'alternative', 'typo'][i], grades: { [f.id]: 3 }, forbidden: f.forbidden ?? [],
  }))),
  ...corpus.additionalQueries.map(q => ({ ...q, split: 'development', kind: 'negative', forbidden: [] })),
];
const ids = new Set(listings.map(x => x.id));
if (ids.size !== listings.length || new Set(queries.map(x => x.id)).size !== queries.length) throw new Error('Duplicate fixture IDs');
for (const q of queries) for (const id of [...Object.keys(q.grades), ...q.forbidden]) {
  if (!ids.has(id)) throw new Error(`Unknown judgment: ${id}`);
}

const prisma = {
  listing: {
    async findMany({ where, orderBy = [], skip = 0, take = listings.length }) {
      const sorted = listings.filter(x => matches(x, where));
      const rules = Array.isArray(orderBy) ? orderBy : [orderBy];
      sorted.sort((a, b) => {
        for (const rule of rules) for (const [key, direction] of Object.entries(rule)) {
          const delta = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
          if (typeof direction !== 'string') throw new Error('Unsupported sort');
          if (delta) return direction === 'desc' ? -delta : delta;
        }
        return 0;
      });
      return sorted.slice(skip, skip + take);
    },
    async count({ where }) { return listings.filter(x => matches(x, where)).length; },
  },
  sellerReview: { async groupBy() { return []; } },
};
const service = new ListingsService(prisma, { isEnabled: () => false }, {}, {});
const dcg = grades => grades.reduce((sum, grade, i) => sum + (2 ** grade - 1) / Math.log2(i + 2), 0);
const results = [];
try {
  for (const q of queries) {
    const result = await service.list({ q: q.query, sort: 'relevant', limit: 20, ...q.filters });
    const ranked = result.items.map(x => x.id);
    const relevant = Object.keys(q.grades).filter(id => q.grades[id] > 0);
    const ideal = dcg(Object.values(q.grades).sort((a, b) => b - a).slice(0, 10));
    results.push({
      ...q, ranked, ndcg10: ideal ? dcg(ranked.slice(0, 10).map(id => q.grades[id] ?? 0)) / ideal : null,
      recall20: relevant.length ? relevant.filter(id => ranked.includes(id)).length / relevant.length : null,
      forbiddenReturned: ranked.filter(id => q.forbidden.includes(id)),
      unexpectedNonempty: !relevant.length && ranked.length > 0,
    });
  }
} finally { globalThis.Date = NativeDate; }

const mean = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const summarize = rows => ({
  queries: rows.length,
  ndcg10: mean(rows.map(x => x.ndcg10).filter(x => x !== null)),
  recall20: mean(rows.map(x => x.recall20).filter(x => x !== null)),
  emptyResults: rows.filter(x => !x.ranked.length).length,
  forbiddenQueries: rows.filter(x => x.forbiddenReturned.length).length,
  negativeFailures: rows.filter(x => x.unexpectedNonempty).length,
});
const summary = Object.fromEntries(['development', 'holdout'].map(split => [split, summarize(results.filter(x => x.split === split))]));
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ engine: 'actual-service/in-memory-sql-model', corpusVersion: corpus.version, summary, results }, null, 2));
} else {
  console.log('# Offline search baseline\n');
  console.log('Synthetic fixtures; actual ListingsService with in-memory query execution. Not a live PostgreSQL/Meili or UX benchmark.\n');
  console.log('```json\n' + JSON.stringify(summary, null, 2) + '\n```\n');
  console.log('| Query | Expected | Returned top 5 | Forbidden |\n|---|---|---|---|');
  for (const x of results.filter(x => x.recall20 === 0 || x.forbiddenReturned.length || x.unexpectedNonempty)) {
    console.log(`| ${x.query} | ${Object.keys(x.grades).join(', ') || '(empty)'} | ${x.ranked.slice(0, 5).join(', ') || '(empty)'} | ${x.forbiddenReturned.join(', ')} |`);
  }
}
