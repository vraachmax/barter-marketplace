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
  beforeEach(async () => {
    jest.resetAllMocks();
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
        { provide: MeilisearchService, useValue: { isEnabled: () => false } },
        { provide: AnalyticsService, useValue: {} },
        { provide: MediaStorageService, useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(ListingsService);
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
