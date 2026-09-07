import { searchTermGroups } from './search-synonyms';

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

/** Conservative candidate guard, applied BEFORE counting and pagination.
 * Numeric/model tokens are exact, not fuzzy. Accessories are rejected only
 * for known device queries and clearly accessory-led titles, not bundles. */
export function searchEligibility(query: string): (row: SearchText) => boolean {
  const groups = searchTermGroups(query.normalize('NFKC'));
  const protectedGroups = groups.filter((group) => /\d/u.test(group[0]));
  const queryTokens = tokenize(query);
  const deviceQuery = queryTokens.some((word) => devices.has(word));
  const accessoryQuery =
    queryTokens.some((word) => accessories.has(word)) ||
    /защитн\S*\s+стекл/u.test(query.toLowerCase());
  return (row) => {
    if (protectedGroups.length) {
      const terms = new Set(tokenize(`${row.title} ${row.description ?? ''}`));
      if (
        !protectedGroups.every((group) => group.some((term) => terms.has(term)))
      )
        return false;
    }
    if (deviceQuery && !accessoryQuery) {
      const title = tokenize(row.title);
      let start = 0;
      while (modifiers.has(title[start])) start++;
      if (accessories.has(title[start])) return false;
      if (
        title[start] === 'стекло' &&
        start > 0 &&
        title[start - 1] === 'защитное'
      )
        return false;
    }
    return true;
  };
}
