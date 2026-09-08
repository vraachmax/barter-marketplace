import { Test } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AnalyticsService } from '../analytics/analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { MeilisearchService } from '../search/meilisearch.service';
import { MediaStorageService } from '../storage/media-storage.service';
import { CreateListingDto, UpdateListingDto } from './dto';
import { LISTING_SORTS } from './list-listings-query.dto';
import { ListingsService } from './listings.service';

describe('exchange eligibility', () => {
  let service: ListingsService;
  const findMany = jest.fn().mockResolvedValue([]);
  const count = jest.fn().mockResolvedValue(0);
  const searchListings = jest
    .fn()
    .mockResolvedValue({ hits: [], estimatedTotalHits: 0 });

  beforeEach(async () => {
    jest.clearAllMocks();
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

  it.each(LISTING_SORTS)(
    'filters barter before VIP, pagination and counting with sort=%s',
    async (sort) => {
      await service.list({
        mode: 'barter',
        q: 'велосипед',
        city: 'Краснодар',
        categoryId: 'hobby',
        priceMin: 1000,
        sort,
        page: 2,
        limit: 20,
        lat: 0,
        lon: 0,
      });
      const eligibility: unknown = expect.objectContaining({
        status: 'ACTIVE',
        attributes: { path: ['isBarter'], equals: true },
        category: {
          slug: {
            in: [
              'auto',
              'realty',
              'services',
              'electronics',
              'home',
              'clothes',
              'kids',
              'hobby',
            ],
          },
        },
        city: { equals: 'Краснодар', mode: 'insensitive' },
        categoryId: 'hobby',
        priceRub: { gte: 1000 },
      });
      expect(findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: { AND: [eligibility, expect.any(Object)] },
        }),
      );
      expect(findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ where: eligibility }),
      );
      if (sort !== 'nearby')
        expect(count).toHaveBeenCalledWith({ where: eligibility });
      expect(searchListings).not.toHaveBeenCalled();
    },
  );

  it('keeps the existing Market search path', async () => {
    await service.list({ mode: 'market', q: 'велосипед' });
    expect(searchListings).toHaveBeenCalledTimes(1);
  });

  it.each([true, false, undefined])(
    'derives the badge only from explicit boolean %s',
    async (isBarter) => {
      const row = {
        id: 'listing-1',
        title: 'Велосипед',
        priceRub: 1000,
        city: 'Краснодар',
        createdAt: new Date(),
        category: { id: 'hobby', title: 'Хобби' },
        owner: { id: 'seller', name: null },
        images: [],
        promotions: [],
        attributes: isBarter === undefined ? null : { isBarter },
      };
      findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([row]);
      const result = await service.list({ sort: 'new' });
      expect(result.items[0]).toMatchObject({
        id: 'listing-1',
        isBarter: isBarter === true,
      });
      expect(result.items[0]).not.toHaveProperty('attributes');
    },
  );
});

describe.each([CreateListingDto, UpdateListingDto])(
  'explicit seller choice in %p',
  (Dto) => {
    it.each([true, false])(
      'accepts boolean %s and preserves other attributes',
      async (isBarter) => {
        const dto = plainToInstance(Dto, {
          title: 'Велосипед',
          description: 'Описание велосипеда',
          city: 'Краснодар',
          categoryId: 'hobby',
          attributes: { isBarter, brand: 'Stels' },
        });
        expect(await validate(dto)).toHaveLength(0);
      },
    );
    it.each(['true', 'false', 1, 0, null])(
      'rejects non-boolean %p',
      async (isBarter) => {
        const dto = plainToInstance(Dto, { attributes: { isBarter } });
        expect(
          (await validate(dto)).some(
            (error) => error.property === 'attributes',
          ),
        ).toBe(true);
      },
    );
  },
);
