import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AnalyticsService } from '../analytics/analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { MeilisearchService } from '../search/meilisearch.service';
import {
  CreateListingDto,
  PromoteListingDto,
  ReorderListingImagesDto,
  UpdateListingDto,
  UpdateListingStatusDto,
} from './dto';
import * as bcrypt from 'bcrypt';
import { ListingStatus, Prisma, PromotionType } from '@prisma/client';
import {
  allocatePaidPromotionSlots,
  isBoostPromotionType,
  isVipPromotionType,
  mergeOrganicAndBoostFeeds,
  promotionBoost,
  rankListings,
  slicePageWithBoostCap,
  type ListingRankInput,
  type ScoredRow,
} from './listing-ranking';
import { listingBodySimilarity } from './listing-text-similarity';
import { haversineDistanceKm } from './haversine';

type SortType = 'relevant' | 'new' | 'cheap' | 'expensive' | 'nearby';

type GeoQuery = { lat: number; lon: number; radiusKm: number };

/** Лимит публикаций с одного аккаунта за календарные сутки (UTC). */
const MAX_LISTINGS_PER_DAY = 9;
/** Порог схожести title+description с существующим объявлением (отклонить). */
const DUPLICATE_LISTING_SIMILARITY = 0.9;
/** После этой числа жалоб объявление скрывается (строго больше 3 → с 4-й). */
const REPORT_COUNT_TO_BLOCK = 3;

/** TOP/XL — boost (поднятие в скоринге); VIP — отдельная полоса сверху, без boost_weight. */
const promotionWeightByType: Record<PromotionType, number> = {
  TOP: 200,
  VIP: 120,
  XL: 80,
};

const querySynonyms: Record<string, string[]> = {
  машига: ['машина', 'авто', 'автомобиль'],
  машина: ['авто', 'автомобиль', 'sedan', 'kia', 'hyundai'],
  авто: ['машина', 'автомобиль'],
  автомобиль: ['машина', 'авто'],
  квартира: ['недвижимость', 'жилье', 'аренда'],
  жилье: ['квартира', 'недвижимость', 'аренда'],
  аренда: ['квартира', 'жилье', 'недвижимость'],
  телефон: ['смартфон', 'iphone', 'samsung'],
  смартфон: ['телефон', 'iphone', 'samsung'],
};

@Injectable()
export class ListingsService {
  constructor(
    private prisma: PrismaService,
    private readonly meili: MeilisearchService,
    private readonly analytics: AnalyticsService,
  ) {}

  private startOfUtcDay(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  /** Не более MAX_LISTINGS_PER_DAY созданий за текущие сутки UTC. */
  private async assertListingDailyLimit(ownerId: string) {
    const from = this.startOfUtcDay(new Date());
    const count = await this.prisma.listing.count({
      where: { ownerId, createdAt: { gte: from } },
    });
    if (count >= MAX_LISTINGS_PER_DAY) {
      throw new BadRequestException({
        message: 'listing_daily_limit',
        maxPerDay: MAX_LISTINGS_PER_DAY,
      });
    }
  }

  /**
   * Дубликат: схожесть title+description с любым ACTIVE/PENDING объявлением ≥ порога.
   */
  private async assertNotDuplicateListingText(
    title: string,
    description: string,
    excludeListingId?: string,
  ) {
    const candidates = await this.prisma.listing.findMany({
      where: {
        status: { in: [ListingStatus.ACTIVE, ListingStatus.PENDING] },
        ...(excludeListingId ? { id: { not: excludeListingId } } : {}),
      },
      select: { title: true, description: true },
      orderBy: { createdAt: 'desc' },
      take: 3000,
    });
    for (const c of candidates) {
      if (
        listingBodySimilarity(title, description, c.title, c.description) >= DUPLICATE_LISTING_SIMILARITY
      ) {
        throw new BadRequestException({
          message: 'listing_duplicate_similarity',
          threshold: DUPLICATE_LISTING_SIMILARITY,
        });
      }
    }
  }

  private expandQueryTerms(raw: string): string[] {
    const q = raw.trim().toLowerCase();
    if (!q) return [];
    const terms = new Set<string>([q]);

    const words = q.split(/\s+/).filter(Boolean);
    for (const word of words) {
      terms.add(word);
      const mapped = querySynonyms[word];
      if (mapped) for (const x of mapped) terms.add(x);
    }

    const wholeMapped = querySynonyms[q];
    if (wholeMapped) for (const x of wholeMapped) terms.add(x);

    return Array.from(terms).filter((x) => x.length >= 2).slice(0, 10);
  }

  private async assertOwner(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, ownerId: true },
    });
    if (!listing) throw new NotFoundException('listing_not_found');
    if (listing.ownerId !== userId) throw new ForbiddenException('not_listing_owner');
    return listing;
  }

  private selectCard(now: Date) {
    return {
      id: true,
      title: true,
      priceRub: true,
      priceType: true,
      city: true,
      latitude: true,
      longitude: true,
      createdAt: true,
      category: { select: { id: true, title: true } },
      owner: { select: { id: true, name: true } },
      images: {
        orderBy: { sortOrder: 'asc' as const },
        select: { id: true, url: true, sortOrder: true },
      },
      promotions: {
        where: { startsAt: { lte: now }, endsAt: { gte: now } },
        orderBy: { weight: 'desc' as const },
        take: 1,
        select: { type: true, weight: true, endsAt: true },
      },
    };
  }

  /** Поля для формулы ранжирования (релевантность, вовлечённость, цена к медиане категории). */
  private selectForRanking(now: Date): Prisma.ListingSelect {
    return {
      ...this.selectCard(now),
      description: true,
      categoryId: true,
      ownerId: true,
      viewsCount: true,
      clicksCount: true,
      _count: { select: { favorites: true } },
      owner: { select: { id: true, name: true, responseRate: true } },
    };
  }

  /** Карточка ленты + флаги платного продвижения (boost / VIP). */
  private toFeedCard(
    x: {
      id: string;
      title: string;
      priceRub: number | null;
      city: string;
      latitude?: number | null;
      longitude?: number | null;
      createdAt: Date;
      category: { id: string; title: string };
      owner: { id: string; name: string | null };
      images: Array<{ id: string; url: string; sortOrder: number }>;
      promotions: Array<{ type: PromotionType; weight: number; endsAt: Date }>;
    },
    opts?: { distanceKm?: number },
  ) {
    const promo = x.promotions[0];
    const { promotions: _p, ...rest } = x;
    return {
      ...rest,
      images: x.images,
      promoType: promo?.type ?? null,
      promoEndsAt: promo?.endsAt ?? null,
      isBoosted: isBoostPromotionType(promo?.type),
      isVip: isVipPromotionType(promo?.type),
      ...(opts?.distanceKm != null ? { distanceKm: opts.distanceKm } : {}),
    };
  }

  /** lat/lon в градусах WGS-84; radiusKm по умолчанию 50, диапазон 1…500 км. */
  private parseGeoQuery(params: {
    lat?: number;
    lon?: number;
    radiusKm?: number;
  }): GeoQuery | null {
    const { lat, lon, radiusKm } = params;
    if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      return null;
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
    let r = typeof radiusKm === 'number' && Number.isFinite(radiusKm) ? radiusKm : 50;
    r = Math.min(500, Math.max(1, Math.round(r)));
    return { lat, lon, radiusKm: r };
  }

  /** VIP-полоса сверху + лимит буст-слотов на страницу (≤20% выдачи вместе с VIP). */
  private async loadVipStripAndBudget(
    baseWhere: Prisma.ListingWhereInput,
    now: Date,
    limit: number,
    geo: GeoQuery | null,
  ): Promise<{ vipStrip: any[]; vipIds: Set<string>; boostSlotsPerPage: number }> {
    let vipCandidates = await this.prisma.listing.findMany({
      where: {
        AND: [
          baseWhere,
          {
            promotions: {
              some: {
                type: 'VIP',
                startsAt: { lte: now },
                endsAt: { gte: now },
              },
            },
          },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: Math.min(48, limit + 24),
      select: this.selectCard(now),
    });
    if (geo) {
      vipCandidates = vipCandidates
        .filter((c) => c.latitude != null && c.longitude != null)
        .map((c) => ({
          c,
          d: haversineDistanceKm(geo.lat, geo.lon, c.latitude!, c.longitude!),
        }))
        .filter((x) => x.d <= geo.radiusKm)
        .sort((a, b) => a.d - b.d)
        .map((x) => x.c);
    }
    const { vipSlots, boostSlotsPerPage } = allocatePaidPromotionSlots(limit, vipCandidates.length);
    const stripRows = vipCandidates.slice(0, vipSlots);
    return {
      vipStrip: stripRows.map((r) =>
        this.toFeedCard(
          r,
          geo && r.latitude != null && r.longitude != null
            ? {
                distanceKm:
                  Math.round(haversineDistanceKm(geo.lat, geo.lon, r.latitude, r.longitude) * 10) / 10,
              }
            : undefined,
        ),
      ),
      vipIds: new Set(stripRows.map((r) => r.id)),
      boostSlotsPerPage,
    };
  }

  async ensureSeed() {
    const count = await this.prisma.listing.count();
    if (count >= 24) return;

    const categories = await this.prisma.category.findMany({
      select: { id: true, slug: true },
    });
    if (categories.length === 0) return;
    const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));
    const pickCategory = (slug: string) =>
      categoryBySlug.get(slug) ?? categories[0].id;

    const email = 'demo@barter.local';
    const user =
      (await this.prisma.user.findUnique({ where: { email } })) ??
      (await this.prisma.user.create({
        data: {
          email,
          passwordHash: await bcrypt.hash('password123', 10),
          name: 'Демо продавец',
        },
      }));
    const secondEmail = 'owner2@barter.local';
    const user2 =
      (await this.prisma.user.findUnique({ where: { email: secondEmail } })) ??
      (await this.prisma.user.create({
        data: {
          email: secondEmail,
          passwordHash: await bcrypt.hash('password123', 10),
          name: 'Марина Петрова',
        },
      }));

    const templates: Array<{
      slug: string;
      title: string;
      description: string;
      priceRub: number | null;
      city: string;
      owner: 1 | 2;
    }> = [
      { slug: 'electronics', title: 'iPhone 14 Pro Max 256 ГБ', description: 'Отличное состояние, полный комплект.', priceRub: 122000, city: 'Москва', owner: 1 },
      { slug: 'electronics', title: 'Samsung Galaxy S23 256 ГБ', description: 'Почти новый, без сколов.', priceRub: 68000, city: 'Москва', owner: 2 },
      { slug: 'electronics', title: 'MacBook Pro 14 M1 16 ГБ', description: 'Для работы и учебы, батарея 92%.', priceRub: 133000, city: 'Санкт‑Петербург', owner: 1 },
      {
        slug: 'auto',
        title: 'Hyundai Solaris 2019',
        description: 'Один владелец, семейная машина, обслуживался у дилера.',
        priceRub: 940000,
        city: 'Москва',
        owner: 2,
      },
      { slug: 'auto', title: 'Kia Rio 2018, автомат', description: 'Без ДТП, ПТС оригинал.', priceRub: 890000, city: 'Казань', owner: 1 },
      { slug: 'realty', title: 'Сдам 1-комн. квартиру, 38 м²', description: 'Аренда от собственника, рядом метро.', priceRub: 55000, city: 'Москва', owner: 2 },
      { slug: 'realty', title: 'Сдам студию 26 м², центр', description: 'Новый ремонт, аренда на длительный срок.', priceRub: 47000, city: 'Москва', owner: 1 },
      { slug: 'realty', title: 'Сдам 2-комн. квартиру, 52 м²', description: 'Семейной паре, без животных.', priceRub: 69000, city: 'Санкт‑Петербург', owner: 2 },
      { slug: 'realty', title: 'Аренда апартаментов 30 м²', description: 'Вид на парк, тихий район.', priceRub: 58000, city: 'Москва', owner: 1 },
      { slug: 'services', title: 'Ремонт стиральных машин', description: 'Выезд в день обращения, гарантия 6 мес.', priceRub: 2500, city: 'Москва', owner: 2 },
      { slug: 'services', title: 'Уборка квартиры', description: 'Генеральная или поддерживающая уборка.', priceRub: 3200, city: 'Казань', owner: 1 },
      { slug: 'job', title: 'Требуется курьер', description: 'Гибкий график, выплаты каждую неделю.', priceRub: 70000, city: 'Москва', owner: 2 },
      { slug: 'job', title: 'Вакансия: менеджер по продажам', description: 'Удаленно, оклад + бонусы.', priceRub: 90000, city: 'Санкт‑Петербург', owner: 1 },
      { slug: 'home', title: 'Кофемашина Delonghi Dedica', description: 'В отличном состоянии, использовалась редко.', priceRub: 18000, city: 'Москва', owner: 1 },
      { slug: 'home', title: 'Робот-пылесос Xiaomi', description: 'Сухая и влажная уборка, комплект полный.', priceRub: 14000, city: 'Москва', owner: 2 },
      { slug: 'clothes', title: 'Кожаная куртка, размер M', description: 'Натуральная кожа, сезон весна-осень.', priceRub: 9500, city: 'Казань', owner: 1 },
      { slug: 'clothes', title: 'Кроссовки Nike Air, 42', description: 'Оригинал, почти не носились.', priceRub: 7600, city: 'Санкт‑Петербург', owner: 2 },
      { slug: 'kids', title: 'Детская коляска 2-в-1', description: 'Полный комплект, после одного ребенка.', priceRub: 16500, city: 'Москва', owner: 2 },
      { slug: 'kids', title: 'Детская кроватка с матрасом', description: 'Состояние отличное, самовывоз.', priceRub: 8500, city: 'Казань', owner: 1 },
      { slug: 'hobby', title: 'PlayStation 5 + 2 геймпада', description: 'Гарантия еще 8 месяцев.', priceRub: 53000, city: 'Москва', owner: 2 },
      { slug: 'hobby', title: 'Горный велосипед Trek', description: 'Размер рамы M, обслужен перед сезоном.', priceRub: 42000, city: 'Санкт‑Петербург', owner: 1 },
      { slug: 'electronics', title: 'iPad Air 5 64 ГБ', description: 'Идеален для учебы, без царапин.', priceRub: 47000, city: 'Москва', owner: 2 },
      { slug: 'realty', title: 'Сдам комнату 18 м²', description: 'Аренда, коммуналка включена.', priceRub: 28000, city: 'Москва', owner: 1 },
      { slug: 'services', title: 'Репетитор по математике', description: 'Подготовка к ОГЭ/ЕГЭ, онлайн.', priceRub: 1400, city: 'Санкт‑Петербург', owner: 2 },
    ];

    const CITY_GEO: Record<string, { lat: number; lon: number }> = {
      Москва: { lat: 55.7558, lon: 37.6173 },
      'Санкт‑Петербург': { lat: 59.9343, lon: 30.3351 },
      Казань: { lat: 55.7887, lon: 49.1221 },
    };
    const jitterGeo = (city: string, title: string) => {
      const base = CITY_GEO[city] ?? CITY_GEO['Москва'];
      let h = 0;
      for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) | 0;
      const da = ((h % 200) - 100) / 8000;
      const db = (((h >> 8) % 200) - 100) / 8000;
      return { latitude: base.lat + da, longitude: base.lon + db };
    };

    const existing = await this.prisma.listing.findMany({
      select: { title: true },
    });
    const existingTitles = new Set(existing.map((x) => x.title.trim().toLowerCase()));

    const data = templates
      .filter((x) => !existingTitles.has(x.title.trim().toLowerCase()))
      .map((x) => {
        const { latitude, longitude } = jitterGeo(x.city, x.title);
        return {
          title: x.title,
          description: x.description,
          priceRub: x.priceRub,
          city: x.city,
          latitude,
          longitude,
          categoryId: pickCategory(x.slug),
          ownerId: x.owner === 1 ? user.id : user2.id,
        };
      });

    if (data.length > 0) {
      await this.prisma.listing.createMany({ data });
      if (this.meili.isEnabled()) {
        void this.meili.reindexAllActive().catch(() => undefined);
      }
    }

    await this.backfillMissingCoordinates(CITY_GEO);
  }

  /** Публичный вызов backfill координат при старте приложения. */
  async ensureCoordinates() {
    const CITY_GEO: Record<string, { lat: number; lon: number }> = {
      Москва: { lat: 55.7558, lon: 37.6173 },
      'Санкт‑Петербург': { lat: 59.9343, lon: 30.3351 },
      'Санкт-Петербург': { lat: 59.9343, lon: 30.3351 },
      Казань: { lat: 55.7887, lon: 49.1221 },
    };
    await this.backfillMissingCoordinates(CITY_GEO);
  }

  private async backfillMissingCoordinates(
    cityGeo: Record<string, { lat: number; lon: number }>,
  ) {
    const noCoords = await this.prisma.listing.findMany({
      where: { latitude: null, status: 'ACTIVE' },
      select: { id: true, city: true, title: true },
      take: 500,
    });
    if (noCoords.length === 0) return;
    for (const row of noCoords) {
      const base = cityGeo[row.city] ?? cityGeo['Москва'] ?? { lat: 55.7558, lon: 37.6173 };
      let h = 0;
      for (let i = 0; i < row.title.length; i++) h = (h * 31 + row.title.charCodeAt(i)) | 0;
      const lat = base.lat + ((h % 200) - 100) / 8000;
      const lon = base.lon + (((h >> 8) % 200) - 100) / 8000;
      await this.prisma.listing.update({
        where: { id: row.id },
        data: { latitude: lat, longitude: lon },
      });
    }
  }

  async create(userId: string, dto: CreateListingDto) {
    await this.assertListingDailyLimit(userId);
    await this.assertNotDuplicateListingText(dto.title, dto.description);

    const row = await this.prisma.listing.create({
      data: {
        title: dto.title,
        description: dto.description,
        priceRub: dto.priceRub ?? null,
        city: dto.city,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        categoryId: dto.categoryId,
        ownerId: userId,
        status: ListingStatus.ACTIVE,
        duplicateImageFlag: false,
        ...(dto.attributes !== undefined && dto.attributes !== null
          ? { attributes: dto.attributes as Prisma.InputJsonValue }
          : {}),
      },
      select: {
        id: true,
        title: true,
        priceRub: true,
        city: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        status: true,
        duplicateImageFlag: true,
        attributes: true,
        category: { select: { id: true, title: true } },
        owner: { select: { id: true, name: true } },
        images: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, url: true, sortOrder: true },
        },
      },
    });
    if (this.meili.isEnabled()) {
      void this.meili.upsertListingById(row.id);
    }
    return row;
  }

  /**
   * Полнотекстовый поиск через Meilisearch.
   * При сетевой ошибке — null, вызывающий код падает обратно на Prisma.
   */
  private async tryListViaMeilisearch(params: {
    q: string;
    categoryId?: string;
    city?: string;
    priceMin?: number;
    priceMax?: number;
    page: number;
    limit: number;
    skip: number;
    now: Date;
    sortType: SortType;
    vipStrip: any[];
    vipIds: Set<string>;
    boostSlotsPerPage: number;
  }) {
    let hits: Array<{ id: string }>;
    let estimatedTotalHits: number;
    try {
      const meiliSort =
        params.sortType === 'nearby' ? 'relevant' : params.sortType;
      const res = await this.meili.searchListings(params.q, {
        categoryId: params.categoryId,
        city: params.city,
        priceMin: params.priceMin,
        priceMax: params.priceMax,
        sort: meiliSort,
        offset: params.skip,
        limit: params.limit + 32,
      });
      hits = res.hits;
      estimatedTotalHits = res.estimatedTotalHits;
    } catch {
      return null;
    }

    const ids = hits.map((h) => h.id);
    if (ids.length === 0) {
      return {
        page: params.page,
        limit: params.limit,
        total: estimatedTotalHits,
        vipStrip: params.vipStrip,
        items: [],
      };
    }

    const rows = await this.prisma.listing.findMany({
      where: { id: { in: ids }, status: 'ACTIVE' },
      select: this.selectCard(params.now),
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const ordered = ids
      .map((id) => byId.get(id))
      .filter((x): x is (typeof rows)[number] => x != null)
      .filter((x) => !params.vipIds.has(x.id));

    const scored: ScoredRow<(typeof rows)[number]>[] = ordered.map((raw, i) => ({
      raw,
      finalScore: 10_000 - i,
    }));

    const pageSlice = slicePageWithBoostCap(
      scored,
      0,
      params.limit,
      params.boostSlotsPerPage,
      (raw) => isBoostPromotionType(raw.promotions[0]?.type),
    );

    const items = pageSlice.map((s) => this.toFeedCard(s.raw));

    return {
      page: params.page,
      limit: params.limit,
      total: estimatedTotalHits,
      vipStrip: params.vipStrip,
      items,
    };
  }

  /**
   * Выдача «рядом»: только объявления с координатами, в пределах радиуса (Haversine), сортировка по расстоянию.
   */
  private async listNearbyPage(args: {
    where: Prisma.ListingWhereInput;
    geo: GeoQuery;
    page: number;
    limit: number;
    skip: number;
    now: Date;
    vipStrip: any[];
    vipIds: Set<string>;
  }) {
    const maxPool = 3000;
    const pool = await this.prisma.listing.findMany({
      where: args.where,
      take: maxPool,
      select: this.selectCard(args.now),
    });
    const withDist = pool
      .filter((r) => r.latitude != null && r.longitude != null)
      .map((r) => ({
        raw: r,
        distanceKm: haversineDistanceKm(args.geo.lat, args.geo.lon, r.latitude!, r.longitude!),
      }))
      .filter((x) => x.distanceKm <= args.geo.radiusKm)
      .sort(
        (a, b) =>
          a.distanceKm - b.distanceKm ||
          +new Date(b.raw.createdAt) - +new Date(a.raw.createdAt),
      );

    const main = withDist.filter((x) => !args.vipIds.has(x.raw.id));
    const total = main.length;
    const pageRows = main.slice(args.skip, args.skip + args.limit);
    const items = pageRows.map((x) =>
      this.toFeedCard(x.raw, { distanceKm: Math.round(x.distanceKm * 10) / 10 }),
    );
    return {
      page: args.page,
      limit: args.limit,
      total,
      vipStrip: args.vipStrip,
      items,
    };
  }

  async list(params: {
    q?: string;
    categoryId?: string;
    city?: string;
    sort?: SortType;
    lat?: number;
    lon?: number;
    radiusKm?: number;
    priceMin?: number;
    priceMax?: number;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;
    const now = new Date();
    const sort: SortType = params.sort ?? 'relevant';
    const qTrim = params.q?.trim() ?? '';
    const geo = this.parseGeoQuery(params);

    if (sort === 'nearby') {
      if (!geo) {
        throw new BadRequestException({
          message: 'nearby_requires_lat_lon',
          hint: 'Укажите query-параметры lat и lon (WGS-84), опционально radiusKm (1–500, по умолчанию 50).',
        });
      }
    }

    const where: Prisma.ListingWhereInput = {
      status: 'ACTIVE',
    };
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.city) where.city = { equals: params.city, mode: 'insensitive' };
    if (typeof params.priceMin === 'number' || typeof params.priceMax === 'number') {
      const min = typeof params.priceMin === 'number' ? Math.max(0, Math.floor(params.priceMin)) : undefined;
      const max = typeof params.priceMax === 'number' ? Math.max(0, Math.floor(params.priceMax)) : undefined;
      if (typeof min === 'number' && typeof max === 'number') {
        where.priceRub = { gte: Math.min(min, max), lte: Math.max(min, max) };
      } else if (typeof min === 'number') {
        where.priceRub = { gte: min };
      } else if (typeof max === 'number') {
        where.priceRub = { lte: max };
      }
    }
    if (qTrim.length > 0) {
      const terms = this.expandQueryTerms(qTrim);
      where.OR = terms.flatMap((term) => [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
        { category: { title: { contains: term, mode: 'insensitive' } } },
      ]);
    }
    if (sort === 'nearby') {
      where.latitude = { not: null };
      where.longitude = { not: null };
    }

    const geoForVip = sort === 'nearby' && geo ? geo : null;
    const { vipStrip, vipIds, boostSlotsPerPage } = await this.loadVipStripAndBudget(where, now, limit, geoForVip);

    if (sort === 'nearby' && geo) {
      return this.listNearbyPage({ where, geo, page, limit, skip, now, vipStrip, vipIds });
    }

    if (qTrim.length > 0 && this.meili.isEnabled()) {
      const viaMeili = await this.tryListViaMeilisearch({
        q: qTrim,
        categoryId: params.categoryId,
        city: params.city,
        priceMin: params.priceMin,
        priceMax: params.priceMax,
        page,
        limit,
        skip,
        now,
        sortType: sort,
        vipStrip,
        vipIds,
        boostSlotsPerPage,
      });
      if (viaMeili !== null && (viaMeili.total > 0 || viaMeili.items.length > 0)) {
        return viaMeili;
      }
    }

    const orderBy =
      sort === 'cheap'
        ? [{ priceRub: 'asc' as const }, { createdAt: 'desc' as const }]
        : sort === 'expensive'
          ? [{ priceRub: 'desc' as const }, { createdAt: 'desc' as const }]
          : [{ createdAt: 'desc' as const }];

    const mergePriceNewPage = async () => {
      const take = Math.min(skip + limit + 80, 400);
      const [pool, total] = await Promise.all([
        this.prisma.listing.findMany({
          where,
          orderBy,
          skip: 0,
          take,
          select: this.selectCard(now),
        }),
        this.prisma.listing.count({ where }),
      ]);
      const nonVip = pool.filter((x) => !vipIds.has(x.id));
      const scored: ScoredRow<(typeof pool)[number]>[] = nonVip.map((raw) => ({ raw, finalScore: 0 }));
      const organic = scored.filter((s) => !isBoostPromotionType(s.raw.promotions[0]?.type));
      const boosted = scored.filter((s) => isBoostPromotionType(s.raw.promotions[0]?.type));
      const merged = mergeOrganicAndBoostFeeds(organic, boosted, boostSlotsPerPage);
      const pageSlice = slicePageWithBoostCap(
        merged,
        skip,
        limit,
        boostSlotsPerPage,
        (raw) => isBoostPromotionType(raw.promotions[0]?.type),
      );
      const items = pageSlice.map((s) => this.toFeedCard(s.raw));
      return { page, limit, total, vipStrip, items };
    };

    if (sort === 'new' || sort === 'cheap' || sort === 'expensive') {
      return mergePriceNewPage();
    }

    if (sort === 'relevant') {
      const poolTake = Math.max(200, page * limit * 3);
      const [pool, total] = await Promise.all([
        this.prisma.listing.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }],
          take: poolTake,
          select: this.selectForRanking(now),
        }),
        this.prisma.listing.count({ where }),
      ]);

      const nonVipPool = pool.filter((p) => !vipIds.has(p.id));

      const ownerIds = [...new Set(nonVipPool.map((x) => x.ownerId))];
      const ratingRows =
        ownerIds.length === 0
          ? []
          : await this.prisma.sellerReview.groupBy({
              by: ['sellerId'],
              where: { sellerId: { in: ownerIds } },
              _avg: { rating: true },
            });
      const ratingBySeller = new Map<string, number>();
      for (const row of ratingRows) {
        if (row._avg.rating != null) ratingBySeller.set(row.sellerId, row._avg.rating);
      }

      const rankInputs: ListingRankInput[] = nonVipPool.map((x) => ({
        id: x.id,
        title: x.title,
        description: x.description,
        priceRub: x.priceRub,
        createdAt: x.createdAt,
        viewsCount: x.viewsCount,
        clicksCount: x.clicksCount,
        favoritesCount: x._count.favorites,
        categoryId: x.categoryId,
        ownerId: x.ownerId,
        sellerRating: ratingBySeller.get(x.ownerId) ?? null,
        sellerResponseRate: x.owner.responseRate,
      }));

      const ranked = rankListings(qTrim || undefined, rankInputs, now);
      const poolById = new Map(nonVipPool.map((p) => [p.id, p]));

      const scoredRows: ScoredRow<(typeof nonVipPool)[number]>[] = ranked.map((r) => {
        const raw = poolById.get(r.id);
        if (!raw) {
          throw new Error(`listing_rank_inconsistency:${r.id}`);
        }
        const promo = raw.promotions[0];
        const boost = isBoostPromotionType(promo?.type) ? promotionBoost(promo?.weight ?? 0) : 0;
        return {
          raw,
          finalScore: r.score + boost,
        };
      });

      scoredRows.sort(
        (a, b) =>
          b.finalScore - a.finalScore ||
          +new Date(b.raw.createdAt) - +new Date(a.raw.createdAt),
      );

      const organic = scoredRows.filter((x) => !isBoostPromotionType(x.raw.promotions[0]?.type));
      const boosted = scoredRows.filter((x) => isBoostPromotionType(x.raw.promotions[0]?.type));
      const merged = mergeOrganicAndBoostFeeds(organic, boosted, boostSlotsPerPage);
      const pageSlice = slicePageWithBoostCap(
        merged,
        skip,
        limit,
        boostSlotsPerPage,
        (raw) => isBoostPromotionType(raw.promotions[0]?.type),
      );

      const items = pageSlice.map(({ raw }) => {
        const promo = raw.promotions[0];
        const { promotions: _p, _count: _c, description: _d, categoryId: _cid, ownerId: _oid, owner, ...rest } = raw;
        return {
          ...rest,
          owner: { id: owner.id, name: owner.name },
          images: raw.images,
          promoType: promo?.type ?? null,
          promoEndsAt: promo?.endsAt ?? null,
          isBoosted: isBoostPromotionType(promo?.type),
          isVip: isVipPromotionType(promo?.type),
        };
      });

      return { page, limit, total, vipStrip, items };
    }

    throw new Error(`Unsupported listing sort: ${String(sort)}`);
  }

  async mapPins(
    bounds: { swLat: number; swLon: number; neLat: number; neLon: number },
    categoryId?: string,
    limit = 200,
  ) {
    const where: Prisma.ListingWhereInput = {
      status: 'ACTIVE',
      latitude: { not: null, gte: bounds.swLat, lte: bounds.neLat },
      longitude: { not: null, gte: bounds.swLon, lte: bounds.neLon },
      ...(categoryId ? { categoryId } : {}),
    };
    const rows = await this.prisma.listing.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        priceRub: true,
        priceType: true,
        city: true,
        latitude: true,
        longitude: true,
        category: { select: { id: true, title: true } },
        images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
      },
    });
    return {
      pins: rows.map((r) => ({
        id: r.id,
        title: r.title,
        priceRub: r.priceRub,
        priceType: r.priceType,
        city: r.city,
        lat: r.latitude,
        lon: r.longitude,
        category: r.category.title,
        imageUrl: r.images[0]?.url ?? null,
      })),
    };
  }

  async get(id: string, req?: { headers?: any; cookies?: any }) {
    const now = new Date();
    const row = await this.prisma.listing.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        priceRub: true,
        city: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        status: true,
        duplicateImageFlag: true,
        ownerId: true,
        attributes: true,
        viewsCount: true,
        category: { select: { id: true, title: true } },
        owner: { select: { id: true, name: true, phone: true, email: true } },
        images: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, url: true, sortOrder: true },
        },
        promotions: {
          where: { startsAt: { lte: now }, endsAt: { gte: now } },
          orderBy: { weight: 'desc' },
          take: 1,
          select: { type: true, weight: true, endsAt: true },
        },
      },
    });
    if (!row) return null;

    const viewerId = req ? this.analytics.tryResolveUserId(req) : null;
    const isOwner = viewerId != null && viewerId === row.ownerId;
    const visibleToPublic =
      row.status === ListingStatus.ACTIVE || row.status === ListingStatus.SOLD;
    if (!visibleToPublic && !isOwner) {
      return null;
    }

    if (row.status === 'ACTIVE') {
      void this.prisma.listing
        .update({
          where: { id },
          data: { viewsCount: { increment: 1 } },
        })
        .catch(() => undefined);

      const sessionId =
        typeof req?.headers?.['x-session-id'] === 'string' ? req.headers['x-session-id'].trim() : '';
      const anonymousId =
        typeof req?.headers?.['x-anonymous-id'] === 'string' ? req.headers['x-anonymous-id'].trim() : '';
      const userId = sessionId ? this.analytics.tryResolveUserId(req ?? {}) : null;
      if (sessionId && (anonymousId || userId)) {
        void this.analytics
          .track({
            sessionId,
            userId,
            anonymousId: anonymousId || null,
            events: [{ type: 'VIEW_ITEM', listingId: id }],
          })
          .catch(() => undefined);
      }
    }

    const { ownerId: _oid, ...rest } = row;
    return rest;
  }

  /** Учёт клика по карточке в ленте (для engagement в ранжировании). */
  async recordClick(id: string) {
    const n = await this.prisma.listing.updateMany({
      where: { id, status: 'ACTIVE' },
      data: { clicksCount: { increment: 1 } },
    });
    return { ok: n.count > 0 };
  }

  /** Ключевые слова для «похожих»: title + description, без стоп-слов. */
  private keywordsForSimilarListings(title: string, description: string | null, minLen = 3, cap = 18) {
    const stop = new Set([
      'the',
      'and',
      'for',
      'with',
      'this',
      'that',
      'from',
      'как',
      'что',
      'это',
      'для',
      'или',
      'все',
      'всех',
      'при',
      'без',
      'ещё',
      'еще',
      'так',
      'там',
      'тут',
      'наш',
      'ваш',
      'мой',
      'его',
      'её',
      'ее',
      'они',
      'она',
      'оно',
      'они',
      'был',
      'была',
      'были',
      'есть',
      'будет',
      'можно',
      'нужно',
      'очень',
      'просто',
      'только',
      'уже',
      'еще',
    ]);
    const raw = `${title ?? ''} ${description ?? ''}`
      .toLowerCase()
      .split(/[^a-zA-Zа-яА-ЯёЁ0-9]+/)
      .filter((w) => w.length >= minLen && !stop.has(w));
    const out: string[] = [];
    const seen = new Set<string>();
    for (const w of raw) {
      if (seen.has(w)) continue;
      seen.add(w);
      out.push(w);
      if (out.length >= cap) break;
    }
    return out;
  }

  /**
   * Похожие объявления: та же категория, цена ±20% (если у базы задана цена > 0),
   * пересечение по ключевым словам (title + description). Сортировка: views+clicks, затем свежесть.
   */
  async similar(id: string, limit = 10, excludeIds: string[] = []) {
    const base = await this.prisma.listing.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        priceRub: true,
        categoryId: true,
        status: true,
      },
    });
    if (!base) throw new NotFoundException('listing_not_found');
    if (base.status !== ListingStatus.ACTIVE) {
      throw new NotFoundException('listing_not_found');
    }

    let keywordMinLen = 3;
    let keywords = this.keywordsForSimilarListings(base.title, base.description, keywordMinLen);
    if (keywords.length === 0) {
      keywordMinLen = 2;
      keywords = this.keywordsForSimilarListings(base.title, base.description, keywordMinLen, 12);
    }
    if (keywords.length === 0) {
      return [];
    }

    const keywordClause: Prisma.ListingWhereInput = {
      OR: keywords.flatMap((k) => [
        { title: { contains: k, mode: 'insensitive' } },
        { description: { contains: k, mode: 'insensitive' } },
      ]),
    };

    const where: Prisma.ListingWhereInput = {
      status: 'ACTIVE',
      id: { notIn: [base.id, ...excludeIds] },
      categoryId: base.categoryId,
      AND: [keywordClause],
    };

    if (typeof base.priceRub === 'number' && base.priceRub > 0) {
      const min = Math.floor(base.priceRub * 0.8);
      const max = Math.ceil(base.priceRub * 1.2);
      where.priceRub = { gte: min, lte: max };
    }

    const now = new Date();
    const take = Math.min(200, Math.max(50, limit * 15));

    const rows = await this.prisma.listing.findMany({
      where,
      take,
      select: {
        ...this.selectCard(now),
        description: true,
        viewsCount: true,
        clicksCount: true,
      },
    });

    const withOverlap = rows.filter((row) => {
      const rowKw = this.keywordsForSimilarListings(row.title, row.description, keywordMinLen, 40);
      const rowSet = new Set(rowKw);
      return keywords.some((k) => rowSet.has(k));
    });

    const sorted = withOverlap.sort((a, b) => {
      const engA = (a.viewsCount ?? 0) + (a.clicksCount ?? 0);
      const engB = (b.viewsCount ?? 0) + (b.clicksCount ?? 0);
      if (engB !== engA) return engB - engA;
      return +new Date(b.createdAt) - +new Date(a.createdAt);
    });

    return sorted.slice(0, limit).map((x) => {
      const promo = x.promotions[0];
      const { viewsCount: _v, clicksCount: _c, promotions, ...rest } = x;
      return {
        ...rest,
        promoType: promo?.type ?? null,
        promoEndsAt: promo?.endsAt ?? null,
      };
    });
  }

  async myListings(userId: string) {
    const now = new Date();
    const items = await this.prisma.listing.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        priceRub: true,
        city: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        status: true,
        duplicateImageFlag: true,
        attributes: true,
        category: { select: { id: true, title: true } },
        images: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, url: true, sortOrder: true },
        },
        promotions: {
          where: { startsAt: { lte: now }, endsAt: { gte: now } },
          orderBy: { weight: 'desc' },
          take: 1,
          select: { type: true, endsAt: true },
        },
      },
    });

    return items.map((x) => {
      const activePromotion = x.promotions[0] ?? null;
      return { ...x, activePromotion };
    });
  }

  async promote(userId: string, listingId: string, dto: PromoteListingDto) {
    await this.assertOwner(userId, listingId);

    const cur = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { status: true },
    });
    if (cur?.status !== ListingStatus.ACTIVE) {
      throw new BadRequestException('listing_not_active_for_promotion');
    }

    const days = Math.min(30, Math.max(1, dto.days ?? 3));
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + days * 24 * 60 * 60 * 1000);

    const promotion = await this.prisma.listingPromotion.create({
      data: {
        listingId,
        type: dto.type,
        startsAt,
        endsAt,
        weight: promotionWeightByType[dto.type],
      },
      select: {
        id: true,
        type: true,
        startsAt: true,
        endsAt: true,
      },
    });

    return { ok: true, promotion };
  }

  async update(userId: string, listingId: string, dto: UpdateListingDto) {
    await this.assertOwner(userId, listingId);

    const current = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        title: true,
        description: true,
        status: true,
      },
    });
    if (!current) throw new NotFoundException('listing_not_found');
    if (current.status === ListingStatus.BLOCKED) {
      throw new ForbiddenException('listing_blocked');
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
        select: { id: true },
      });
      if (!category) throw new NotFoundException('category_not_found');
    }

    const nextTitle = dto.title ?? current.title;
    const nextDesc = dto.description ?? current.description;
    if (dto.title !== undefined || dto.description !== undefined) {
      await this.assertNotDuplicateListingText(nextTitle, nextDesc, listingId);
    }

    const data: any = {};
    if (typeof dto.title === 'string') data.title = dto.title;
    if (typeof dto.description === 'string') data.description = dto.description;
    if (typeof dto.city === 'string') data.city = dto.city;
    if (dto.latitude !== undefined) data.latitude = dto.latitude;
    if (dto.longitude !== undefined) data.longitude = dto.longitude;
    if (typeof dto.categoryId === 'string') data.categoryId = dto.categoryId;
    if (typeof dto.priceRub === 'number') data.priceRub = dto.priceRub;
    if (dto.attributes !== undefined) {
      data.attributes = dto.attributes as Prisma.InputJsonValue;
    }

    if (dto.publishFromModeration === true) {
      if (current.status !== ListingStatus.PENDING) {
        throw new BadRequestException('listing_not_pending');
      }
      data.status = ListingStatus.ACTIVE;
    }

    const updated = await this.prisma.listing.update({
      where: { id: listingId },
      data,
      select: {
        id: true,
        title: true,
        description: true,
        priceRub: true,
        city: true,
        latitude: true,
        longitude: true,
        status: true,
        duplicateImageFlag: true,
        attributes: true,
        category: { select: { id: true, title: true } },
        images: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, url: true, sortOrder: true },
        },
      },
    });
    if (this.meili.isEnabled()) {
      void this.meili.upsertListingById(listingId);
    }
    return updated;
  }

  async updateStatus(userId: string, listingId: string, dto: UpdateListingStatusDto) {
    await this.assertOwner(userId, listingId);

    const cur = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { status: true },
    });
    if (!cur) throw new NotFoundException('listing_not_found');
    if (cur.status === ListingStatus.BLOCKED) {
      throw new ForbiddenException('listing_blocked');
    }
    if (
      dto.status === ListingStatus.BLOCKED ||
      dto.status === ListingStatus.PENDING
    ) {
      throw new ForbiddenException('forbidden_status_transition');
    }

    const row = await this.prisma.listing.update({
      where: { id: listingId },
      data: { status: dto.status as ListingStatus },
      select: {
        id: true,
        status: true,
      },
    });
    if (this.meili.isEnabled()) {
      if (row.status === ListingStatus.ACTIVE) {
        void this.meili.upsertListingById(listingId);
      } else {
        void this.meili.deleteListing(listingId);
      }
    }
    return row;
  }

  async remove(userId: string, listingId: string) {
    await this.assertOwner(userId, listingId);
    const chats = await this.prisma.chat.findMany({
      where: { listingId },
      select: { id: true },
    });
    const chatIds = chats.map((x) => x.id);

    await this.prisma.favorite.deleteMany({ where: { listingId } });
    await this.prisma.listingPromotion.deleteMany({ where: { listingId } });
    if (chatIds.length > 0) {
      await this.prisma.message.deleteMany({ where: { chatId: { in: chatIds } } });
      await this.prisma.chatUser.deleteMany({ where: { chatId: { in: chatIds } } });
      await this.prisma.chat.deleteMany({ where: { id: { in: chatIds } } });
    }
    await this.prisma.listing.delete({ where: { id: listingId } });
    if (this.meili.isEnabled()) {
      void this.meili.deleteListing(listingId);
    }
    return { ok: true };
  }

  async addImage(userId: string, listingId: string, url: string, sha256Hex?: string | null) {
    await this.assertOwner(userId, listingId);
    const max = await this.prisma.listingImage.aggregate({
      where: { listingId },
      _max: { sortOrder: true },
    });
    const sortOrder = (max._max.sortOrder ?? -1) + 1;

    const image = await this.prisma.listingImage.create({
      data: {
        listingId,
        url,
        sortOrder,
        sha256: sha256Hex?.trim() || null,
      },
      select: { id: true, url: true, sortOrder: true, sha256: true },
    });

    let duplicateImageWarning = false;
    let listingStatus: ListingStatus | undefined;

    if (sha256Hex?.trim()) {
      const dup = await this.prisma.listingImage.findFirst({
        where: {
          sha256: sha256Hex.trim(),
          listingId: { not: listingId },
        },
        select: { id: true },
      });
      if (dup) {
        duplicateImageWarning = true;
        const listing = await this.prisma.listing.findUnique({
          where: { id: listingId },
          select: { status: true },
        });
        if (listing?.status === ListingStatus.ACTIVE) {
          listingStatus = ListingStatus.PENDING;
          await this.prisma.listing.update({
            where: { id: listingId },
            data: {
              duplicateImageFlag: true,
              status: ListingStatus.PENDING,
            },
          });
          if (this.meili.isEnabled()) {
            void this.meili.deleteListing(listingId);
          }
        } else {
          await this.prisma.listing.update({
            where: { id: listingId },
            data: { duplicateImageFlag: true },
          });
        }
      }
    }

    const { sha256: _sh, ...imgPublic } = image;
    return {
      ...imgPublic,
      duplicateImageWarning,
      listingStatus,
    };
  }

  /** Жалоба на объявление; при > REPORT_COUNT_TO_BLOCK — статус BLOCKED. */
  async reportListing(listingId: string, reporterId: string, reason?: string | null) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, ownerId: true },
    });
    if (!listing) throw new NotFoundException('listing_not_found');
    if (listing.ownerId === reporterId) {
      throw new BadRequestException('cannot_report_own_listing');
    }

    try {
      await this.prisma.listingReport.create({
        data: {
          listingId,
          reporterId,
          reason: reason?.trim() ? reason.trim().slice(0, 500) : null,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const cnt = await this.prisma.listingReport.count({ where: { listingId } });
        return { ok: true, alreadyReported: true as const, reportsCount: cnt, blocked: false };
      }
      throw e;
    }

    const cnt = await this.prisma.listingReport.count({ where: { listingId } });
    let blocked = false;
    if (cnt > REPORT_COUNT_TO_BLOCK) {
      blocked = true;
      await this.prisma.listing.update({
        where: { id: listingId },
        data: { status: ListingStatus.BLOCKED },
      });
      if (this.meili.isEnabled()) {
        void this.meili.deleteListing(listingId);
      }
    }

    return { ok: true, alreadyReported: false as const, reportsCount: cnt, blocked };
  }

  async deleteImage(userId: string, listingId: string, imageId: string) {
    await this.assertOwner(userId, listingId);
    await this.prisma.listingImage.deleteMany({
      where: { id: imageId, listingId },
    });
    return { ok: true };
  }

  async reorderImages(userId: string, listingId: string, dto: ReorderListingImagesDto) {
    await this.assertOwner(userId, listingId);
    const images = await this.prisma.listingImage.findMany({
      where: { listingId },
      select: { id: true },
    });
    const existing = new Set(images.map((x) => x.id));
    for (const id of dto.imageIds) {
      if (!existing.has(id)) throw new NotFoundException('image_not_found');
    }

    await this.prisma.$transaction(
      dto.imageIds.map((id, idx) =>
        this.prisma.listingImage.update({
          where: { id },
          data: { sortOrder: idx },
        }),
      ),
    );
    return { ok: true };
  }
}

