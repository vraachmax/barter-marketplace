import { searchTermGroups } from './search-synonyms';
import type { Prisma } from '@prisma/client';

type SearchText = { title: string; description?: string };
const tokenize = (text: string): string[] =>
  text
    .normalize('NFKC')
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu) ?? [];
const devices = new Set([
  'iphone',
  'айфон',
  'samsung',
  'самсунг',
  'galaxy',
  'галакси',
  'ipad',
  'айпад',
  'macbook',
  'макбук',
  'playstation',
  'плейстейшн',
  'ps5',
  'пс5',
]);
const accessories = new Set([
  'чехол',
  'чехлы',
  'чехла',
  'чехлов',
  'case',
  'cover',
  'кабель',
  'кабели',
  'зарядка',
  'зарядное',
  'пленка',
  'плёнка',
]);
const modifiers = new Set([
  'новый',
  'новая',
  'новое',
  'оригинальный',
  'оригинальная',
  'оригинальное',
  'силиконовый',
  'кожаный',
  'защитная',
  'защитное',
  'защитный',
]);

export function searchIndexFields(row: SearchText) {
  const title = tokenize(row.title);
  let start = 0;
  while (modifiers.has(title[start])) start++;
  return {
    searchTokens: tokenize(`${row.title} ${row.description ?? ''}`),
    searchAccessory:
      accessories.has(title[start]) ||
      (title[start] === 'стекло' &&
        start > 0 &&
        title[start - 1] === 'защитное'),
  };
}

/** Conservative candidate guard, applied BEFORE counting and pagination.
 * Numeric/model tokens are exact, not fuzzy. Accessories are rejected only
 * for known device queries and clearly accessory-led titles, not bundles. */
export function searchEligibility(query: string): (row: SearchText) => boolean {
  const groups = searchTermGroups(query.normalize('NFKC'));
  const protectedGroups = groups.filter((group) => /\d/u.test(group[0]));
  const queryTokens = groups.flat();
  const deviceQuery = queryTokens.some((word) => devices.has(word));
  const accessoryQuery =
    queryTokens.some((word) => accessories.has(word)) ||
    /защитн\S*\s+стекл/u.test(query.toLowerCase());
  return (row) => {
    const fields = searchIndexFields(row);
    if (protectedGroups.length) {
      const terms = new Set(fields.searchTokens);
      if (
        !protectedGroups.every((group) => group.some((term) => terms.has(term)))
      )
        return false;
    }
    if (deviceQuery && !accessoryQuery) {
      if (fields.searchAccessory) return false;
    }
    return true;
  };
}

/** Database counterpart: use on every listing sort, before count/skip/take. */
export function searchDatabaseEligibility(
  query: string,
): Prisma.ListingWhereInput[] {
  const tokens = searchTermGroups(query).flat();
  const clauses: Prisma.ListingWhereInput[] = searchTermGroups(
    query.normalize('NFKC'),
  )
    .filter((group) => /\d/u.test(group[0]))
    .map((group) => ({ searchTokens: { hasSome: group } }));
  const accessoryQuery =
    tokens.some((word) => accessories.has(word)) ||
    /защитн\S*\s+стекл/u.test(query.toLowerCase());
  if (tokens.some((word) => devices.has(word)) && !accessoryQuery) {
    clauses.push({ searchAccessory: false });
  }
  return clauses;
}
