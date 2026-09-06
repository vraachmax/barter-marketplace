import { Test } from '@nestjs/testing';
import { AnalyticsService } from '../analytics/analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { MeilisearchService } from '../search/meilisearch.service';
import { MediaStorageService } from '../storage/media-storage.service';
import { ListingsService } from './listings.service';

const sorts = ['new', 'cheap', 'expensive'] as const;
const row = (id: string, boosted = false) => ({
  id,
  title: 'Велосипед',
  priceRub: 1000,
  city: 'Краснодар',
  createdAt: new Date('2026-09-01'),
  category: { id: 'hobby', title: 'Хобби' },
  owner: { id: 'seller', name: null },
  images: [],
  attributes: { isBarter: true },
  promotions: boosted
    ? [{ type: 'TOP', weight: 10, endsAt: new Date('2027-01-01') }]
    : [],
});

describe('explicit listing sort and pagination', () => {
  let service: ListingsService;
  const findMany = jest.fn();
  const count = jest.fn();
  const searchListings = jest.fn();

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ListingsService,
        { provide: PrismaService, useValue: { listing: { findMany, count } } },
        {
          provide: MeilisearchService,
          useValue: { isEnabled: () => true, searchListings },
        },
        { provide: AnalyticsService, useValue: {} },
        { provide: MediaStorageService, useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(ListingsService);
  });

  describe.each(['market', 'barter'] as const)('%s', (mode) => {
    it.each(sorts)(
      'loads beyond 400 without truncation for %s',
      async (sort) => {
        const rows = Array.from({ length: 20 }, (_, i) =>
          row(`listing-${400 + i}`),
        );
        findMany.mockResolvedValueOnce([]).mockResolvedValueOnce(rows);
        count.mockResolvedValue(1000);
        const result = await service.list({
          mode,
          sort,
          page: 21,
          limit: 20,
          q: 'велосипед',
        });
        expect(result.items.map((item: { id: string }) => item.id)).toEqual(
          rows.map((item) => item.id),
        );
        expect(result.total).toBe(1000);
        expect(findMany).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({ skip: 400, take: 20 }),
        );
        expect(searchListings).not.toHaveBeenCalled();
      },
    );
  });

  it.each(sorts)(
    'uses stable database order and preserves boosts in %s',
    async (sort) => {
      // A run of promoted rows used to be capped/reordered after database sorting.
      const rows = [row('a', true), row('b', true), row('c', true), row('d')];
      findMany.mockResolvedValueOnce([]).mockResolvedValueOnce(rows);
      count.mockResolvedValue(4);
      const result = await service.list({ sort, limit: 4 });
      expect(result.items.map((item: { id: string }) => item.id)).toEqual([
        'a',
        'b',
        'c',
        'd',
      ]);
      const orderBy = [
        ...(sort === 'new'
          ? []
          : [
              {
                priceRub: {
                  sort: sort === 'cheap' ? 'asc' : 'desc',
                  nulls: 'last',
                },
              },
            ]),
        { createdAt: 'desc' },
        { id: 'asc' },
      ];
      expect(findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ orderBy }),
      );
    },
  );

  it('excludes VIP before counting and slicing, retaining all active filters', async () => {
    findMany
      .mockResolvedValueOnce([row('vip')])
      .mockResolvedValueOnce([row('ordinary')]);
    count.mockResolvedValue(1);
    const result = await service.list({
      sort: 'cheap',
      limit: 20,
      city: 'Краснодар',
      categoryId: 'hobby',
      priceMin: 500,
    });
    const where = {
      AND: [
        {
          status: 'ACTIVE',
          city: { equals: 'Краснодар', mode: 'insensitive' },
          categoryId: 'hobby',
          priceRub: { gte: 500 },
        },
        { id: { notIn: ['vip'] } },
      ],
    };
    expect(findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where, skip: 0, take: 20 }),
    );
    expect(count).toHaveBeenCalledWith({ where });
    expect(result.total).toBe(1);
    expect(result.items.map((item: { id: string }) => item.id)).toEqual([
      'ordinary',
    ]);
    expect(result.vipStrip.map((item: { id: string }) => item.id)).toEqual([
      'vip',
    ]);
  });
});
