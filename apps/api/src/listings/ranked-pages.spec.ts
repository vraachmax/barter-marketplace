import { Test } from '@nestjs/testing';
import { AnalyticsService } from '../analytics/analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { MeilisearchService } from '../search/meilisearch.service';
import { MediaStorageService } from '../storage/media-storage.service';
import { ListingsService } from './listings.service';

describe('ranked database pages', () => {
  const row = (id: string) => ({
    id,
    title: 'Велосипед',
    description: 'Горный велосипед',
    priceRub: 1000,
    city: 'Краснодар',
    latitude: 0,
    longitude: 0,
    createdAt: new Date('2026-09-01'),
    categoryId: 'hobby',
    ownerId: 'seller',
    category: { id: 'hobby', title: 'Хобби' },
    owner: { id: 'seller', name: null, responseRate: 1 },
    viewsCount: 0,
    clicksCount: 0,
    _count: { favorites: 0 },
    images: [],
    promotions: [],
    attributes: { isBarter: true },
  });
  let service: ListingsService;
  const findMany = jest.fn();
  const count = jest.fn();
  const searchListings = jest.fn();
  let meiliEnabled = false;
  beforeEach(async () => {
    jest.resetAllMocks();
    meiliEnabled = false;
    const moduleRef = await Test.createTestingModule({
      providers: [
        ListingsService,
        {
          provide: PrismaService,
          useValue: {
            listing: { findMany, count },
            sellerReview: { groupBy: jest.fn().mockResolvedValue([]) },
          },
        },
        {
          provide: MeilisearchService,
          useValue: { isEnabled: () => meiliEnabled, searchListings },
        },
        { provide: AnalyticsService, useValue: {} },
        { provide: MediaStorageService, useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(ListingsService);
  });

  it('paginates hydrated index candidates without overlaps or stale IDs', async () => {
    meiliEnabled = true;
    searchListings.mockResolvedValue({
      hits: ['stale', 'a', 'a', 'b', 'c', 'd'].map((id) => ({ id })),
      estimatedTotalHits: 6,
    });
    const pool = ['d', 'b', 'a', 'c'].map(row);
    findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(pool)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(pool);
    const params = {
      q: 'веласипед',
      city: 'Краснодар',
      categoryId: 'hobby',
      priceMin: 500,
      priceMax: 2000,
      limit: 2,
    };
    const first = await service.list({ ...params, page: 1 });
    const second = await service.list({ ...params, page: 2 });
    expect(first.items.map((x: { id: string }) => x.id)).toEqual(['a', 'b']);
    expect(second.items.map((x: { id: string }) => x.id)).toEqual(['c', 'd']);
    expect(first.total).toBe(4);
    expect(second.total).toBe(4);
    expect(searchListings).toHaveBeenLastCalledWith(
      'веласипед',
      expect.objectContaining({ offset: 0, limit: 3000 }),
    );
    expect(findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          AND: [
            {
              status: 'ACTIVE',
              city: { equals: 'Краснодар', mode: 'insensitive' },
              categoryId: 'hobby',
              priceRub: { gte: 500, lte: 2000 },
            },
            { id: { in: ['stale', 'a', 'b', 'c', 'd'] } },
          ],
        },
      }),
    );
  });

  it('removes VIP before counting index results and reports the candidate limit', async () => {
    meiliEnabled = true;
    searchListings.mockResolvedValue({
      hits: [{ id: 'vip' }, { id: 'a' }],
      estimatedTotalHits: 4000,
    });
    findMany
      .mockResolvedValueOnce([row('vip')])
      .mockResolvedValueOnce([row('vip'), row('a')]);
    const result = await service.list({ q: 'велосипед', limit: 20 });
    expect(result).toMatchObject({ total: 1, searchWindowLimited: true });
    expect(result.items.map((x: { id: string }) => x.id)).toEqual(['a']);
  });

  it('falls back to the database when the index request fails', async () => {
    meiliEnabled = true;
    searchListings.mockRejectedValue(new Error('unavailable'));
    findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([row('a')]);
    count.mockResolvedValue(1);
    const result = await service.list({ q: 'велосипед' });
    expect(result.items.map((x: { id: string }) => x.id)).toEqual(['a']);
    expect(count).toHaveBeenCalledTimes(1);
  });

  it('uses the same bounded candidates on early and late pages', async () => {
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(4000);
    await service.list({ sort: 'relevant', page: 1 });
    const result = await service.list({ sort: 'relevant', page: 20 });
    for (const call of [2, 4])
      expect(findMany).toHaveBeenNthCalledWith(
        call,
        expect.objectContaining({
          take: 3000,
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        }),
      );
    expect(result).toMatchObject({ total: 0, searchWindowLimited: true });
  });

  it('requires every query group in SQL, including single-digit models', async () => {
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);
    await service.list({ q: 'айфон 1', sort: 'new' });
    const match = (term: string) => [
      { title: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
      { city: { contains: term, mode: 'insensitive' } },
      { category: { title: { contains: term, mode: 'insensitive' } } },
    ];
    expect(count).toHaveBeenCalledWith({
      where: {
        status: 'ACTIVE',
        AND: [
          { OR: ['айфон', 'iphone', 'айфона', 'айфоне'].flatMap(match) },
          { OR: match('1') },
        ],
      },
    });
  });

  it.each(['relevant', 'nearby'] as const)(
    'breaks ties and returns disjoint %s pages',
    async (sort) => {
      const pool = [row('c'), row('a'), row('b')];
      findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(pool)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([...pool].reverse());
      count.mockResolvedValue(3);
      const params = { sort, limit: 2, lat: 0, lon: 0 };
      const first = await service.list({ ...params, page: 1 });
      const second = await service.list({ ...params, page: 2 });
      expect(first.items.map((x: { id: string }) => x.id)).toEqual(['a', 'b']);
      expect(second.items.map((x: { id: string }) => x.id)).toEqual(['c']);
      expect(first.items[0]).toMatchObject({ isBarter: true });
      expect(first.items[0]).not.toHaveProperty('attributes');
      expect(first.total).toBe(3);
    },
  );
});
