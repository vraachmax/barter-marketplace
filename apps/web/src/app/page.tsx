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
import { MobileModeToggle } from '@/components/mobile-mode-toggle';
import { MobileSearchInput } from '@/components/mobile-search-input';
import { BarterExampleCluster } from '@/components/barter-example-cluster';
import { MarketExampleCluster } from '@/components/market-example-cluster';
import { ChevronDown, Heart, MapPin, Search, SlidersHorizontal, Sparkles } from 'lucide-react';

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

/** Plural-форма для русского: 1 объявление · 2 объявления · 5 объявлений */
function pluralRu(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  const sp = await searchParams;
  return renderHome(sp);
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

  // marketOnly=true: категории, которых НЕ должно быть в режиме Бартер
  // (услуги / работа / недвижимость — это не товары-для-обмена).
  // Фильтрация визуальная: CSS-правило `html[data-mode="barter"] [data-market-only="true"] { display:none }`.
  //
  // desktopMarketOnly=true: плитка «Все» рендерится только на десктопе
  // в режиме Маркет. Мобильный DOM её НЕ содержит (фильтр в JSX ниже).
  //
  // Все плитки стилизуются как Avito: слева текст, справа эмодзи в
  // градиентном круге. Сетка `cats-avito` (2 × горизонтальный скролл, 150×72).
  // Градиент берётся из --cat-* CSS-переменных (globals.css).
  type Cat = {
    name: string;
    slug: string;
    emoji: string;
    /** CSS-градиент круглой подложки под эмодзи. */
    gradient: string;
    /** Десктоп-акцент (используется в activeTab подсветке). */
    accent: string;
    marketOnly?: boolean;
    desktopMarketOnly?: boolean;
    /** Для плитки «Все» — рендерим не эмодзи, а 4 цветные бабблы. */
    allBubbles?: boolean;
  };

  const CATS: Cat[] = [
    { name: 'Все', slug: 'all', emoji: '', gradient: 'linear-gradient(135deg, #667eea, #764ba2)', accent: '#667eea', allBubbles: true, desktopMarketOnly: true },
    { name: 'Недвижимость', slug: 'realty', emoji: '🏠', gradient: 'var(--cat-realty)', accent: '#fa709a', marketOnly: true },
    { name: 'Работа\u00a0и подработка', slug: 'job', emoji: '🎒', gradient: 'var(--cat-work)', accent: '#f59e0b', marketOnly: true },
    { name: 'Авто', slug: 'auto', emoji: '🚗', gradient: 'var(--cat-auto)', accent: '#f5576c' },
    { name: 'Электроника', slug: 'electronics', emoji: '📱', gradient: 'var(--cat-electronics)', accent: '#667eea' },
    { name: 'Для\u00a0дома и дачи', slug: 'home', emoji: '🛋️', gradient: 'var(--cat-home)', accent: '#43e97b' },
    { name: 'Детские\u00a0товары', slug: 'kids', emoji: '🧸', gradient: 'var(--cat-baby)', accent: '#4facfe' },
    { name: 'Одежда\u00a0и обувь', slug: 'clothes', emoji: '👕', gradient: 'var(--cat-clothes)', accent: '#a18cd1' },
    { name: 'Хобби\u00a0и отдых', slug: 'hobby', emoji: '🎸', gradient: 'var(--cat-hobby)', accent: '#f6d365' },
    { name: 'Спорт\u00a0и туризм', slug: 'sport', emoji: '⚽️', gradient: 'linear-gradient(135deg, #f093fb, #f5576c)', accent: '#f5576c' },
    { name: 'Услуги', slug: 'services', emoji: '🧰', gradient: 'var(--cat-services)', accent: '#e11d48', marketOnly: true },
    { name: 'Жильё\u00a0для путешествий', slug: 'travel', emoji: '🧳', gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)', accent: '#4facfe' },
  ];
  const ALL_CATS = CATS;

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

      {/* ===== DESKTOP CATEGORIES BAR — Avito-style horizontal icons =====
          На десктопе плитка «Все» показывается ТОЛЬКО в режиме Маркет
          (через data-market-only-strict, CSS-фильтр в globals.css).
          В Бартере «Все» не имеет смысла — там режим сам по себе фильтр. */}
      <div className="hidden border-b border-border bg-background md:block">
        <div className="mx-auto flex max-w-7xl items-stretch gap-0 overflow-x-auto px-6">
          {ALL_CATS.map((cat) => {
            const catId = catIdMap[cat.slug] || '';
            const isActive = urlCategoryId === catId && catId !== '';
            const desktopAllTile = cat.slug === 'all';
            return (
              <Link
                key={cat.slug + cat.name}
                href={{ pathname: '/', query: { ...preservedListQuery, ...(desktopAllTile ? {} : { categoryId: catId }) } }}
                data-market-only-strict={desktopAllTile ? 'true' : undefined}
                data-market-only={cat.marketOnly ? 'true' : undefined}
                className={`relative flex shrink-0 flex-col items-center justify-center gap-1 px-4 pt-3.5 pb-3 transition-colors ${
 isActive || (desktopAllTile && !urlCategoryId)
 ? 'border-b-2 border-primary text-primary'
 : 'border-b-2 border-transparent text-foreground/70 hover:text-foreground'
 }`}
              >
                <span className="text-[26px] leading-none" aria-hidden>
                  {desktopAllTile ? '🗂️' : cat.emoji}
                </span>
                <span className={`text-xs whitespace-nowrap ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {cat.name.replace(/\u00a0/g, ' ')}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ===== MOBILE STICKY HEADER — реф (handoff-bundle/home.html) =====
          БЕЛЫЙ фон, чёрный текст, акцент применяется только к мелким
          индикаторам (счётчик «12» у сердца). Status-bar iOS/Android
          окрашивается в белый (см. ModeThemeSync + pre-paint скрипт в
          layout.tsx).
          Колокольчик (уведомления) убран — все системные сообщения
          агрегируются в /messages. Вместо него — кнопка-чипс города
          с MapPin (раньше висела отдельной строкой под поиском).
          Справа остаётся «Избранное» (Heart) со счётчиком. */}
      <div
        className="mobile-sticky-header md:hidden"
        style={{
          background: 'var(--mode-header-bg)',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          borderBottom: '1px solid var(--border-subtle)',
          transition: 'background 200ms ease',
        }}
      >
        <header style={{ width: '100%', padding: '8px 16px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Link
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                textDecoration: 'none',
                color: 'var(--fg-strong)',
                fontWeight: 800,
                fontSize: 19,
                letterSpacing: '-0.02em',
                flexShrink: 0,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 28,
                  height: 28,
                  position: 'relative',
                  flexShrink: 0,
                  display: 'inline-block',
                }}
              >
                <span style={{ position: 'absolute', width: 16, height: 16, borderRadius: '50%', background: '#E85D26', top: 0, left: 0 }} />
                <span style={{ position: 'absolute', width: 16, height: 16, borderRadius: '50%', background: '#F8B500', top: 0, right: 0, mixBlendMode: 'multiply', opacity: 0.92 }} />
                <span style={{ position: 'absolute', width: 16, height: 16, borderRadius: '50%', background: '#2D9E58', bottom: 0, left: 6, mixBlendMode: 'multiply', opacity: 0.92 }} />
              </span>
              <span>Бартер</span>
            </Link>
            <span style={{ flex: 1 }} />
            {/* Городская плашка (раньше была колокольчиком) — кликабельный
                чипс, ведущий на /profile/settings?section=location (future).
                Пока рендерим как обычный button — handler прикрутим в
                Phase 1.x вместе с селектором города. */}
            <button
              type="button"
              aria-label={`Город: ${currentCity}. Изменить`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                height: 32,
                padding: '0 10px',
                background: 'var(--bg-muted)',
                border: 'none',
                borderRadius: 999,
                color: 'var(--fg-strong)',
                font: 'inherit',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
                maxWidth: 160,
                overflow: 'hidden',
              }}
            >
              <MapPin size={14} strokeWidth={2} color="var(--mode-accent)" aria-hidden />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentCity}</span>
              <ChevronDown size={14} strokeWidth={2} aria-hidden style={{ color: 'var(--fg-subtle)', flexShrink: 0 }} />
            </button>
            <Link
              href="/favorites"
              aria-label="Избранное"
              style={{
                position: 'relative',
                width: 40,
                height: 40,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                background: 'transparent',
                color: 'var(--fg-strong)',
                textDecoration: 'none',
                flexShrink: 0,
              }}
            >
              <Heart size={22} strokeWidth={1.8} aria-hidden />
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  minWidth: 16,
                  height: 16,
                  padding: '0 4px',
                  borderRadius: 8,
                  background: 'var(--mode-accent)',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  display: 'grid',
                  placeItems: 'center',
                  lineHeight: 1,
                }}
              >
                12
              </span>
            </Link>
          </div>

          {/* Grey pill search — реф: bg=var(--bg-muted), h=44, radius=12.
              Строка города больше НЕ идёт под поиском (переехала в чипс
              на месте колокольчика). */}
          <form
            action="/"
            method="GET"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--bg-muted)',
              height: 44,
              borderRadius: 12,
              padding: '0 12px',
            }}
          >
            {effectiveRecoMode ? <input type="hidden" name="reco" value="1" /> : null}
            {geoHidden}
            {currentCity ? <input type="hidden" name="city" value={currentCity} /> : null}
            <Search size={18} strokeWidth={1.8} color="var(--fg-subtle)" style={{ flexShrink: 0 }} aria-hidden />
            <MobileSearchInput
              defaultValue={currentQ}
              style={{
                flex: 1,
                minWidth: 0,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                font: 'inherit',
                fontSize: 15,
                color: 'var(--fg-default)',
              }}
            />
            <SlidersHorizontal size={18} strokeWidth={1.8} color="var(--fg-subtle)" aria-label="Фильтры" />
          </form>
        </header>
      </div>

      {/* ===== MOBILE CATEGORIES — cats-avito 2 строки × горизонтальный скролл =====
          Реф (handoff-bundle/home.html): белые плитки 150×72, слева текст,
          справа эмодзи в цветном градиентном круге (Avito 2026 visual).
          На мобиле плитка «Все» НЕ рендерится (см. desktopMarketOnly).
          Категории `marketOnly` скрываются в режиме Бартер через CSS-фильтр
          `html[data-mode="barter"] [data-market-only]`. */}
      <div className="md:hidden" style={{ background: 'var(--bg-page)' }}>
        <div className="cats cats-avito">
          {CATS.filter((cat) => !cat.desktopMarketOnly).map((cat) => {
            const catId = catIdMap[cat.slug] || '';
            const href = { pathname: '/', query: { ...preservedListQuery, categoryId: catId } };
            return (
              <Link
                key={cat.slug}
                href={href}
                data-market-only={cat.marketOnly ? 'true' : undefined}
                className="cat"
              >
                <div className="cat-text">{cat.name}</div>
                <div className="cat-media" style={{ background: cat.gradient }}>
                  <span className="cat-emoji" aria-hidden>{cat.emoji}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ===== MAIN CONTENT =====
          Мобильный фон теперь тоже белый (шапка белая — реф), блок остаётся
          muted на десктопе ради контраста карточек. */}
      <main className="relative z-20 bg-background md:bg-muted">
        <div className="mx-auto max-w-7xl px-2 pt-2 pb-24 md:px-6 md:py-8">
          <HomePreferenceCookieSync city={currentCity} categoryId={urlCategoryId} />

          {/* ===== MOBILE: режим Бартер/Маркет (UI-стаб до Phase 13) =====
              Баннер «Обмен без денег» убран — режим уже реализован через
              MobileModeToggle и сквозную CSS-палитру. */}
          <div className="mb-3 flex justify-center md:hidden">
            <MobileModeToggle />
          </div>

          {/* ===== MOBILE: пример-кластер по режиму =====
              BarterExampleCluster — показывается только при data-mode="barter"
              (CSS), CTA «Хочу обменять».
              MarketExampleCluster — показывается только при data-mode="market"
              (CSS), цена + CTA «Показать номер» (салатовый Avito 2026).
              Временная витрина до Phase 4 (поиск) и Phase 13 (бартер). */}
          <BarterExampleCluster />
          <MarketExampleCluster />

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
            {/* MOBILE-only: design-style section header — «Свежие предложения · 234 за сегодня · рядом» */}
            {mergedFeed.length > 0 && !currentQ ? (
              <div className="px-2 pt-1 pb-3 md:hidden">
                <h2 className="m-0 text-[20px] font-bold tracking-tight text-foreground">Свежие предложения</h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {listings.total > 0 ? `${listings.total} ${pluralRu(listings.total, ['объявление', 'объявления', 'объявлений'])}` : 'обновлено только что'}
                  {currentCity ? ` · ${currentCity}` : ''}
                </p>
              </div>
            ) : null}

            {mergedFeed.length > 0 ? (
              <div className="hidden flex-wrap items-center justify-between gap-3 px-1 pt-1 pb-4 md:flex">
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
            <div className="listing-grid grid grid-cols-2 gap-3 px-2 md:grid-cols-3 md:gap-3 md:px-0 lg:grid-cols-4 lg:gap-4">
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
