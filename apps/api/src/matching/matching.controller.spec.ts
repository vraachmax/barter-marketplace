import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MatchingController } from './matching.controller';

describe('Barter Match ownership and API response', () => {
  const mine = {
    id: 'mine', ownerId: 'me', categoryId: 'electronics', title: 'Phone',
    city: 'Краснодар', barterEnabled: true, status: 'ACTIVE', priceRub: 20000,
    exchangePreferences: { anyOffer: true, canAddCash: true, acceptsCash: true },
    attributes: {},
  };
  const candidate = {
    ...mine, id: 'other', ownerId: 'otherUser', title: 'Console',
    categoryId: 'hobby', priceRub: 22000,
  };
  const prisma = {
    listing: { findUnique: jest.fn(), findMany: jest.fn() },
    user: { findUnique: jest.fn() },
    userBehaviorEvent: { findMany: jest.fn() },
  };
  const controller = new MatchingController(prisma as any);
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.listing.findUnique.mockResolvedValue(mine);
    prisma.listing.findMany.mockResolvedValueOnce([candidate]).mockResolvedValueOnce([{
      id: 'other', title: 'Console', priceRub: 22000, city: 'Краснодар',
      saleEnabled: true, barterEnabled: true, images: [{url:'https://example.test/photo.jpg',sortOrder:0}],
      category: {id:'hobby',title:'Хобби'}, owner: {id:'otherUser',name:'Другой'},
    }]);
    prisma.user.findUnique.mockResolvedValue({email:'me@example.com'});
    prisma.userBehaviorEvent.findMany.mockResolvedValue([]);
  });
  it('does not expose matches for a missing listing',async()=>{
    prisma.listing.findUnique.mockResolvedValue(null);
    await expect(controller.forListing('missing',{user:{id:'me'}})).rejects.toBeInstanceOf(NotFoundException);
  });
  it('does not expose other users listing recommendations',async()=>{
    await expect(controller.forListing('mine',{user:{id:'stranger'}})).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('returns only mutual candidates with listing cards',async()=>{
    const result=await controller.forListing('mine',{user:{id:'me'}},'8');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].listingId).toBe('other');
    expect(result.matches[0].listing?.images).toHaveLength(1);
    expect(result.matches[0].mutual).toBe(true);
    expect('algorithmVersion' in result && result.algorithmVersion).toBe('match-v2-heuristic');
  });
  it('returns no candidate data for archived listing',async()=>{
    prisma.listing.findUnique.mockResolvedValue({...mine,status:'ARCHIVED'});
    const result=await controller.forListing('mine',{user:{id:'me'}});
    expect(result.matches).toHaveLength(0);
    expect(prisma.listing.findMany).not.toHaveBeenCalled();
  });
});
