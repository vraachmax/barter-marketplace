import {
  MEILISEARCH_LISTING_SYNONYMS,
  searchTermGroups,
} from './search-synonyms';

describe('conservative query expansion', () => {
  it.each([
    ['квартира', 'аренда'],
    ['аренда', 'квартира'],
    ['samsung', 'galaxy'],
    ['смартфон', 'iphone'],
    ['машина', 'kia'],
    ['ipad', 'планшет'],
    ['playstation', 'ps5'],
    ['велосипед', 'байк'],
  ])('does not substitute %s with %s', (query, unwanted) => {
    expect(searchTermGroups(query).flat()).not.toContain(unwanted);
  });

  it.each([
    ['айфон', 'iphone'],
    ['самсунг', 'samsung'],
    ['макбук', 'macbook'],
  ])('retains equivalent spellings %s and %s', (query, alias) => {
    expect(searchTermGroups(query)[0]).toContain(alias);
    expect(MEILISEARCH_LISTING_SYNONYMS[alias]).toContain(query);
  });

  it('keeps model numbers and short words mandatory', () => {
    expect(searchTermGroups('  iPhone 14 PRO 1 ТБ ')).toEqual([
      ['iphone', 'айфон', 'айфона', 'айфоне'],
      ['14'],
      ['pro'],
      ['1'],
      ['тб'],
    ]);
  });

  it('corrects known typos without turning correct words into typos', () => {
    expect(searchTermGroups('машига')[0]).toContain('машина');
    expect(searchTermGroups('машина')[0]).not.toContain('машига');
  });

  it('does not turn punctuation into a match-all group', () => {
    expect(searchTermGroups('?!')).toEqual([]);
    expect(searchTermGroups('constructor')).toEqual([['constructor']]);
  });
});
