import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateListingDto, UpdateListingDto } from './dto';
import { resolveListingModes } from './listing-modes';

describe('one listing, three trade modes', () => {
  it.each([[true, false], [false, true], [true, true]])('accepts sale=%s barter=%s', (saleEnabled, barterEnabled) => {
    expect(resolveListingModes({ saleEnabled, barterEnabled }, undefined, true)).toEqual({ saleEnabled, barterEnabled });
  });
  it('maps legacy opt-in and preserves canonical modes on unrelated edits', () => {
    expect(resolveListingModes({}, undefined, true)).toEqual({ saleEnabled: true, barterEnabled: false });
    expect(resolveListingModes({ attributes: { isBarter: true } }, undefined, true)).toEqual({ saleEnabled: true, barterEnabled: true });
    expect(resolveListingModes({ attributes: { brand: 'Acme' } }, { saleEnabled: false, barterEnabled: true }, true)).toEqual({ saleEnabled: false, barterEnabled: true });
  });
  it('requires one mode and rejects conflicting legacy aliases', () => {
    expect(() => resolveListingModes({ saleEnabled: false, barterEnabled: false }, undefined, true)).toThrow('listing_mode_required');
    expect(() => resolveListingModes({ barterEnabled: false, attributes: { isBarter: true } }, undefined, true)).toThrow('listing_mode_conflict');
  });
  it('does not silently turn exchange-only into a sale on a category change', () => {
    expect(() => resolveListingModes({}, { saleEnabled: false, barterEnabled: true }, false)).toThrow('listing_mode_required');
    expect(resolveListingModes({ saleEnabled: true, barterEnabled: false }, { saleEnabled: false, barterEnabled: true }, false)).toEqual({ saleEnabled: true, barterEnabled: false });
  });
  describe.each([CreateListingDto, UpdateListingDto])('DTO %p', Dto => {
    it.each([null, 'true', 'false', 0, 1, [], {}])('rejects invalid flag %p', async value => {
      const result = await validate(plainToInstance(Dto, { saleEnabled: value, barterEnabled: value }));
      for (const property of ['saleEnabled', 'barterEnabled']) expect(result.some(error => error.property === property)).toBe(true);
    });
  });
});
