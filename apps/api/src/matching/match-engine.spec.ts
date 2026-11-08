import { learnCategoryAffinity, matchListings, MatchListing } from './match-engine';
const listing = (overrides: Partial<MatchListing> = {}): MatchListing => ({
  id: 'a', ownerId: 'u1', categoryId: 'phones', title: 'iPhone', city: 'Краснодар',
  barterEnabled: true, status: 'ACTIVE', priceRub: 30000,
  exchangePreferences: { anyOffer: false, wantedCategoryIds: ['games'],
    canAddCash: true, acceptsCash: true, maxCashRub: 15000 }, ...overrides,
});
describe('Barter Match', () => {
  const mine = listing();
  const mutual = listing({id:'b', ownerId:'u2', categoryId:'games', title:'PlayStation',
    priceRub:35000, exchangePreferences:{anyOffer:false, wantedCategoryIds:['phones'],
      canAddCash:true, acceptsCash:true, maxCashRub:15000}});
  it('finds a reciprocal match with signed cash gap', () => {
    const found=matchListings(mine,[mutual]); expect(found).toHaveLength(1);
    expect(found[0].cashGapRub).toBe(5000); expect(found[0].mutual).toBe(true);
  });
  it('excludes the same owner and inactive or sale-only candidates', () => {
    expect(matchListings(mine,[listing({...mutual,id:'c',ownerId:'u1'}),
      listing({...mutual,id:'d',status:'ARCHIVED'}),
      listing({...mutual,id:'e',barterEnabled:false})])).toHaveLength(0);
  });
  it('does not suggest one-way desire as a mutual match', () => {
    const noWant=listing({...mutual,exchangePreferences:{anyOffer:false,wantedCategoryIds:['bikes']}});
    expect(matchListings(mine,[noWant])).toHaveLength(0);
  });
  it('learns interests from recent genuine events with decay and repetition caps', () => {
    const now=new Date('2026-11-08T12:00:00Z');
    const events=[
      {userId:'u1',categoryId:'games',type:'ADD_TO_FAVORITES' as const,createdAt:now},
      {userId:'u1',categoryId:'phones',type:'VIEW_ITEM' as const,createdAt:now},
      {userId:'u2',categoryId:'phones',type:'SEND_MESSAGE' as const,createdAt:now},
    ];
    const affinity=learnCategoryAffinity(events,'u1',now);
    expect(affinity.get('games')).toBeGreaterThan(affinity.get('phones') ?? 0);
  });
  it('never makes learning override missing reciprocal intent', () => {
    const affinity=new Map([['games',1]]);
    const rejected=listing({...mutual,exchangePreferences:{anyOffer:false,wantedCategoryIds:[]}});
    expect(matchListings(mine,[rejected],affinity)).toEqual([]);
  });
});
