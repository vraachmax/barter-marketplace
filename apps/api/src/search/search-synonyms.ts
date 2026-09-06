/** Equivalent names only. Brands, families and transaction types stay distinct. */
const groups = [
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

/** Every group is required; alternatives inside a group are interchangeable. */
export function searchTermGroups(raw: string): string[][] {
  const words = [...new Set(raw.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])];
  return words.map((word) => [
    word,
    ...(Object.hasOwn(MEILISEARCH_LISTING_SYNONYMS, word)
      ? MEILISEARCH_LISTING_SYNONYMS[word]
      : []),
  ]);
}
