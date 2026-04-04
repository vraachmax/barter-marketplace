import { Controller, Get, Query } from '@nestjs/common';
import { MeilisearchService } from './meilisearch.service';

@Controller('search')
export class SearchController {
  constructor(private meili: MeilisearchService) {}

  @Get('suggestions')
  async suggestions(
    @Query('q') q?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const limit = Math.min(15, Math.max(1, parseInt(limitRaw ?? '8', 10) || 8));
    const query = (q ?? '').trim();
    if (query.length < 2) {
      return { enabled: this.meili.isEnabled(), suggestions: [] as string[] };
    }

    const enabled = this.meili.isEnabled();
    const suggestions: string[] = [];
    const seen = new Set<string>();

    const pushUnique = (list: string[]) => {
      for (const t of list) {
        const k = t.trim().toLowerCase();
        if (!k || seen.has(k)) continue;
        seen.add(k);
        suggestions.push(t.trim());
        if (suggestions.length >= limit) return true;
      }
      return false;
    };

    if (enabled) {
      try {
        const fromMeili = await this.meili.suggest(query, limit);
        if (pushUnique(fromMeili)) {
          return { enabled, suggestions };
        }
      } catch {
        // добираем из Prisma
      }
    }

    const fromDb = await this.meili.suggestFromPrisma(query, limit);
    pushUnique(fromDb);

    return { enabled, suggestions: suggestions.slice(0, limit) };
  }

  @Get('status')
  status() {
    return { meilisearch: this.meili.isEnabled() };
  }
}
