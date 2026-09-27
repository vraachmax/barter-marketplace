import { parseExchangePreferences } from './exchange-preferences';
const valid = { anyOffer: true, wantedCategoryIds: [], wantedDescription: '', canAddCash: false, acceptsCash: false, maxCashRub: null };
describe('explicit exchange preferences', () => {
  it('distinguishes absent historical wishes, any offers and specific wishes', () => {
    expect(parseExchangePreferences(null)).toBeNull();
    expect(parseExchangePreferences(valid)).toEqual(valid);
    expect(parseExchangePreferences({ ...valid, anyOffer: false, wantedDescription: '  Велосипед  ' })?.wantedDescription).toBe('Велосипед');
    expect(parseExchangePreferences({ ...valid, anyOffer: false, wantedCategoryIds: ['other-category'] })?.wantedCategoryIds).toEqual(['other-category']);
  });
  it.each([undefined, [], true, {}, { ...valid, anyOffer: 'true' }, { ...valid, anyOffer: false },
    { ...valid, wantedCategoryIds: ['x', 'x'] }, { ...valid, wantedCategoryIds: Array(11).fill('x') },
    { ...valid, wantedCategoryIds: [1] }, { ...valid, wantedDescription: 'x'.repeat(501) },
    { ...valid, maxCashRub: 1 }, { ...valid, canAddCash: true, maxCashRub: -1 },
    { ...valid, canAddCash: true, maxCashRub: 1.5 }, { ...valid, canAddCash: true, maxCashRub: '100' },
    { ...valid, canAddCash: true, maxCashRub: 2147483648 }, { ...valid, unexpected: true },
  ])('rejects malformed or contradictory conditions %#', value => {
    expect(() => parseExchangePreferences(value)).toThrow('invalid_exchange_preferences');
  });
  it('keeps cash directions independent and accepts open or bounded budgets', () => {
    for (const maxCashRub of [null, 0, 15000, 2147483647]) {
      expect(parseExchangePreferences({ ...valid, canAddCash: true, acceptsCash: true, maxCashRub })?.maxCashRub).toBe(maxCashRub);
    }
  });
});
