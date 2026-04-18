import Link from 'next/link';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { API_URL, apiGetJson, type Category, type ListingCard } from '@/lib/api';
import { HomePreferenceCookieSync } from '@/components/home-preference-cookie-sync';
import { ListingCardComponent } from '@/components/listing-card';
import { SiteHeader } from '@/components/site-header';
import { SearchInputWithSuggestions } from '@/components/search-input-with-suggestions';
import { FeedLoadMore } from '@/components/feed-load-more';
import { SiteFooter } from '@/components/site-footer';
import { Button } from '@/components/ui/button';
import { Search, SlidersHorizontal, Sparkles } from 'lucide-react';

type ListingsResponse = {
  page: number;
  limit: number;
  total: number;
  vipStrip?: ListingCard[];
  items: ListingCard[];
};

const getRussianCities = cache(async () => {
  try {
    const res = await fetch(
      'https://raw.githubusercontent.com/arbaev/russia-cities/master/russia-cities.json',
      { cache: 'no-store' },
    );
    if (!res.ok) throw new Error('cities_fetch_failed');
    const data = (await res.json()) as Array<{ name?: string }>;
    const unique = Array.from(
      new Set(
        data
          .map((x) => (x.name ?? '').trim())
          .filter(Boolean),
      ),
    );
    unique.sort((a, b) => a.localeCompare(b, 'ru'));
    if (unique.length > 0) return unique;
  } catch {
    // fallback below
  }
  return ['Москва', 'Санкт-Петербург', 'Казань'];
});

type HomeSearchParams = {
  q?: string;
  city?: string;
  sort?: 'relevant' | 'new' | 'cheap' | 'expensive' | 'nearby';
  categoryId?: string;
  priceMin?: string;
  priceMax?: string;
  lat?: string;
  lon?: string;
  radiusKm?: string;
  reco?: '1';
  /** Диагностический режим — минимальный SSR без дочерних компонентов. */
  safe?: '1';
  /** Полный рендер через renderHome() — только когда включён. */
  full?: '1';
};

function applyClientFiltersAndSort(
  items: ListingCard[],
  params: HomeSearchParams,
): ListingCard[] {
  const q = (params.q ?? '').trim().toLowerCase();
  const categoryId = (params.categoryId ?? '').trim();
  const priceMin = params.priceMin ? Number(params.priceMin) : undefined;
  const priceMax = params.priceMax ? Number(params.priceMax) : undefined;
  const sort = params.sort ?? 'relevant';

  const filtered = items.filter((x) => {
    if (q && !`${x.title} ${x.category.title} ${x.city}`.toLowerCase().includes(q)) return false;
    if (categoryId && x.category.id !== categoryId) return false;
    if (Number.isFinite(priceMin) && priceMin != null) {
      if (x.priceRub == null || x.priceRub < priceMin) return false;
    }
    if (Number.isFinite(priceMax) && priceMax != null) {
      if (x.priceRub == null || x.priceRub > priceMax) return false;
    }
    return true;
  });

  const sorted = [...filtered];
  if (sort === 'cheap') {
    sorted.sort((a, b) => {
      if (a.priceRub == null && b.priceRub == null) return 0;
      if (a.priceRub == null) return 1;
      if (b.priceRub == null) return -1;
      return a.priceRub - b.priceRub;
    });
  } else if (sort === 'expensive') {
    sorted.sort((a, b) => {
      if (a.priceRub == null && b.priceRub == null) return 0;
      if (a.priceRub == null) return 1;
      if (b.priceRub == null) return -1;
      return b.priceRub - a.priceRub;
    });
  } else if (sort === 'new') {
    sorted.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  } else if (sort === 'nearby') {
    sorted.sort((a, b) => {
      const da = typeof a.distanceKm === 'number' ? a.distanceKm : 1e9;
      const db = typeof b.distanceKm === 'number' ? b.distanceKm : 1e9;
      return da - db;
    });
  }

  return sorted;
}

function buildListingsPath(params: HomeSearchParams) {
  const qp = new URLSearchParams();
  qp.set('limit', '20');
  const sort = params.sort ?? 'relevant';
  qp.set('sort', sort);
  if (params.q?.trim()) qp.set('q', params.q.trim());
  if (params.city?.trim()) qp.set('city', params.city.trim());
  if (params.categoryId?.trim()) qp.set('categoryId', params.categoryId.trim());
  if (params.priceMin?.trim()) qp.set('priceMin', params.priceMin.trim());
  if (params.priceMax?.trim()) qp.set('priceMax', params.priceMax.trim());
  if (sort === 'nearby' && params.lat?.trim() && params.lon?.trim()) {
    qp.set('lat', params.lat.trim());
    qp.set('lon', params.lon.trim());
    const r = params.radiusKm?.trim();
    qp.set('radiusKm', r && r.length > 0 ? r : '50');
  }
  return `/listings?${qp.toString()}`;
}

function buildRecommendationPath(params: { city?: string; categoryId?: string; limit?: number }) {
  const qp = new URLSearchParams();
  qp.set('limit', String(params.limit ?? 8));
  qp.set('sort', 'relevant');
  if (params.city?.trim()) qp.set('city', params.city.trim());
  if (params.categoryId?.trim()) qp.set('categoryId', params.categoryId.trim());
  return `/listings?${qp.toString()}`;
}

function safeDecode(value?: string) {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export const dynamic = 'force-dynamic';

/**
 * BUILD_TAG — обновляется с каждым коммитом-хотфиксом. Позволяет быстро понять,
 * приехал ли новый деплой на Vercel. Если в HTML виден старый тег — значит,
 * деплой ещё не прошёл или CDN закеширован.
 */
const BUILD_TAG = 'hotfix-diag-5 · 2026-04-18';

/**
 * Nuclear-диагностика: главная временно рендерит только plain-JSX без API-вызовов
 * и без тяжёлых дочерних компонентов (SiteHeader, ListingCard, FeedLoadMore,
 * SiteFooter), пока не найдём виновника. Полный рендер доступен через ?full=1
 * — отвалится он там же, где и раньше, но теперь мы точно будем знать, что
 * корневой тест жив, и проблема именно в feed-дереве или виджетах layout.
 *
 * Логика:
 *  - /            → plain JSX + BUILD_TAG          (должно работать всегда)
 *  - /?full=1     → renderHome() — полный feed     (падает, хотим починить)
 *  - /?safe=1     → alias для default             (обратная совместимость)
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  const sp = await searchParams;
  const wantFull = sp.full === '1';

  if (!wantFull) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f7fa', padding: 24, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>Бартер</h1>
            <p style={{ marginTop: 8, fontSize: 14, color: '#475569' }}>
              Если ты видишь этот текст — значит Vercel-деплой приехал и SSR главной страницы сам по себе жив.
              Полная лента временно отключена для диагностики. Работаем над восстановлением.
            </p>
            <div
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 10,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontFamily: 'ui-monospace, Menlo, monospace',
                fontSize: 12,
                color: '#334155',
                whiteSpace: 'pre-wrap',
              }}
            >
              {`build  : ${BUILD_TAG}
api_url: ${API_URL || '(same-origin)'}
render : server component · force-dynamic
sp     : ${JSON.stringify(sp)}`}
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a
                href="/listings"
                style={{ padding: '10px 16px', background: '#00AAFF', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
              >
                Открыть ленту
              </a>
              <a
                href="/?full=1"
                style={{ padding: '10px 16px', background: '#fff', color: '#0f172a', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none', border: '1px solid #e2e8f0' }}
              >
                Попробовать полную версию
              </a>
              <a
                href="/build-check"
                style={{ padding: '10px 16px', background: '#fff', color: '#0f172a', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none', border: '1px solid #e2e8f0' }}
              >
                /build-check
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  try {
    return await renderHome(sp);
  } catch (err) {
    // Не даём упасть в Next.js error boundary с redacted сообщением.
    // Показываем минимальный fallback с подробной ошибкой прямо в SSR — так пользователь и я
    // сразу видим причину, а не «specific message is omitted in production builds».
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack ?? '' : '';
    console.error('[home] SSR crashed:', err);
    return (
      <div className="min-h-screen bg-muted px-4 py-10">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6">
            <h1 className="text-xl font-bold text-destructive">SSR главной страницы упал</h1>
            <p className="mt-1 text-sm text-foreground/70">
              Технический fallback. Не удаётся отрисовать главную ленту.
            </p>
            <p className="mt-1 text-[11px] text-foreground/60">build: {BUILD_TAG}</p>
            <div className="mt-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-foreground/60">
                Сообщение
              </div>
              <pre className="mt-1 break-words whitespace-pre-wrap rounded-lg bg-card p-3 text-xs text-foreground">
                {msg || '(без сообщения)'}
              </pre>
            </div>
            {stack ? (
              <div className="mt-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-foreground/60">
                  Stack
                </div>
                <pre className="mt-1 max-h-72 overflow-auto rounded-lg bg-card p-3 text-[10px] leading-snug text-foreground/80">
                  {stack}
                </pre>
              </div>
            ) : null}
          </div>
          <div className="flex justify-center gap-2">
            <Link
              href="/listings"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              Открыть ленту /listings
            </Link>
            <Link
              href="/profile"
              className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground"
            >
              Профиль
            </Link>
          </div>
        </div>
      </div>
    );
  }
}

async function renderHome(sp: HomeSearchParams) {
  const cookieStore = await cookies();
  const prefCity = safeDecode(cookieStore.get('barter_pref_city')?.value);
  const viewedCookie = safeDecode(cookieStore.get('barter_viewed_listing_ids')?.value);
  const viewedIds = viewedCookie
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

  const currentSort = sp.sort ?? 'relevant';
  const latN = sp.lat != null && String(sp.lat).trim() !== '' ? Number(sp.lat) : NaN;
  const lonN = sp.lon != null && String(sp.lon).trim() !== '' ? Number(sp.lon) : NaN;
  const geoOk =
    Number.isFinite(latN) &&
    Number.isFinite(lonN) &&
    latN >= -90 &&
    latN <= 90 &&
    lonN >= -180 &&
    lonN <= 180;
  const apiSort = sp.sort === 'nearby' && !geoOk ? 'relevant' : currentSort;
  const currentRadiusKm = (sp.radiusKm ?? '').trim() || '25';
  const currentCity = sp.city ?? prefCity ?? 'Москва';
  const currentQ = sp.q ?? '';
  const urlCategoryId = (sp.categoryId ?? '').trim();
  const currentPriceMin = sp.priceMin ?? '';
  const currentPriceMax = sp.priceMax ?? '';
  const recoMode = sp.reco === '1';
  const hasSearchQuery = currentQ.trim().length > 0;
  const effectiveRecoMode = recoMode && !hasSearchQuery;
  const recommendationCity = sp.city ?? prefCity;
  const recommendationCategoryId = urlCategoryId || undefined;

  const categoriesPromise = apiGetJson<Category[]>('/categories');
  const citiesPromise = getRussianCities();
  const listingsPromise: Promise<ListingsResponse> =
    effectiveRecoMode && viewedIds.length > 0
      ? apiGetJson<ListingCard[]>(
          `/listings/${viewedIds[0]}/similar?limit=20&excludeIds=${encodeURIComponent(viewedIds.join(','))}`,
        )
          .then((items) => {
            const normalized = applyClientFiltersAndSort(items, sp);
            return {
              page: 1,
              limit: 20,
              total: normalized.length,
              vipStrip: [],
              items: normalized.slice(0, 20),
            };
          })
          .catch(() =>
            apiGetJson<ListingsResponse>(
              buildRecommendationPath({
                city: recommendationCity,
                categoryId: recommendationCategoryId,
                limit: 20,
              }),
            ),
          )
      : apiGetJson<ListingsResponse>(
          buildListingsPath({
            ...sp,
            sort: apiSort,
            city: sp.city ?? prefCity ?? undefined,
            categoryId: urlCategoryId || undefined,
            priceMin: sp.priceMin ?? undefined,
            priceMax: sp.priceMax ?? undefined,
          }),
        );

  const recommendedPromise = apiGetJson<ListingsResponse>(
    buildRecommendationPath({
      city: recommendationCity,
      categoryId: recommendationCategoryId,
      limit: 8,
    }),
  );

  const feedApiPath = buildListingsPath({
    ...sp,
    sort: apiSort,
    city: sp.city ?? prefCity ?? undefined,
    categoryId: urlCategoryId || undefined,
    priceMin: sp.priceMin ?? undefined,
    priceMax: sp.priceMax ?? undefined,
  });

  const emptyListings: ListingsResponse = { page: 1, limit: 20, total: 0, vipStrip: [], items: [] };
  const emptyRecommended: ListingsResponse = { page: 1, limit: 8, total: 0, items: [] };
  const defaultCities = ['Москва', 'Санкт-Петербург', 'Казань'];

  const [catRes, listRes, recRes, citiesRes] = await Promise.allSettled([
    categoriesPromise,
    listingsPromise,
    recommendedPromise,
    citiesPromise,
  ]);

  // Defensive: API may return partial/malformed payloads. Coerce to expected shapes
  // so downstream `.map()` / `.filter()` never crash the SSR pass and trigger error.tsx.
  const categories = Array.isArray(catRes.status === 'fulfilled' ? catRes.value : null)
    ? (catRes as PromiseFulfilledResult<Category[]>).value
    : [];
  const rawListings = listRes.status === 'fulfilled' ? listRes.value : emptyListings;
  const listings: ListingsResponse = {
    page: rawListings?.page ?? 1,
    limit: rawListings?.limit ?? 20,
    total: typeof rawListings?.total === 'number' ? rawListings.total : 0,
    vipStrip: Array.isArray(rawListings?.vipStrip) ? rawListings.vipStrip : [],
    items: Array.isArray(rawListings?.items) ? rawListings.items : [],
  };
  const rawRecommended = recRes.status === 'fulfilled' ? recRes.value : emptyRecommended;
  const recommended: ListingsResponse = {
    page: rawRecommended?.page ?? 1,
    limit: rawRecommended?.limit ?? 8,
    total: typeof rawRecommended?.total === 'number' ? rawRecommended.total : 0,
    vipStrip: Array.isArray(rawRecommended?.vipStrip) ? rawRecommended.vipStrip : [],
    items: Array.isArray(rawRecommended?.items) ? rawRecommended.items : [],
  };
  const russianCitiesRaw = Array.isArray(
    citiesRes.status === 'fulfilled' ? citiesRes.value : null,
  )
    ? (citiesRes as PromiseFulfilledResult<string[]>).value
    : defaultCities;

  // SSR error visibility — logs surface in Vercel function logs.
  if (catRes.status === 'rejected') console.error('[home] categories fetch rejected:', catRes.reason);
  if (listRes.status === 'rejected') console.error('[home] listings fetch rejected:', listRes.reason);
  if (recRes.status === 'rejected') console.error('[home] recommended fetch rejected:', recRes.reason);
  if (citiesRes.status === 'rejected') console.error('[home] cities fetch rejected:', citiesRes.reason);

  const apiBackendDown =
    catRes.status === 'rejected' && listRes.status === 'rejected';
  const russianCities = russianCitiesRaw.includes(currentCity)
    ? russianCitiesRaw
    : [currentCity, ...russianCitiesRaw];
  const cityOptions = russianCities.map((city) => ({ value: city, label: city }));
  const categoryOptions = [
    { value: '', label: 'Категория' },
    ...categories.map((c) => ({ value: c.id, label: c.title })),
  ];
  const sortOptions = [
    { value: 'relevant', label: 'Релевантные' },
    { value: 'new', label: 'По новизне' },
    { value: 'cheap', label: 'Дешевле' },
    { value: 'expensive', label: 'Дороже' },
    { value: 'nearby', label: 'По расстоянию' },
  ];

  const geoHidden = geoOk ? (
    <>
      <input type="hidden" name="lat" value={String(latN)} />
      <input type="hidden" name="lon" value={String(lonN)} />
      <input type="hidden" name="radiusKm" value={currentRadiusKm} />
    </>
  ) : null;

  const preservedListQuery: Record<string, string> = {
    ...(currentQ ? { q: currentQ } : {}),
    ...(currentCity ? { city: currentCity } : {}),
    ...(currentPriceMin ? { priceMin: currentPriceMin } : {}),
    ...(currentPriceMax ? { priceMax: currentPriceMax } : {}),
    ...(currentSort ? { sort: currentSort } : {}),
    ...(geoOk ? { lat: String(latN), lon: String(lonN), radiusKm: currentRadiusKm } : {}),
  };

  const CATS_TOP: Array<{ name: string; slug: string; emoji: string; accent: string }> = [
    { name: 'Авто', slug: 'auto', emoji: '🚗', accent: '#4A90D9' },
    { name: 'Недвижимость', slug: 'realty', emoji: '🏢', accent: '#E8A87C' },
    { name: 'Работа', slug: 'job', emoji: '💼', accent: '#c4a484' },
  ];
  const CATS_SCROLL: Array<{ name: string; slug: string; emoji: string; accent: string }> = [
    { name: 'Услуги', slug: 'services', emoji: '🔧', accent: '#3B82F6' },
    { name: 'Техника', slug: 'electronics', emoji: '📱', accent: '#8B5CF6' },
    { name: 'Посуточно', slug: 'home', emoji: '🏡', accent: '#F59E0B' },
    { name: 'Дом и дача', slug: 'home', emoji: '🛋️', accent: '#10B981' },
    { name: 'Одежда', slug: 'clothes', emoji: '👗', accent: '#EC4899' },
    { name: 'Детям', slug: 'kids', emoji: '🧸', accent: '#F97316' },
    { name: 'Хобби', slug: 'hobby', emoji: '⚽', accent: '#EF4444' },
    { name: 'Животные', slug: 'animals', emoji: '🐕', accent: '#14B8A6' },
  ];
  const ALL_CATS = [...CATS_TOP, ...CATS_SCROLL];

  const catIdMap: Record<string, string> = {};
  for (const c of categories) {
    const cTitle = typeof c?.title === 'string' ? c.title : '';
    const cId = typeof c?.id === 'string' ? c.id : '';
    if (!cTitle || !cId) continue;
    for (const cat of ALL_CATS) {
      const cleanName = cat.name.replace(/[\n-]/g, '');
      if (cTitle.includes(cleanName) || cleanName.includes(cTitle.split(' ')[0])) catIdMap[cat.slug] = cId;
    }
  }

  /* Merge VIP + recommended + regular into one unified feed */
  const vipItems = Array.isArray(listings.vipStrip) ? listings.vipStrip : [];
  const feedSeenIds = new Set(vipItems.map((x) => x?.id).filter(Boolean) as string[]);
  const recoItemsSafe = Array.isArray(recommended.items) ? recommended.items : [];
  const listingsItemsSafe = Array.isArray(listings.items) ? listings.items : [];
  const recoForFeed = (!hasSearchQuery ? recoItemsSafe : []).filter((x) => {
    if (!x?.id) return false;
    if (feedSeenIds.has(x.id)) return false;
    feedSeenIds.add(x.id);
    return true;
  });
  const regularForFeed = listingsItemsSafe.filter((x) => x?.id && !feedSeenIds.has(x.id));
  const mergedFeed = [...vipItems.filter((x) => x?.id), ...recoForFeed, ...regularForFeed];

  // === БИСЕКЦИЯ v1: возвращаем только данные, без JSX-компонентов. ===
  // Если это сработает, а оригинальный return (закомментирован ниже) — нет,
  // значит проблема именно в одном из дочерних компонентов (SiteHeader,
  // SearchInputWithSuggestions, ListingCardComponent, FeedLoadMore, SiteFooter),
  // а не в data-fetching или в логике merge.
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', color: '#0f172a', background: '#f5f7fa', minHeight: '100vh' }}>
      <div style={{ maxWidth: 820, margin: '0 auto', background: '#fff', padding: 20, borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>renderHome · data OK</h1>
        <p style={{ marginTop: 6, fontSize: 13, color: '#475569' }}>
          Если ты видишь этот текст — значит data-pipeline (API-fetches + merge) ok.
          Падение было на JSX-компонентах. Возвращаем их по одному.
        </p>
        <pre style={{ marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontFamily: 'ui-monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}>
{`build        : ${BUILD_TAG}
api_url      : ${API_URL || '(same-origin)'}
apiBackendDown: ${apiBackendDown}
categories   : ${categories.length}
listings.tot : ${listings.total}
listings.items: ${listings.items.length}
vipStrip     : ${(listings.vipStrip ?? []).length}
recommended  : ${recommended.items.length}
cities       : ${russianCities.length}
mergedFeed   : ${mergedFeed.length}
currentCity  : ${currentCity}
currentQ     : ${currentQ}`}
        </pre>
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <a href="/" style={{ padding: '10px 16px', background: '#00AAFF', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>На главную (nuclear)</a>
          <a href="/listings" style={{ padding: '10px 16px', background: '#fff', color: '#0f172a', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none', border: '1px solid #e2e8f0' }}>Лента /listings</a>
        </div>
      </div>
    </div>
  );

  // ===== ОРИГИНАЛЬНЫЙ РЕНДЕР НИЖЕ — ВРЕМЕННО ОТКЛЮЧЁН ДЛЯ БИСЕКЦИИ =====
  // eslint-disable-next-line no-unreachable
  return (
    <div className="min-h-screen bg-muted antialiased">
      {apiBackendDown ? (
        <div role="alert" className="border-b border-accent/30 bg-accent/10 px-4 py-3 text-center text-sm text-accent">
          <strong>Не удаётся связаться с API</strong> ({API_URL || 'сервер'}). Запустите бэкенд.
        </div>
      ) : null}

      {/* ===== DESKTOP HEADER ===== */}
      <div className="hidden md:block">
        <SiteHeader>
          <form action="/" method="GET" className="hidden min-w-0 flex-1 items-center md:flex">
            {effectiveRecoMode ? <input type="hidden" name="reco" value="1" /> : null}
            {geoHidden}
            {currentCity ? <input type="hidden" name="city" value={currentCity} /> : null}
            <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-l-lg border-2 border-r-0 border-primary bg-background px-4">
              <Search size={16} strokeWidth={1.8} className="shrink-0 text-muted-foreground" aria-hidden />
              <SearchInputWithSuggestions
                formKey={currentQ}
                defaultValue={currentQ}
                categories={categories}
                className="h-11 w-full border-none bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
                placeholder="Поиск по объявлениям"
              />
            </div>
            <button
              type="submit"
              className="h-11 shrink-0 rounded-r-lg bg-primary px-7 text-[15px] font-semibold whitespace-nowrap text-primary-foreground transition hover:bg-primary/90"
            >
              Найти
            </button>
          </form>
        </SiteHeader>
      </div>

      {/* ===== DESKTOP CATEGORIES BAR — Avito-style horizontal icons ===== */}
      <div className="hidden border-b border-border bg-background md:block">
        <div className="mx-auto flex max-w-7xl items-stretch gap-0 overflow-x-auto px-6">
          {ALL_CATS.map((cat) => {
            const catId = catIdMap[cat.slug] || '';
            const isActive = urlCategoryId === catId && catId !== '';
            return (
              <Link
                key={cat.slug + cat.name}
                href={{ pathname: '/', query: { ...preservedListQuery, categoryId: catId } }}
                className={`relative flex shrink-0 flex-col items-center justify-center gap-1 px-4 pt-3.5 pb-3 transition-colors ${
 isActive
 ? 'border-b-2 border-primary text-primary'
 : 'border-b-2 border-transparent text-foreground/70 hover:text-foreground'
 }`}
              >
                <span className="text-[26px] leading-none" aria-hidden>
                  {cat.emoji}
                </span>
                <span className={`text-xs whitespace-nowrap ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {cat.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ===== MOBILE STICKY HEADER ===== */}
      <div className="mobile-sticky-header md:hidden" style={{ marginBottom: -4, background: '#00AAFF', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <header style={{ width: '100%', padding: '12px 12px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img src="/brand/logo_icon.svg" alt="Бартер" width={30} height={30} style={{ flexShrink: 0 }} />
          </Link>
          <form action="/" method="GET" style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', background: '#fff', borderRadius: 10, padding: '8px 10px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
            {effectiveRecoMode ? <input type="hidden" name="reco" value="1" /> : null}
            {geoHidden}
            {currentCity ? <input type="hidden" name="city" value={currentCity} /> : null}
            <Search size={16} strokeWidth={1.8} color="#94A3B8" style={{ marginRight: 6, flexShrink: 0 }} aria-hidden />
            <input name="q" defaultValue={currentQ} type="text" placeholder="Поиск объявлений" style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 14, flex: 1, minWidth: 0, color: '#1E293B' }} />
          </form>
          <button type="button" style={{ width: 38, height: 38, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: 'none' }}>
            <SlidersHorizontal size={18} strokeWidth={1.8} color="#fff" aria-label="Фильтры" />
          </button>
        </header>
      </div>

      {/* ===== MOBILE CATEGORIES — dark glass cards ===== */}
      <div style={{ background: '#00AAFF', paddingBottom: 36, marginTop: 0 }} className="md:hidden">
        <section style={{ marginTop: 4, padding: '0 12px' }}>
          {/* Top row: 3 big cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {CATS_TOP.map((cat) => {
              const catId = catIdMap[cat.slug] || '';
              return (
                <Link key={cat.slug} href={{ pathname: '/', query: { ...preservedListQuery, categoryId: catId } }}
                  style={{ background: 'rgba(0,0,0,0.22)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 14, padding: '10px 10px 8px', height: 88, position: 'relative', overflow: 'hidden', display: 'block', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <span style={{ color: '#fff', fontSize: 12, fontWeight: 600, position: 'relative', zIndex: 10, lineHeight: 1.3, display: 'block' }}>{cat.name}</span>
                  <div style={{ position: 'absolute', bottom: -4, right: -4, width: 56, height: 56, background: cat.accent, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                    {cat.emoji}
                  </div>
                </Link>
              );
            })}
          </div>
          {/* Scrollable row */}
          <div style={{ position: 'relative', marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingRight: 32 }} className="hide-scrollbar">
              {CATS_SCROLL.map((cat) => {
                const catId = catIdMap[cat.slug] || '';
                return (
                  <Link key={cat.slug + cat.name} href={{ pathname: '/', query: { ...preservedListQuery, categoryId: catId } }}
                    style={{ minWidth: 96, background: 'rgba(0,0,0,0.22)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 14, padding: '10px 10px 8px', height: 76, position: 'relative', overflow: 'hidden', display: 'block', textDecoration: 'none', flexShrink: 0, border: '1px solid rgba(255,255,255,0.12)' }}>
                    <span style={{ color: '#fff', fontSize: 12, fontWeight: 600, position: 'relative', zIndex: 10, lineHeight: 1.3, display: 'block' }}>{cat.name}</span>
                    <div style={{ position: 'absolute', bottom: -6, right: -6, width: 44, height: 44, background: cat.accent, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                      {cat.emoji}
                    </div>
                  </Link>
                );
              })}
            </div>
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 40, background: 'linear-gradient(to right, transparent, #00AAFF)', pointerEvents: 'none', zIndex: 5 }} />
          </div>
        </section>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <main className="relative z-20 -mt-5 rounded-t-3xl bg-muted md:mt-0 md:rounded-none">
        <div className="mx-auto max-w-7xl px-2 pt-5 pb-24 md:px-6 md:py-8">
          <HomePreferenceCookieSync city={currentCity} categoryId={urlCategoryId} />

          {effectiveRecoMode ? (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-primary/10 p-3.5 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded bg-primary px-2 py-0.5 text-xs font-bold tracking-wider uppercase text-primary-foreground">
                <Sparkles size={14} strokeWidth={1.8} aria-hidden />
                Режим подбора
              </span>
              <span className="text-foreground/80">
                Показываем ленту по вашим недавним просмотрам.
              </span>
            </div>
          ) : null}

          {/* ===== LISTINGS SECTION ===== */}
          <section>
            {mergedFeed.length > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-1 pb-4">
                <h2 className="m-0 text-xl font-bold text-foreground">
                  {currentQ ? `Результаты: «${currentQ}»` : 'Все объявления'}
                </h2>
                {/* Desktop sort pills */}
                <div className="hidden items-center gap-1.5 md:flex">
                  <form action="/" method="GET" style={{ display: 'contents' }}>
                    {currentQ ? <input type="hidden" name="q" value={currentQ} /> : null}
                    {currentCity ? <input type="hidden" name="city" value={currentCity} /> : null}
                    {urlCategoryId ? <input type="hidden" name="categoryId" value={urlCategoryId} /> : null}
                    {geoHidden}
                    {sortOptions.map((opt) => {
                      const active = currentSort === opt.value;
                      return (
                        <Button
                          key={opt.value}
                          type="submit"
                          name="sort"
                          value={opt.value}
                          variant={active ? 'default' : 'outline'}
                          size="sm"
                          className="h-8 rounded-full px-4 text-[13px] font-medium"
                        >
                          {opt.label}
                        </Button>
                      );
                    })}
                  </form>
                </div>
              </div>
            ) : null}

            {/* ===== RESPONSIVE CARD GRID ===== */}
            <div className="listing-grid grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 lg:grid-cols-4 lg:gap-4">
              {mergedFeed.length === 0 ? (
                <div className="col-span-full rounded-2xl bg-card p-12 text-center text-card-foreground ring-1 ring-foreground/10">
                  <div className="mb-4 text-5xl">🔍</div>
                  <p className="text-base font-semibold text-foreground">Ничего не нашлось</p>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Попробуйте снять категорию или изменить город
                  </p>
                </div>
              ) : null}
              {mergedFeed.map((x) => (
                <ListingCardComponent key={x.id} data={x} apiBase={API_URL} />
              ))}

              {!effectiveRecoMode && listings.total > listings.items.length ? (
                <FeedLoadMore initialPage={1} total={listings.total} limit={20} basePath={feedApiPath} apiBase={API_URL} />
              ) : null}
            </div>
          </section>
        </div>
      </main>

      {/* ===== FOOTER — desktop only ===== */}
      <div className="hidden pb-0 md:block">
        <SiteFooter />
      </div>
    </div>
  );
}
