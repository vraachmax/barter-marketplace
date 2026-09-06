import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { MeilisearchService } from '../search/meilisearch.service';
import { MediaStorageService } from '../storage/media-storage.service';
import { ListingsService } from '../listings/listings.service';
import { CategoriesService } from './categories.service';
import { categoryAllowsBarter } from './barter-policy';

describe('category barter policy', () => {
  it.each([
    'auto',
    'realty',
    'services',
    'electronics',
    'home',
    'clothes',
    'kids',
    'hobby',
  ])('allows %s', (slug) => {
    expect(categoryAllowsBarter(slug)).toBe(true);
  });
  it.each(['job', '', 'new-category'])('rejects %s', (slug) => {
    expect(categoryAllowsBarter(slug)).toBe(false);
  });

  const findCategory = jest.fn();
  const findListing = jest.fn();
  const update = jest.fn().mockResolvedValue({ id: 'listing' });
  const create = jest.fn().mockResolvedValue({ id: 'listing' });
  let listings: ListingsService;
  let categories: CategoriesService;
  beforeEach(async () => {
    jest.clearAllMocks();
    findCategory.mockResolvedValue({ slug: 'job' });
    findListing.mockResolvedValue({
      id: 'listing',
      ownerId: 'owner',
      categoryId: 'old',
      title: 'Item',
      description: 'Description',
      status: 'ACTIVE',
      attributes: { isBarter: true, brand: 'Keep me' },
    });
    const module = await Test.createTestingModule({
      providers: [
        ListingsService,
        CategoriesService,
        {
          provide: PrismaService,
          useValue: {
            category: {
              findUnique: findCategory,
              findMany: jest.fn().mockResolvedValue([
                { id: '1', slug: 'job' },
                { id: '2', slug: 'services' },
              ]),
            },
            listing: {
              findUnique: findListing,
              update,
              create,
              count: jest.fn().mockResolvedValue(0),
              findMany: jest.fn().mockResolvedValue([]),
            },
            userProSubscription: {
              findUnique: jest.fn().mockResolvedValue(null),
            },
          },
        },
        { provide: MeilisearchService, useValue: { isEnabled: () => false } },
        { provide: AnalyticsService, useValue: {} },
        { provide: MediaStorageService, useValue: {} },
      ],
    }).compile();
    listings = module.get(ListingsService);
    categories = module.get(CategoriesService);
  });
  it('exposes authoritative availability in categories', async () => {
    expect(await categories.list()).toEqual([
      { id: '1', slug: 'job', barterAllowed: false },
      { id: '2', slug: 'services', barterAllowed: true },
    ]);
  });
  it('rejects a crafted create request before writing', async () => {
    await expect(
      listings.create('owner', {
        title: 'Item',
        description: 'Description',
        city: 'City',
        categoryId: 'job',
        attributes: { isBarter: true },
      }),
    ).rejects.toThrow('barter_not_available_for_category');
    expect(create).not.toHaveBeenCalled();
  });
  it('allows a normal job listing without barter', async () => {
    await listings.create('owner', {
      title: 'Item',
      description: 'Description',
      city: 'City',
      categoryId: 'job',
      attributes: { isBarter: false },
    });
    expect(create).toHaveBeenCalled();
  });
  it('allows explicit barter in services', async () => {
    findCategory.mockResolvedValue({ slug: 'services' });
    await listings.create('owner', {
      title: 'Item',
      description: 'Description',
      city: 'City',
      categoryId: 'services',
      attributes: { isBarter: true },
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          attributes: { isBarter: true },
        }) as unknown,
      }),
    );
  });
  it('rejects a crafted update even if category is omitted', async () => {
    await expect(
      listings.update('owner', 'listing', { attributes: { isBarter: true } }),
    ).rejects.toThrow('barter_not_available_for_category');
    expect(update).not.toHaveBeenCalled();
  });
  it('clears stale opt-in when moving to a disallowed category without attributes', async () => {
    await listings.update('owner', 'listing', { categoryId: 'job' });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          categoryId: 'job',
          attributes: { isBarter: false, brand: 'Keep me' },
        }) as unknown,
      }),
    );
  });
  it('rejects a missing category', async () => {
    findCategory.mockResolvedValue(null);
    await expect(
      listings.create('owner', {
        title: 'Item',
        description: 'Description',
        city: 'City',
        categoryId: 'missing',
      }),
    ).rejects.toThrow('category_not_found');
    expect(create).not.toHaveBeenCalled();
  });
});
