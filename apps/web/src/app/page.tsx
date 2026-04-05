import Link from 'next/link';
import { TrackedListingLink } from '@/components/tracked-listing-link';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { API_URL, apiGetJson, type Category, type ListingCard } from '@/lib/api';
import { HomePreferenceCookieSync } from '@/components/home-preference-cookie-sync';
import ListingPlaceholder from '@/components/listing-placeholder';
import FeedListingHoverThumb from '@/components/feed-listing-hover-thumb';
import {
  feedListingCardClass,
  feedListingPriceClass,
  listingThumbPromoExtraClass,
  recommendedListingCardClass,
  recommendedListingPriceClass,
} from '@/lib/listing-card-visuals';
import { SiteHeader } from '@/components/site-header';
import { UiSelect } from '@/components/ui-select';
import { SearchInputWithSuggestions } from '@/components/search-input-with-suggestions';
import { FeedLoadMore } from '@/components/feed-load-more';
import { SiteFooter } from '@/components/site-footer';
import {
  Baby,
  Briefcase,
  Car,
  Dog,
  Heart,
  Home as HomeIcon,
  Laptop,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Shirt,
  SlidersHorizontal,
  Sofa,
  Sparkles,
  Trophy,
  User,
  Building2,
  Wrench,
} from 'lucide-react';

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

const PRICE_TYPE_SUFFIX: Record<string, string> = {
  per_day: 'за сутки',
  per_hour: 'в час',
  per_service: 'за услугу',
  per_sqm: 'за м²',
  per_month: 'в месяц',
  per_shift: 'за смену',
};

function formatRub(v: number | null, priceType?: string | null) {
  if (v == null) return 'Цена не указана';
  const base = `${v.toLocaleString('ru-RU')} ₽`;
  const suffix = priceType ? PRICE_TYPE_SUFFIX[priceType] : undefined;
  return suffix ? `${base} ${suffix}` : base;
}

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

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  const sp = await searchParams;
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

  const categories = catRes.status === 'fulfilled' ? catRes.value : [];
  const listings = listRes.status === 'fulfilled' ? listRes.value : emptyListings;
  const recommended = recRes.status === 'fulfilled' ? recRes.value : emptyRecommended;
  const russianCitiesRaw =
    citiesRes.status === 'fulfilled' ? citiesRes.value : defaultCities;

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
    { name: 'Недвижи-\nмость', slug: 'realty', emoji: '🏢', accent: '#E8A87C' },
    { name: 'Работа', slug: 'job', emoji: '💼', accent: '#c4a484' },
  ];
  const CATS_SCROLL: Array<{ name: string; slug: string; emoji: string; accent: string }> = [
    { name: 'Услуги', slug: 'services', emoji: '🔧', accent: '#3B82F6' },
    { name: 'Электро-\nника', slug: 'electronics', emoji: '📱', accent: '#8B5CF6' },
    { name: 'Жильё для\nпутешествий', slug: 'home', emoji: '🏡', accent: '#F59E0B' },
    { name: 'Для дома\nи дачи', slug: 'home', emoji: '🛋️', accent: '#10B981' },
    { name: 'Одежда', slug: 'clothes', emoji: '👗', accent: '#EC4899' },
    { name: 'Детям', slug: 'kids', emoji: '🧸', accent: '#F97316' },
    { name: 'Хобби', slug: 'hobby', emoji: '⚽', accent: '#EF4444' },
    { name: 'Животные', slug: 'animals', emoji: '🐕', accent: '#14B8A6' },
  ];
  const ALL_CATS = [...CATS_TOP, ...CATS_SCROLL];

  const catIdMap: Record<string, string> = {};
  for (const c of categories) {
    for (const cat of ALL_CATS) {
      const cleanName = cat.name.replace(/[\n-]/g, '');
      if (c.title.includes(cleanName) || cleanName.includes(c.title.split(' ')[0])) catIdMap[cat.slug] = c.id;
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F2F3F5', fontFamily: 'Inter, sans-serif', WebkitFontSmoothing: 'antialiased', paddingBottom: 96 }}>
      {apiBackendDown ? (
        <div role="alert" style={{ borderBottom: '1px solid #FCD34D', background: '#FFFBEB', padding: '12px 16px', textAlign: 'center', fontSize: 14, color: '#78350F' }}>
          <strong>Не удаётся связаться с API</strong> ({API_URL || 'сервер'}). Запустите бэкенд.
        </div>
      ) : null}

      {/* Desktop header — hidden on mobile */}
      <div className="hidden md:block">
        <SiteHeader>
          <form action="/" method="GET" className="hidden min-w-0 flex-1 items-center md:flex">
            {effectiveRecoMode ? <input type="hidden" name="reco" value="1" /> : null}
            {geoHidden}
            {currentCity ? <input type="hidden" name="city" value={currentCity} /> : null}
            <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-l-lg border border-r-0 border-[#D1D5DB] bg-white px-3.5 dark:border-zinc-700 dark:bg-zinc-900">
              <Search size={16} strokeWidth={1.8} className="shrink-0 text-[#999]" aria-hidden />
              <SearchInputWithSuggestions
                formKey={currentQ}
                defaultValue={currentQ}
                categories={categories}
                className="h-10 w-full border-none bg-transparent text-sm text-[#111] outline-none placeholder:text-[#999] dark:text-zinc-100"
                placeholder="Поиск по объявлениям"
              />
            </div>
            <button type="submit" className="h-10 shrink-0 rounded-r-lg bg-[#00B4D8] px-6 text-sm font-semibold text-white whitespace-nowrap transition hover:bg-[#0097A7]">
              Найти
            </button>
          </form>
        </SiteHeader>
      </div>

      {/* ===== DARK GRADIENT TOP AREA (mobile-first, visible on all) ===== */}
      <div style={{ background: 'linear-gradient(to bottom, #00B4D8, #000000)', paddingBottom: 24 }} className="md:hidden">
        {/* Mobile Header */}
        <header style={{ position: 'sticky', top: 0, width: '100%', zIndex: 50, padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Logo */}
            <Link href="/" style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo_dark.svg" alt="Бартер" style={{ height: 32, width: 'auto' }} />
            </Link>
            {/* Search bar */}
            <form action="/" method="GET" style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#fff', borderRadius: 12, padding: '10px 12px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
              {effectiveRecoMode ? <input type="hidden" name="reco" value="1" /> : null}
              {geoHidden}
              {currentCity ? <input type="hidden" name="city" value={currentCity} /> : null}
              <Search size={18} strokeWidth={1.8} color="#94A3B8" style={{ marginRight: 8, flexShrink: 0 }} aria-hidden />
              <input
                name="q"
                defaultValue={currentQ}
                type="text"
                placeholder={`Поиск в ${currentCity}`}
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 15, width: '100%', color: '#1E293B' }}
              />
            </form>
            {/* Filters button */}
            <button type="button" style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: 'none' }}>
              <SlidersHorizontal size={20} strokeWidth={1.8} color="#fff" aria-label="Фильтры" />
            </button>
          </div>

          {/* Promo Strip */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff' }}>
              <span style={{ fontSize: 17, fontWeight: 700 }}>Размещение бесплатно</span>
              <div style={{ background: '#fff', borderRadius: 50, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </div>
            </div>
          </div>
        </header>

        {/* Categories Section — Dark Cards */}
        <section style={{ marginTop: 24, padding: '0 16px' }}>
          {/* Top row: 3 big cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {CATS_TOP.map((cat) => {
              const catId = catIdMap[cat.slug] || '';
              return (
                <Link
                  key={cat.slug}
                  href={{ pathname: '/', query: { ...preservedListQuery, categoryId: catId } }}
                  style={{ background: `${cat.accent}18`, borderRadius: 16, padding: 12, height: 112, position: 'relative', overflow: 'hidden', display: 'block', textDecoration: 'none', border: `1px solid ${cat.accent}30` }}
                >
                  <span style={{ color: '#1c1b1b', fontSize: 13, fontWeight: 600, position: 'relative', zIndex: 10, lineHeight: 1.3, whiteSpace: 'pre-line' }}>{cat.name}</span>
                  <div style={{ position: 'absolute', bottom: -4, right: -4, width: 64, height: 64, background: cat.accent, borderRadius: 12, transform: 'rotate(12deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                    {cat.emoji}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Second row: horizontal scroll */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, overflowX: 'auto', scrollbarWidth: 'none' }} className="hide-scrollbar">
            {CATS_SCROLL.map((cat) => {
              const catId = catIdMap[cat.slug] || '';
              return (
                <Link
                  key={cat.slug + cat.name}
                  href={{ pathname: '/', query: { ...preservedListQuery, categoryId: catId } }}
                  style={{ minWidth: 110, background: `${cat.accent}18`, borderRadius: 16, padding: 12, height: 96, position: 'relative', overflow: 'hidden', display: 'block', textDecoration: 'none', flexShrink: 0, border: `1px solid ${cat.accent}30` }}
                >
                  <span style={{ color: '#1c1b1b', fontSize: 13, fontWeight: 600, position: 'relative', zIndex: 10, lineHeight: 1.3, whiteSpace: 'pre-line' }}>{cat.name}</span>
                  <div style={{ position: 'absolute', bottom: -8, right: -8, width: 48, height: 48, background: cat.accent, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                    {cat.emoji}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      {/* ===== MAIN CONTENT — Light Surface with rounded top ===== */}
      <main style={{ background: '#FCF9F8', borderRadius: '32px 32px 0 0', marginTop: -16, position: 'relative', zIndex: 20, padding: '24px 12px 32px' }} className="md:rounded-none md:mt-0">
        <HomePreferenceCookieSync city={currentCity} categoryId={urlCategoryId} />

        {/* Recommendations section */}
        {!hasSearchQuery && recommended.items.length > 0 ? (
          <section style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginBottom: 12 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1c1b1b' }}>Рекомендации для вас</h2>
              <Link href="/" style={{ fontSize: 13, fontWeight: 500, color: '#00B4D8', textDecoration: 'none' }}>Смотреть все →</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {recommended.items.slice(0, 4).map((x) => (
                <TrackedListingLink
                  key={x.id}
                  href={`/listing/${x.id}`}
                  listingId={x.id}
                  style={{ display: 'block', borderRadius: 12, background: '#fff', boxShadow: '0 1px 6px rgba(0,103,125,0.10)', overflow: 'hidden', textDecoration: 'none', color: 'inherit' }}
                >
                  <FeedListingHoverThumb
                    images={x.images}
                    title={x.title}
                    apiBase={API_URL}
                    thumbClassName="listing-thumb-wrap relative overflow-hidden"
                    imageClassName="listing-thumb-img w-full"
                    thumbStyle={{ position: 'relative', overflow: 'hidden', height: 130, background: '#EBEBEB' }}
                    imageStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    placeholder={
                      <div style={{ height: 130, background: '#F6F3F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
                        </svg>
                      </div>
                    }
                    badges={
                      <div style={{ position: 'absolute', top: 8, right: 8, padding: 6, background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(8px)', borderRadius: '50%', color: '#fff', display: 'flex' }}>
                        <Heart size={14} strokeWidth={1.8} aria-hidden />
                      </div>
                    }
                  />
                  <div style={{ padding: 12 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1c1b1b' }}>{formatRub(x.priceRub, x.priceType)}</div>
                    <div style={{ marginTop: 2, fontSize: 12.5, color: '#3d494d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.title}</div>
                    <div style={{ marginTop: 8, fontSize: 11.5, color: '#94A3B8' }}>{x.city}</div>
                  </div>
                </TrackedListingLink>
              ))}
            </div>
          </section>
        ) : null}

        {effectiveRecoMode ? (
          <div style={{ borderRadius: 8, background: '#E8F2FF', padding: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 6, background: '#00B4D8', padding: '2px 8px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fff' }}>
                <Sparkles size={14} strokeWidth={1.8} aria-hidden />
                Режим подбора
              </span>
              <span style={{ color: '#333' }}>Показываем ленту по вашим недавним просмотрам.</span>
            </div>
          </div>
        ) : null}

        {/* VIP strip */}
        {(listings.vipStrip ?? []).length > 0 ? (
          <section aria-label="VIP объявления" style={{ borderRadius: 14, background: '#fff', padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 6, background: '#FF6F00', padding: '4px 10px', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fff' }}>VIP</span>
              <span style={{ fontSize: 14, color: '#6d797e' }}>Закреплённые объявления</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {(listings.vipStrip ?? []).map((x) => (
                <TrackedListingLink key={x.id} href={`/listing/${x.id}`} listingId={x.id} style={{ display: 'block', borderRadius: 12, background: '#fff', boxShadow: '0 1px 6px rgba(0,103,125,0.10)', overflow: 'hidden', textDecoration: 'none', color: 'inherit' }}>
                  <FeedListingHoverThumb images={x.images} title={x.title} apiBase={API_URL} thumbClassName="listing-thumb-wrap relative overflow-hidden" imageClassName="listing-thumb-img w-full" thumbStyle={{ position: 'relative', overflow: 'hidden', height: 130, background: '#EBEBEB' }} imageStyle={{ width: '100%', height: '100%', objectFit: 'cover' }} placeholder={<div style={{ height: 130, background: '#F6F3F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg></div>} badges={null} />
                  <div style={{ padding: 12 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1c1b1b' }}>{formatRub(x.priceRub, x.priceType)}</div>
                    <div style={{ marginTop: 2, fontSize: 12.5, color: '#3d494d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.title}</div>
                    <div style={{ marginTop: 8, fontSize: 11.5, color: '#94A3B8' }}>{x.city} · {x.category.title}</div>
                  </div>
                </TrackedListingLink>
              ))}
            </div>
          </section>
        ) : null}

        {/* All listings section */}
        <section>
          {listings.items.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px 12px' }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1c1b1b' }}>
                {currentQ ? `Результаты: «${currentQ}»` : 'Все объявления'}
              </h2>
              <Link href="/" style={{ fontSize: 13, fontWeight: 500, color: '#00B4D8', textDecoration: 'none' }}>Смотреть все →</Link>
            </div>
          ) : null}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {listings.items.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', borderRadius: 12, background: '#fff', padding: 32, textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#1c1b1b' }}>Ничего не нашлось</p>
                <p style={{ fontSize: 12, color: '#6d797e', marginTop: 4 }}>Попробуйте снять категорию или изменить город</p>
              </div>
            ) : null}
            {listings.items.map((x) => (
              <TrackedListingLink
                key={x.id}
                href={`/listing/${x.id}`}
                listingId={x.id}
                style={{ display: 'block', borderRadius: 12, background: '#fff', boxShadow: '0 1px 6px rgba(0,103,125,0.10)', overflow: 'hidden', textDecoration: 'none', color: 'inherit' }}
              >
                <FeedListingHoverThumb
                  images={x.images}
                  title={x.title}
                  apiBase={API_URL}
                  thumbClassName="listing-thumb-wrap relative overflow-hidden"
                  imageClassName="listing-thumb-img w-full"
                  thumbStyle={{ position: 'relative', overflow: 'hidden', height: 130, background: '#EBEBEB' }}
                  imageStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  placeholder={
                    <div style={{ height: 130, background: '#F6F3F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
                      </svg>
                    </div>
                  }
                  badges={
                    <>
                      {x.isBoosted ? (
                        <span style={{ position: 'absolute', top: 8, left: 8, zIndex: 1, borderRadius: 6, background: '#FF6F00', padding: '2px 8px', fontSize: 11, fontWeight: 600, color: '#fff' }}>Поднято</span>
                      ) : null}
                      <div style={{ position: 'absolute', top: 8, right: 8, padding: 6, background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(8px)', borderRadius: '50%', color: '#fff', display: 'flex' }}>
                        <Heart size={14} strokeWidth={1.8} aria-hidden />
                      </div>
                    </>
                  }
                />
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1c1b1b' }}>{formatRub(x.priceRub, x.priceType)}</div>
                  <div style={{ marginTop: 2, fontSize: 12.5, color: '#3d494d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.title}</div>
                  <div style={{ marginTop: 8, fontSize: 11.5, color: '#94A3B8' }}>
                    {x.city}{typeof x.distanceKm === 'number' ? ` · ${x.distanceKm} км` : ''}
                  </div>
                </div>
              </TrackedListingLink>
            ))}

            {!effectiveRecoMode && listings.total > listings.items.length ? (
              <FeedLoadMore initialPage={1} total={listings.total} limit={20} basePath={feedApiPath} apiBase={API_URL} />
            ) : null}
          </div>
        </section>
      </main>

      {/* Bottom nav moved to layout.tsx — MobileBottomNav component */}

      <div className="hidden pb-0 md:block">
        <SiteFooter />
      </div>
    </div>
  );
}
