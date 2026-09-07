import { searchTermGroups } from './search-synonyms';
import { searchDatabaseEligibility } from './search-eligibility';

describe('bounded query normalization', () => {
  it.each([
    ['шуруповёрт', 'шуруповерт'],
    ['шуруповерт', 'шуруповёрт'],
    ['колёса', 'колеса'],
    ['колеса', 'колёса'],
    ['аренду', 'аренда'],
    ['экскаватора', 'экскаватор'],
    ['веласипед', 'велосипед'],
    ['айфно', 'айфон'],
    ['macbok', 'macbook'],
  ])('%s includes %s', (query, expected) => {
    expect(searchTermGroups(query).flat()).toContain(expected);
  });
  it('keeps short names and models exact', () => {
    expect(searchTermGroups('s25 ps50 140 ipda')).toEqual([
      ['s25'],
      ['ps50'],
      ['140'],
      ['ipda'],
    ]);
  });
  it('does not discard negation or an entirely functional query', () => {
    expect(searchTermGroups('без ремонта').map((x) => x[0])).toEqual([
      'без',
      'ремонта',
    ]);
    expect(searchTermGroups('для')).toEqual([['для']]);
  });
  it('removes only selected connectors in a substantive query', () => {
    expect(searchTermGroups('экскаватор в аренду').map((x) => x[0])).toEqual([
      'экскаватор',
      'аренду',
    ]);
  });
  it('rejects an ambiguous correction between two unrelated families', () => {
    // One edit from both машина and шина: do not choose a product type.
    expect(searchTermGroups('ашина')).toEqual([['ашина']]);
  });
  it('applies the accessory guard to a corrected device spelling', () => {
    expect(searchDatabaseEligibility('айфно 14')).toContainEqual({
      searchAccessory: false,
    });
    expect(searchDatabaseEligibility('айфно 14')).toContainEqual({
      searchTokens: { hasSome: ['14'] },
    });
  });
});
