import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MeiliSearch, type SearchParams, type SearchResponse } from 'meilisearch';
import { PrismaService } from '../prisma/prisma.service';
import { ListingStatus } from '@prisma/client';
import { MEILISEARCH_LISTING_SYNONYMS } from './search-synonyms';

const INDEX = 'listings';
/** Период попытки снова подключиться к Meili, если при старте был недоступен или сеть отвалилась */
const MEILI_RECONNECT_MS = Math.max(
  15_000,
  Number(process.env.MEILISEARCH_RECONNECT_MS ?? 45_000) || 45_000,
);

export type ListingSearchDoc = {
  id: string;
  title: string;
  description: string;
  city: string;
  categoryId: string;
  categoryTitle: string;
  priceRub: number;
  status: ListingStatus;
  createdAtTs: number;
};

@Injectable()
export class MeilisearchService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(MeilisearchService.name);
  private client: MeiliSearch | null = null;
  /** true только после успешного ping + настройки индекса (иначе поиск идёт через Prisma). */
  private meiliReady = false;
  private reconnectTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectBusy = false;

  constructor(private prisma: PrismaService) {
    const host = (process.env.MEILISEARCH_HOST ?? '').trim();
    const apiKey = (process.env.MEILISEARCH_API_KEY ?? '').trim();
    if (host) {
      this.client = new MeiliSearch({ host, apiKey: apiKey || undefined });
    }
  }

  isEnabled(): boolean {
    return this.client !== null && this.meiliReady;
  }

  /** Сброс после сетевой ошибки поиска — фоновые попытки снова включат Meili. */
  disableBecauseUnreachable(reason: string) {
    this.meiliReady = false;
    this.log.warn(
      `Meilisearch временно отключён (${reason}). Поиск через БД до восстановления связи.`,
    );
    this.startReconnectLoop();
  }

  private index() {
    if (!this.client) throw new Error('meilisearch_disabled');
    return this.client.index(INDEX);
  }

  onModuleDestroy() {
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /** Поднять индекс и meiliReady; не бросает — только лог и false при ошибке. */
  private async tryBootstrapIndex(): Promise<boolean> {
    if (this.client === null) return false;
    try {
      await this.ensureIndexSettings();
      await this.reindexIfEmpty();
      this.meiliReady = true;
      this.log.log('Meilisearch: индекс listings подключён');
      return true;
    } catch (e) {
      this.meiliReady = false;
      const msg = e instanceof Error ? e.message : String(e);
      this.log.warn(
        `Meilisearch недоступен (${msg}). Поиск через Prisma; повторная попытка через ${MEILI_RECONNECT_MS / 1000} с.`,
      );
      return false;
    }
  }

  private startReconnectLoop() {
    if (this.client === null || this.reconnectTimer) return;
    this.reconnectTimer = setInterval(() => {
      void (async () => {
        if (this.reconnectBusy) return;
        if (this.meiliReady || this.client === null) {
          if (this.reconnectTimer) {
            clearInterval(this.reconnectTimer);
            this.reconnectTimer = null;
          }
          return;
        }
        this.reconnectBusy = true;
        try {
          const ok = await this.tryBootstrapIndex();
          if (ok && this.reconnectTimer) {
            clearInterval(this.reconnectTimer);
            this.reconnectTimer = null;
          }
        } finally {
          this.reconnectBusy = false;
        }
      })();
    }, MEILI_RECONNECT_MS);
  }

  async onModuleInit() {
    if (this.client === null) {
      this.log.log('MEILISEARCH_HOST не задан — полнотекстовый поиск через Meilisearch отключён');
      return;
    }
    const ok = await this.tryBootstrapIndex();
    if (!ok) {
      this.startReconnectLoop();
    }
  }

  async ensureIndexSettings() {
    const idx = this.index();
    await idx.updateSettings({
      searchableAttributes: ['title', 'description', 'city', 'categoryTitle'],
      filterableAttributes: ['status', 'categoryId', 'city', 'priceRub'],
      sortableAttributes: ['priceRub', 'createdAtTs'],
      rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
      /** Префиксы «ма» → Москва, Макбук и т.д. */
      prefixSearch: 'indexingTime',
      typoTolerance: {
        enabled: true,
        /** Ниже пороги — лучше для коротких русских слов */
        minWordSizeForTypos: { oneTypo: 3, twoTypos: 6 },
      },
    });
    await idx.updateSynonyms(MEILISEARCH_LISTING_SYNONYMS);
    try {
      await idx.updateLocalizedAttributes([
        { attributePatterns: ['title', 'description'], locales: ['rus', 'eng'] },
      ]);
    } catch {
      // старые версии сервера Meilisearch без localizedAttributes
    }
  }

  listingToDoc(row: {
    id: string;
    title: string;
    description: string;
    city: string;
    categoryId: string;
    priceRub: number | null;
    status: ListingStatus;
    createdAt: Date;
    category: { title: string };
  }): ListingSearchDoc {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      city: row.city,
      categoryId: row.categoryId,
      categoryTitle: row.category.title,
      priceRub: typeof row.priceRub === 'number' ? row.priceRub : 0,
      status: row.status,
      createdAtTs: Math.floor(new Date(row.createdAt).getTime() / 1000),
    };
  }

  async upsertListingById(listingId: string) {
    if (!this.isEnabled()) return;
    const row = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        title: true,
        description: true,
        city: true,
        categoryId: true,
        priceRub: true,
        status: true,
        createdAt: true,
        category: { select: { title: true } },
      },
    });
    if (!row) {
      await this.deleteListing(listingId);
      return;
    }
    if (row.status !== ListingStatus.ACTIVE) {
      await this.deleteListing(listingId);
      return;
    }
    try {
      await this.index().addDocuments([this.listingToDoc(row)], { primaryKey: 'id' });
    } catch (e) {
      this.log.warn(`upsert ${listingId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async deleteListing(listingId: string) {
    if (!this.isEnabled()) return;
    try {
      await this.index().deleteDocument(listingId);
    } catch {
      // документ мог отсутствовать
    }
  }

  /**
   * Полная переиндексация ACTIVE (только когда Meili уже «включён» в приложении).
   * См. pushAllActiveDocuments — для bootstrap до meiliReady.
   */
  async reindexAllActive() {
    if (!this.isEnabled()) return;
    await this.pushAllActiveDocuments();
  }

  /** Заливка всех ACTIVE в индекс; нужен только client (до выставления meiliReady). */
  private async pushAllActiveDocuments() {
    if (this.client === null) return;
    const rows = await this.prisma.listing.findMany({
      where: { status: ListingStatus.ACTIVE },
      select: {
        id: true,
        title: true,
        description: true,
        city: true,
        categoryId: true,
        priceRub: true,
        status: true,
        createdAt: true,
        category: { select: { title: true } },
      },
    });
    const docs = rows.map((r) => this.listingToDoc(r));
    const batch = 500;
    const idx = this.index();
    for (let i = 0; i < docs.length; i += batch) {
      const chunk = docs.slice(i, i + batch);
      await idx.addDocuments(chunk, { primaryKey: 'id' });
    }
    this.log.log(`Meilisearch: проиндексировано активных объявлений: ${docs.length}`);
  }

  async reindexIfEmpty() {
    if (this.client === null) return;
    try {
      const stats = await this.index().getStats();
      const n = stats.numberOfDocuments ?? 0;
      if (n === 0) {
        this.log.log('Индекс Meilisearch пуст — полная переиндексация ACTIVE');
        await this.pushAllActiveDocuments();
      }
    } catch (e) {
      this.log.warn(`reindexIfEmpty: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private buildFilterParts(params: {
    categoryId?: string;
    city?: string;
    priceMin?: number;
    priceMax?: number;
  }): string[] {
    const parts: string[] = [`status = "ACTIVE"`];
    if (params.categoryId) parts.push(`categoryId = "${params.categoryId}"`);
    if (params.city?.trim()) parts.push(`city = "${params.city.trim().replace(/"/g, '\\"')}"`);
    if (typeof params.priceMin === 'number' || typeof params.priceMax === 'number') {
      const min = typeof params.priceMin === 'number' ? Math.max(0, Math.floor(params.priceMin)) : undefined;
      const max = typeof params.priceMax === 'number' ? Math.max(0, Math.floor(params.priceMax)) : undefined;
      if (typeof min === 'number' && typeof max === 'number') {
        const lo = Math.min(min, max);
        const hi = Math.max(min, max);
        parts.push(`priceRub >= ${lo} AND priceRub <= ${hi}`);
      } else if (typeof min === 'number') {
        parts.push(`priceRub >= ${min}`);
      } else if (typeof max === 'number') {
        parts.push(`priceRub <= ${max}`);
      }
    }
    return parts;
  }

  async searchListings(
    q: string,
    params: {
      categoryId?: string;
      city?: string;
      priceMin?: number;
      priceMax?: number;
      sort: 'relevant' | 'new' | 'cheap' | 'expensive';
      offset: number;
      limit: number;
    },
  ): Promise<{ hits: Array<{ id: string }>; estimatedTotalHits: number }> {
    if (!this.isEnabled()) return { hits: [], estimatedTotalHits: 0 };
    const filter = this.buildFilterParts(params).join(' AND ');
    const searchParams: SearchParams = {
      filter,
      offset: params.offset,
      limit: params.limit,
      attributesToRetrieve: ['id'],
    };
    if (params.sort === 'new') {
      searchParams.sort = ['createdAtTs:desc'];
    } else if (params.sort === 'cheap') {
      searchParams.sort = ['priceRub:asc', 'createdAtTs:desc'];
    } else if (params.sort === 'expensive') {
      searchParams.sort = ['priceRub:desc', 'createdAtTs:desc'];
    }
    try {
      const res: SearchResponse<{ id: string }> = await this.index().search(q, searchParams);
      const estimatedTotalHits =
        typeof res.estimatedTotalHits === 'number' ? res.estimatedTotalHits : (res.hits?.length ?? 0);
      return {
        hits: (res.hits ?? []).map((h) => ({ id: h.id })),
        estimatedTotalHits,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.disableBecauseUnreachable(msg);
      throw e;
    }
  }

  /** Подсказки: заголовок, описание, город, категория (чтобы «ма» ловило Москву, «авто» и т.п.). */
  async suggest(q: string, limit = 8): Promise<string[]> {
    if (!this.isEnabled() || q.trim().length < 2) return [];
    try {
      const res = await this.index().search(q.trim(), {
        filter: `status = "ACTIVE"`,
        limit: Math.min(30, Math.max(8, limit * 4)),
        attributesToRetrieve: ['title'],
        attributesToSearchOn: ['title', 'description', 'city', 'categoryTitle'],
      } satisfies SearchParams);
      const titles: string[] = [];
      const seen = new Set<string>();
      for (const h of res.hits ?? []) {
        const t = (h as { title?: string }).title?.trim();
        if (!t) continue;
        const k = t.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        titles.push(t);
        if (titles.length >= limit) break;
      }
      return titles;
    } catch (e) {
      this.log.warn(`suggest: ${e instanceof Error ? e.message : String(e)}`);
      return [];
    }
  }

  /** Подсказки из БД, если Meili пуст или отключён (префиксный contains). */
  async suggestFromPrisma(q: string, limit = 8): Promise<string[]> {
    const qt = q.trim();
    if (qt.length < 2 || limit < 1) return [];
    const rows = await this.prisma.listing.findMany({
      where: {
        status: ListingStatus.ACTIVE,
        OR: [
          { title: { contains: qt, mode: 'insensitive' } },
          { description: { contains: qt, mode: 'insensitive' } },
          { city: { contains: qt, mode: 'insensitive' } },
          { category: { title: { contains: qt, mode: 'insensitive' } } },
        ],
      },
      select: { title: true },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });
    const seen = new Set<string>();
    const titles: string[] = [];
    for (const r of rows) {
      const t = r.title.trim();
      if (!t) continue;
      const k = t.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      titles.push(t);
      if (titles.length >= limit) break;
    }
    return titles;
  }
}
