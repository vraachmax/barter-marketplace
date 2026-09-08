/** Equivalent names only. Brands, families and transaction types stay distinct. */
const groups: readonly (readonly string[])[] = [
  ['iphone', 'айфон', 'айфона', 'айфоне'],
  ['samsung', 'самсунг'],
  ['galaxy', 'галакси'],
  ['машина', 'авто', 'автомобиль'],
  ['macbook', 'макбук'],
  ['ipad', 'айпад'],
  ['playstation', 'плейстейшн'],
  ['ps5', 'пс5'],
  ['велосипед', 'велик'],
  ['ноутбук', 'laptop'],
  ['аренда', 'аренду', 'аренды', 'аренде'],
  ['экскаватор', 'экскаватора', 'экскаваторы'],
  ['квартира', 'квартиры', 'квартиру', 'квартире'],
  ['шуруповерт', 'шуруповерта', 'шуруповерты'],
  ['коляска', 'коляски', 'коляску'],
  ['диван', 'дивана', 'диваны'],
  ['гитара', 'гитары', 'гитару'],
  ['холодильник', 'холодильника', 'холодильники'],
  ['стиральная', 'стиральную'],
  ['телевизор', 'телевизора', 'телевизоры'],
  ['пылесос', 'пылесоса', 'пылесосы'],
  ['автокран', 'автокрана', 'автокраны'],
  ['шины', 'шина', 'шин'],
  ['фотоаппарат', 'фотоаппарата', 'фотоаппараты'],
] as const;

export const MEILISEARCH_LISTING_SYNONYMS: Record<string, string[]> = {};
for (const group of groups) {
  for (const word of group) {
    MEILISEARCH_LISTING_SYNONYMS[word] = group.filter(
      (other) => other !== word,
    );
  }
}

// Corrections are directional; correct words do not expand to misspellings.
Object.assign(MEILISEARCH_LISTING_SYNONYMS, {
  машига: ['машина', 'авто', 'автомобиль'],
  нотебук: ['ноутбук', 'laptop'],
});

const stopWords = new Set(['для', 'в', 'на', 'с', 'из', 'по']);
const fold = (word: string) =>
  word.normalize('NFKC').toLowerCase().replaceAll('ё', 'е');

// One insertion/deletion/substitution or adjacent transposition. Never applied
// to model/number tokens or short words; two edits are deliberately unsupported.
function oneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  if (i === a.length) return b.length - a.length <= 1;
  if (a.length === b.length) {
    return (
      a.slice(i + 1) === b.slice(i + 1) ||
      (a[i] === b[i + 1] &&
        a[i + 1] === b[i] &&
        a.slice(i + 2) === b.slice(i + 2))
    );
  }
  return a.length > b.length
    ? a.slice(i + 1) === b.slice(i)
    : a.slice(i) === b.slice(i + 1);
}

function spellingVariants(word: string): string[] {
  if (/\d/u.test(word)) return [word];
  let variants = [fold(word)];
  let count = 0;
  for (let i = 0; i < word.length && count < 4; i++) {
    if (fold(word)[i] !== 'е') continue;
    variants = [
      ...variants,
      ...variants.map((v) => v.slice(0, i) + 'ё' + v.slice(i + 1)),
    ];
    count++;
  }
  return [...new Set([word, ...variants])];
}

/** Every content group is required; uncertain corrections never replace intent. */
export function searchTermGroups(raw: string): string[][] {
  const all = [
    ...new Set(
      raw
        .normalize('NFKC')
        .toLowerCase()
        .match(/[\p{L}\p{N}]+/gu) ?? [],
    ),
  ];
  const content = all.filter((word) => !stopWords.has(word));
  const words = content.length ? content : all;
  return words.map((word) => {
    const normalized = fold(word);
    let alternatives = Object.hasOwn(MEILISEARCH_LISTING_SYNONYMS, normalized)
      ? MEILISEARCH_LISTING_SYNONYMS[normalized]
      : [];
    if (
      !alternatives.length &&
      normalized.length >= 5 &&
      /^[a-zа-я]+$/u.test(normalized)
    ) {
      const candidates = groups.filter((group) =>
        group.some((term) => oneEdit(normalized, fold(term))),
      );
      if (candidates.length === 1) alternatives = [...candidates[0]];
    }
    return [
      ...new Set([word, ...spellingVariants(normalized), ...alternatives]),
    ];
  });
}
