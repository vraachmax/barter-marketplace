import Link from 'next/link';
import { TrackedListingLink } from '@/components/tracked-listing-link';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { API_URL, apiGetJson, type Category, type ListingCard } from '@/lib/api';
import {
  CategoryGradientSquare,
  resolveCategoryPreset,
} from '@/components/category-gradient-icon';
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
  Heart,
  Home as HomeIcon,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  User,
} from 'lucide-react';

type ListingsResponse = {
  page: number;
  limit: number;
  total: number;
  /** VIP-объявления — отдельная полоса; id не повторяются в `items` */
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

  return (
    <div className="min-h-screen bg-[#f7f7f7] text-[#1a1a1a] antialiased dark:bg-zinc-950 dark:text-zinc-100">
      {apiBackendDown ? (
        <div
          role="alert"
          className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100"
        >
          <strong>Не удаётся связаться с API</strong> ({API_URL || 'сервер'}). Запустите бэкенд: в корне
          проекта{' '}
          <code className="rounded bg-amber-200/60 px-1.5 py-0.5 text-xs dark:bg-amber-900/60">npm run dev</code> или{' '}
          <code className="rounded bg-amber-200/60 px-1.5 py-0.5 text-xs dark:bg-amber-900/60">npm run dev:api</code>{' '}
          (порт 3001). Лента и категории временно пустые.
        </div>
      ) : null}
      <SiteHeader>
        <form action="/" method="GET" className="hidden min-w-0 flex-1 items-center md:flex mx-4">
          {effectiveRecoMode ? <input type="hidden" name="reco" value="1" /> : null}
          {geoHidden}
          {currentCity ? <input type="hidden" name="city" value={currentCity} /> : null}
          <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-l-lg border-[1.5px] border-r-0 border-[#00B4D8] bg-white px-3.5">
            <Search size={16} strokeWidth={1.8} className="shrink-0 text-[#b0b0b0]" aria-hidden />
            <SearchInputWithSuggestions
              formKey={currentQ}
              defaultValue={currentQ}
              categories={categories}
              className="h-10 w-full border-none bg-transparent text-sm text-[#1a1a1a] outline-none placeholder:text-[#b0b0b0] dark:text-zinc-100"
              placeholder="Поиск по объявлениям"
            />
          </div>
          <button
            type="submit"
            className="h-10 shrink-0 rounded-l-none rounded-r-lg border-none bg-[#00B4D8] px-6 text-sm font-semibold text-white whitespace-nowrap transition hover:bg-[#0096b5]"
          >
            Найти
          </button>
        </form>
      </SiteHeader>

      <main className="mx-auto max-w-7xl px-3 pb-28 pt-3 md:px-4 md:pb-12 md:pt-6 lg:px-8">
        <HomePreferenceCookieSync city={currentCity} categoryId={urlCategoryId} />

        <div className="space-y-4 md:space-y-5">
          <section className="space-y-4 md:space-y-5">
            {/* Categories — horizontal scroll on mobile, grid on desktop (Avito-style) */}
            <div className="rounded-xl bg-white py-3 dark:bg-zinc-900 md:p-4 lg:p-5">
              <div className="flex gap-2 overflow-x-auto px-3 pb-1 scrollbar-hide md:grid md:grid-cols-5 md:gap-3 md:overflow-x-visible md:px-0 md:pb-0">
                {(() => {
                  const CATS = [
                    { name: 'Авто', slug: 'auto', emoji: '🚗', bg: '#EEF2FF', bgDark: '#1e1b4b' },
                    { name: 'Недвижимость', slug: 'realty', emoji: '🏠', bg: '#FFF7ED', bgDark: '#451a03' },
                    { name: 'Работа', slug: 'job', emoji: '💼', bg: '#F0FDF4', bgDark: '#052e16' },
                    { name: 'Одежда', slug: 'clothes', emoji: '👗', bg: '#FDF2F8', bgDark: '#4a044e' },
                    { name: 'Электроника', slug: 'electronics', emoji: '📱', bg: '#EFF6FF', bgDark: '#172554' },
                    { name: 'Для дома', slug: 'home', emoji: '🛋️', bg: '#ECFDF5', bgDark: '#022c22' },
                    { name: 'Детям', slug: 'kids', emoji: '🧸', bg: '#FFFBEB', bgDark: '#422006' },
                    { name: 'Хобби', slug: 'hobby', emoji: '⚽', bg: '#FFF7ED', bgDark: '#431407' },
                    { name: 'Услуги', slug: 'services', emoji: '🔧', bg: '#F5F3FF', bgDark: '#2e1065' },
                    { name: 'Животные', slug: 'animals', emoji: '🐾', bg: '#FFF1F2', bgDark: '#4c0519' },
                  ];
                  const catIdMap: Record<string, string> = {};
                  for (const c of categories) {
                    for (const cat of CATS) {
                      if (c.title.includes(cat.name) || cat.name.includes(c.title.split(' ')[0])) catIdMap[cat.slug] = c.id;
                    }
                  }
                  return CATS.map((cat) => {
                    const catId = catIdMap[cat.slug] || '';
                    const isActive = catId !== '' && catId === urlCategoryId;
                    return (
                      <Link
                        key={cat.slug}
                        href={{
                          pathname: '/',
                          query: { ...preservedListQuery, categoryId: catId },
                        }}
                        className={`group flex min-w-[72px] shrink-0 flex-col items-center gap-1.5 rounded-xl px-2 py-2.5 transition-all duration-200 hover:scale-[1.04] hover:shadow-md active:scale-95 md:min-w-0 md:shrink md:flex-row md:gap-3 md:px-3 md:py-3 ${isActive ? 'ring-2 ring-[#00B4D8] shadow-sm' : ''}`}
                        style={{ background: cat.bg }}
                      >
                        <span className="text-2xl md:text-3xl" role="img" aria-label={cat.name}>{cat.emoji}</span>
                        <span className={`text-center text-[11px] font-medium leading-tight md:text-left md:text-sm ${isActive ? 'text-[#00B4D8]' : 'text-[#374151] dark:text-zinc-300'}`}>
                          {cat.name}
                        </span>
                      </Link>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Recommendations section */}
            {!hasSearchQuery && recommended.items.length > 0 ? (
            <div className="animate-fade-in-up">
              <div className="mb-3 flex items-center justify-between md:mb-4">
                <h2 className="text-base font-bold text-[#1a1a1a] dark:text-white md:text-xl">Рекомендации для вас</h2>
                <span className="text-xs font-medium text-[#00B4D8]">
                  <Sparkles size={14} className="mr-1 inline-block" aria-hidden />
                  Подобрано для вас
                </span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide md:grid md:grid-cols-4 md:overflow-x-visible md:pb-0">
                {recommended.items.map((x) => (
                  <div
                    key={x.id}
                    className={`${recommendedListingCardClass(x.promoType)} min-w-[160px] shrink-0 md:min-w-0 md:shrink`}
                  >
                    <TrackedListingLink href={`/listing/${x.id}`} listingId={x.id} className="block">
                      <FeedListingHoverThumb
                        images={x.images}
                        title={x.title}
                        apiBase={API_URL}
                        thumbClassName={`listing-thumb-wrap relative overflow-hidden rounded-t-xl ${listingThumbPromoExtraClass(x.promoType)}`.trim()}
                        imageClassName={`listing-thumb-img w-full aspect-[4/3]`}
                        placeholder={
                          <ListingPlaceholder
                            title={x.title}
                            categoryTitle={x.category.title}
                            className="aspect-[4/3]"
                          />
                        }
                        badges={
                          <div className="listing-thumb-shade pointer-events-none absolute inset-x-0 bottom-0 z-0 h-12" />
                        }
                      />
                      <div className="p-2.5 md:p-3">
                        <div className="line-clamp-2 text-[13px] font-normal leading-snug text-[#1a1a1a] group-hover:underline dark:text-zinc-100 mb-1">
                          {x.title}
                        </div>
                        <div className={recommendedListingPriceClass()}>{formatRub(x.priceRub, x.priceType)}</div>
                        <div className="text-[11px] text-[#909090] truncate">{x.city} · {x.category.title}</div>
                      </div>
                    </TrackedListingLink>
                  </div>
                ))}
              </div>
            </div>
            ) : null}

            {effectiveRecoMode ? (
              <div className="rounded-lg bg-[#e0f5fb] p-3.5 dark:bg-sky-950/40">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-[#00B4D8] px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                    <Sparkles size={14} strokeWidth={1.8} className="shrink-0" aria-hidden />
                    Режим подбора
                  </span>
                  <span className="text-[#1a1a1a] dark:text-zinc-300">
                    Показываем ленту по вашим недавним просмотрам и интересам.
                  </span>
                </div>
              </div>
            ) : null}

            {(listings.vipStrip ?? []).length > 0 ? (
              <section
                aria-label="VIP объявления"
                className="rounded-lg bg-white p-3 dark:bg-zinc-900 md:p-4"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-[#06D6A0] px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-white">
                    VIP
                  </span>
                  <span className="text-sm text-[#6b7280] dark:text-zinc-400">
                    Закреплённые объявления
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {(listings.vipStrip ?? []).map((x) => (
                    <TrackedListingLink
                      key={x.id}
                      className={feedListingCardClass(x.promoType)}
                      href={`/listing/${x.id}`}
                      listingId={x.id}
                    >
                      <FeedListingHoverThumb
                        images={x.images}
                        title={x.title}
                        apiBase={API_URL}
                        thumbClassName={`listing-thumb-wrap relative overflow-hidden rounded-t-xl ${listingThumbPromoExtraClass(x.promoType)}`.trim()}
                        imageClassName="listing-thumb-img w-full aspect-[4/3]"
                        placeholder={
                          <ListingPlaceholder
                            title={x.title}
                            categoryTitle={x.category.title}
                            className="aspect-[4/3]"
                          />
                        }
                        badges={
                          <div className="listing-thumb-shade pointer-events-none absolute inset-x-0 bottom-0 z-0 h-10" />
                        }
                      />
                      <div className="p-[10px_12px_14px]">
                        <div className="line-clamp-2 text-sm font-normal text-[#1a1a1a] group-hover:underline dark:text-zinc-100 mb-1.5">
                          {x.title}
                        </div>
                        <div className={feedListingPriceClass()}>{formatRub(x.priceRub, x.priceType)}</div>
                        <div className="text-xs text-[#909090] truncate">
                          {x.city} · {x.category.title}
                        </div>
                      </div>
                    </TrackedListingLink>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Feed listing cards */}
            <div>
              {listings.items.length > 0 ? (
                <div className="mb-3 flex items-center justify-between md:mb-4">
                  <h2 className="text-base font-bold text-[#1a1a1a] dark:text-white md:text-xl">
                    {currentQ ? `Результаты: «${currentQ}»` : 'Все объявления'}
                  </h2>
                  <span className="text-xs text-[#909090]">{listings.total} объявлений</span>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3 lg:grid-cols-4">
              {listings.items.length === 0 ? (
                <div className="col-span-2 md:col-span-3 lg:col-span-4 rounded-xl bg-white p-8 text-center dark:bg-zinc-900">
                  <div className="mx-auto mb-3 text-4xl">🔍</div>
                  <p className="text-sm font-medium text-[#374151] dark:text-zinc-300">Ничего не нашлось</p>
                  <p className="mt-1 text-xs text-[#909090] dark:text-zinc-500">Попробуйте снять категорию или изменить город</p>
                </div>
              ) : null}
              {listings.items.map((x) => (
                <TrackedListingLink
                  key={x.id}
                  className={feedListingCardClass(x.promoType)}
                  href={`/listing/${x.id}`}
                  listingId={x.id}
                >
                  <FeedListingHoverThumb
                    images={x.images}
                    title={x.title}
                    apiBase={API_URL}
                    thumbClassName={`listing-thumb-wrap relative overflow-hidden rounded-t-xl ${listingThumbPromoExtraClass(x.promoType)}`.trim()}
                    imageClassName="listing-thumb-img w-full aspect-[4/3]"
                    placeholder={
                      <ListingPlaceholder
                        title={x.title}
                        categoryTitle={x.category.title}
                        className="aspect-[4/3]"
                      />
                    }
                    badges={
                      <>
                        <div className="listing-thumb-shade pointer-events-none absolute inset-x-0 bottom-0 z-0 h-10" />
                        {x.isBoosted ? (
                          <span className="absolute top-2 left-2 z-[1] rounded-[6px] bg-[#FFD166] px-2 py-0.5 text-[11px] font-semibold text-[#1a1a1a] shadow-sm">
                            Поднято
                          </span>
                        ) : null}
                      </>
                    }
                  />
                  <div className="p-2.5 md:p-3">
                    <div className="line-clamp-2 text-[13px] font-normal leading-snug text-[#1a1a1a] group-hover:underline dark:text-zinc-100 mb-1">
                      {x.title}
                    </div>
                    <div className={feedListingPriceClass()}>{formatRub(x.priceRub, x.priceType)}</div>
                    <div className="text-[11px] text-[#909090] truncate">
                      {x.city} · {x.category.title}
                      {typeof x.distanceKm === 'number' ? ` · ${x.distanceKm} км` : ''}
                    </div>
                  </div>
                </TrackedListingLink>
              ))}

              {!effectiveRecoMode && listings.total > listings.items.length ? (
                <FeedLoadMore
                  initialPage={1}
                  total={listings.total}
                  limit={20}
                  basePath={feedApiPath}
                  apiBase={API_URL}
                />
              ) : null}
              </div>
            </div>
          </section>
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 md:hidden">
        <div className="border-t border-[#f0f0f0] bg-white/98 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-950/98">
          <div className="mx-auto grid max-w-lg grid-cols-5 items-center px-1">
            <Link
              href="/"
              className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-[#00B4D8] transition-colors"
            >
              <HomeIcon size={22} strokeWidth={1.8} aria-hidden />
              <span>Главная</span>
            </Link>
            <Link
              href="/favorites"
              className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-[#909090] transition-colors active:text-[#00B4D8] dark:text-zinc-400"
            >
              <Heart size={22} strokeWidth={1.8} aria-hidden />
              <span>Избранное</span>
            </Link>
            <Link
              href="/new"
              className="-mt-4 flex flex-col items-center gap-1 text-[10px] font-bold"
            >
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[#00B4D8] shadow-lg shadow-[#00B4D8]/25 transition-transform active:scale-90">
                <Plus size={24} strokeWidth={2} className="text-white" aria-hidden />
              </span>
              <span className="text-[#00B4D8]">Подать</span>
            </Link>
            <Link
              href="/messages"
              className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-[#909090] transition-colors active:text-[#00B4D8] dark:text-zinc-400"
            >
              <MessageCircle size={22} strokeWidth={1.8} aria-hidden />
              <span>Чаты</span>
            </Link>
            <Link
              href="/profile"
              className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-[#909090] transition-colors active:text-[#00B4D8] dark:text-zinc-400"
            >
              <User size={22} strokeWidth={1.8} aria-hidden />
              <span>Профиль</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="hidden pb-0 md:block">
        <SiteFooter />
      </div>
    </div>
  );
}
