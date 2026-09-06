import Link from 'next/link';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { API_URL, apiGetJson, type Category, type ListingCard } from '@/lib/api';
import { getAvailableCatalogCategories } from '@/lib/catalog-categories';
import { HomePreferenceCookieSync } from '@/components/home-preference-cookie-sync';
import { ListingCardComponent } from '@/components/listing-card';
import { SiteHeader } from '@/components/site-header';
import { SearchInputWithSuggestions } from '@/components/search-input-with-suggestions';
import { FeedLoadMore } from '@/components/feed-load-more';
import { SiteFooter } from '@/components/site-footer';
import { Button } from '@/components/ui/button';
import { CatalogControls } from '@/components/catalog-controls';
import { BarterHomeLogo } from '@/components/barter-home-logo';
import { CatalogModeToggle } from '@/components/catalog-mode-toggle';
import { assertCatalogMode, catalogErrorMessage, parseCatalogMode, CATALOG_MODE_COOKIE, type CatalogMode } from '@/lib/catalog-mode';
import { Heart, LayoutGrid, Search, Sparkles } from 'lucide-react';

type ListingsResponse = {
  appliedMode?: CatalogMode;
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
      { cache: 'no-store', signal: AbortSignal.timeout(3000) },
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
  mode?: CatalogMode;
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
    if (params.city?.trim() && x.city.toLowerCase() !== params.city.trim().toLowerCase()) return false;
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
  qp.set('mode', params.mode ?? 'market');
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
  const currentMode = parseCatalogMode(sp.mode ?? cookieStore.get(CATALOG_MODE_COOKIE)?.value);
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
  const currentCity = sp.city ?? prefCity;
  const currentQ = sp.q ?? '';
  const urlCategoryId = (sp.categoryId ?? '').trim();
  const currentPriceMin = sp.priceMin ?? '';
  const currentPriceMax = sp.priceMax ?? '';
  const recoMode = sp.reco === '1';
  const hasSearchQuery = currentQ.trim().length > 0;
  const effectiveRecoMode = currentMode === 'market' && recoMode && !hasSearchQuery && !urlCategoryId && !currentPriceMin && !currentPriceMax && currentSort === 'relevant';
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
            const normalized = applyClientFiltersAndSort(items, { ...sp, city: recommendationCity });
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
            mode: currentMode,
            sort: apiSort,
            city: sp.city ?? prefCity ?? undefined,
            categoryId: urlCategoryId || undefined,
            priceMin: sp.priceMin ?? undefined,
            priceMax: sp.priceMax ?? undefined,
          }),
        ).then((data) => assertCatalogMode(data, currentMode));

  const feedApiPath = buildListingsPath({
    ...sp,
    mode: currentMode,
    sort: apiSort,
    city: sp.city ?? prefCity ?? undefined,
    categoryId: urlCategoryId || undefined,
    priceMin: sp.priceMin ?? undefined,
    priceMax: sp.priceMax ?? undefined,
  });

  const emptyListings: ListingsResponse = { page: 1, limit: 20, total: 0, vipStrip: [], items: [] };
  const defaultCities = ['Москва', 'Санкт-Петербург', 'Казань'];

  const [catRes, listRes, citiesRes] = await Promise.allSettled([
    categoriesPromise,
    listingsPromise,
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
  const russianCitiesRaw = Array.isArray(
    citiesRes.status === 'fulfilled' ? citiesRes.value : null,
  )
    ? (citiesRes as PromiseFulfilledResult<string[]>).value
    : defaultCities;

  // SSR error visibility — logs surface in Vercel function logs.
  if (catRes.status === 'rejected') console.error('[home] categories fetch rejected:', catRes.reason);
  if (listRes.status === 'rejected') console.error('[home] listings fetch rejected:', listRes.reason);
  if (citiesRes.status === 'rejected') console.error('[home] cities fetch rejected:', citiesRes.reason);

  const apiBackendDown =
    listRes.status === 'rejected';
  const feedError = listRes.status === 'rejected' ? catalogErrorMessage(listRes.reason) : '';
  const russianCities = russianCitiesRaw.includes(currentCity)
    ? russianCitiesRaw
    : [currentCity, ...russianCitiesRaw];
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
    mode: currentMode,
    ...(currentQ ? { q: currentQ } : {}),
    ...(currentCity ? { city: currentCity } : {}),
    ...(currentPriceMin ? { priceMin: currentPriceMin } : {}),
    ...(currentPriceMax ? { priceMax: currentPriceMax } : {}),
    ...(currentSort ? { sort: currentSort } : {}),
    ...(geoOk ? { lat: String(latN), lon: String(lonN), radiusKm: currentRadiusKm } : {}),
  };

  // Category illustrations are decorative; destinations always come from API slugs.
  const CATS = [
    { name: 'Электроника', slug: 'electronics' },
    { name: 'Для дома', slug: 'home' },
    { name: 'Одежда', slug: 'clothes' },
    { name: 'Детям', slug: 'kids' },
    { name: 'Авто', slug: 'auto' },
    { name: 'Хобби', slug: 'hobby' },
    { name: 'Недвижимость', slug: 'realty' },
    { name: 'Работа', slug: 'job' },
    { name: 'Услуги', slug: 'services' },
    { name: 'Все категории', slug: 'all' },
  ];
  const availableCategories = getAvailableCatalogCategories(CATS, categories);

  // Keep requested filters and sorting authoritative. Recommendations must
  // have a separate surface, rather than being injected into search results.
  const feedSeenIds = new Set<string>();
  const mergedFeed = listings.items.filter((item) => {
    if (!item?.id || feedSeenIds.has(item.id)) return false;
    feedSeenIds.add(item.id);
    return true;
  });

  return (
    <div className="min-h-screen bg-background antialiased">
      {apiBackendDown ? (
        <div role="alert" className="border-b border-accent/30 bg-accent/10 px-4 py-3 text-center text-sm text-accent">
          {feedError}
        </div>
      ) : null}

      {/* ===== DESKTOP HEADER ===== */}
      <div className="hidden md:block">
        <SiteHeader regionControl={<div className="flex shrink-0 items-center gap-1"><CatalogControls categories={categories} cities={russianCities} values={preservedListQuery} categoryId={urlCategoryId} trigger="city" /><CatalogControls categories={categories} cities={russianCities} values={preservedListQuery} categoryId={urlCategoryId} trigger="filters" /></div>}>
          <form action="/" method="GET" className="hidden min-w-0 flex-1 items-center md:flex">
            <input type="hidden" name="mode" value={currentMode} />
            <input type="hidden" name="sort" value={currentSort} />
            {geoHidden}
            {currentCity ? <input type="hidden" name="city" value={currentCity} /> : null}
            {currentPriceMin ? <input type="hidden" name="priceMin" value={currentPriceMin} /> : null}
            {currentPriceMax ? <input type="hidden" name="priceMax" value={currentPriceMax} /> : null}
            <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-l-full border border-r-0 border-border bg-background px-4">
              <Search size={16} strokeWidth={1.8} className="shrink-0 text-muted-foreground" aria-hidden />
              {urlCategoryId ? <input type="hidden" name="categoryId" value={urlCategoryId} /> : null}
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
              className="h-11 shrink-0 rounded-r-full bg-primary px-7 text-[15px] font-semibold whitespace-nowrap text-primary-foreground transition hover:bg-primary/90"
            >
              Найти
            </button>
          </form>
        </SiteHeader>
      </div>

      <header className="glass-panel sticky top-0 z-40 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] md:hidden">
        <div className="mb-3 flex min-h-11 items-center justify-between gap-2">
          <BarterHomeLogo />
          <div className="flex min-w-0 items-center gap-1">
            <CatalogControls categories={categories} cities={russianCities} values={preservedListQuery} categoryId={urlCategoryId} trigger="city" />
            <Link href="/favorites" aria-label="Избранное" className="grid size-11 shrink-0 place-items-center rounded-full text-foreground hover:bg-muted">
              <Heart size={21} strokeWidth={1.7} aria-hidden />
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <form action="/" method="GET" className="glass-panel flex h-12 min-w-0 flex-1 border border-border items-center gap-2 rounded-full px-3 focus-within:ring-2 focus-within:ring-primary">
            {Object.entries(preservedListQuery).filter(([key]) => key !== 'q').map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
            {urlCategoryId ? <input type="hidden" name="categoryId" value={urlCategoryId} /> : null}
            <button type="submit" aria-label="Найти объявления" className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground">
              <Search size={21} strokeWidth={1.7} aria-hidden />
            </button>
            <input key={currentQ} name="q" type="search" aria-label="Поиск объявлений" enterKeyHint="search" defaultValue={currentQ} placeholder="Что ищете?" className="h-12 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground" />
          </form>
          <CatalogControls categories={categories} cities={russianCities} values={preservedListQuery} categoryId={urlCategoryId} trigger="filters" />
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 pt-4 md:px-6">
        <CatalogModeToggle mode={currentMode} values={{ ...preservedListQuery, categoryId: urlCategoryId }} />
        <p className="text-xs text-muted-foreground">{currentMode === 'barter' ? 'Объявления продавцов, готовых к обмену' : 'Весь каталог: покупки и предложения обмена'}</p>
      </div>
      <nav aria-label="Категории объявлений" className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-6">
        <div className="grid grid-flow-col grid-rows-2 auto-cols-[88px] gap-2 overflow-x-auto pb-2 [scrollbar-width:thin] md:auto-cols-[112px] md:gap-3">
          {availableCategories.map((cat) => (
            <Link
              key={cat.slug}
              href={{ pathname: '/', query: { ...preservedListQuery, ...(cat.categoryId ? { categoryId: cat.categoryId } : {}) } }}
              aria-current={urlCategoryId === cat.categoryId ? 'true' : undefined}
              className="group flex min-h-[98px] flex-col items-center justify-center gap-1 rounded-2xl border border-border/50 bg-muted/40 p-2 text-center text-xs text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary aria-[current=true]:border-primary aria-[current=true]:bg-primary/5 md:min-h-[110px] md:text-[13px]"
            >
              {cat.slug === 'all' ? <LayoutGrid size={40} strokeWidth={1.5} className="my-1 text-muted-foreground" aria-hidden /> : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/categories/${cat.slug}.webp`} alt="" width={56} height={56} className="size-14 rounded-xl object-contain md:size-16" />
              )}
              <span className="leading-snug">{cat.name}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* ===== MAIN CONTENT =====
          Мобильный фон теперь тоже белый (шапка белая — реф), блок остаётся
          muted на десктопе ради контраста карточек. */}
      <main className="relative z-20 bg-background">
        <div className="mx-auto max-w-7xl px-4 pt-1 pb-28 md:px-6 md:pb-10">
          <HomePreferenceCookieSync city={currentCity} categoryId={urlCategoryId} />

          {/* Exchange availability is a seller choice, not a cosmetic theme. */}

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

          {listings.vipStrip?.length ? <section aria-label="Продвигаемые объявления" className="mb-7">
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">Продвигаемые объявления</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{listings.vipStrip.map((item) => <ListingCardComponent key={item.id} data={item} apiBase={API_URL} />)}</div>
          </section> : null}

          {/* ===== LISTINGS SECTION ===== */}
          <section>
            {/* MOBILE-only: design-style section header — «Свежие предложения · 234 за сегодня · рядом» */}
            {mergedFeed.length > 0 ? (
              <div className="pt-1 pb-4 md:hidden">
                <h2 className="m-0 text-[20px] font-bold tracking-tight text-foreground">{currentQ ? `Результаты: «${currentQ}»` : 'Свежие объявления'}</h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {listings.total > 0 ? `${listings.total} ${pluralRu(listings.total, ['объявление', 'объявления', 'объявлений'])}` : 'Объявления'}
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
                    <input type="hidden" name="mode" value={currentMode} />
                    {currentQ ? <input type="hidden" name="q" value={currentQ} /> : null}
                    {currentCity ? <input type="hidden" name="city" value={currentCity} /> : null}
            {currentPriceMin ? <input type="hidden" name="priceMin" value={currentPriceMin} /> : null}
            {currentPriceMax ? <input type="hidden" name="priceMax" value={currentPriceMax} /> : null}
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
            <div className="listing-grid grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 md:gap-x-5 md:gap-y-8 lg:grid-cols-4">
              {mergedFeed.length === 0 ? (
                <div className="col-span-full rounded-2xl bg-card p-12 text-center text-card-foreground ring-1 ring-foreground/10">
                  <Search size={36} className="mx-auto mb-4 text-muted-foreground" aria-hidden />
                  <p className="text-base font-semibold text-foreground">{apiBackendDown ? 'Объявления временно недоступны' : 'Ничего не нашлось'}</p>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {apiBackendDown ? feedError : currentMode === 'barter' ? 'Пока нет подходящих предложений обмена. Измените фильтры или добавьте своё объявление.' : 'Попробуйте снять категорию или изменить город.'}
                  </p>
                </div>
              ) : null}
              {mergedFeed.map((x) => (
                <ListingCardComponent key={x.id} data={x} apiBase={API_URL} />
              ))}

              {!effectiveRecoMode && !apiBackendDown && listings.total > listings.items.length ? (
                <FeedLoadMore key={feedApiPath} mode={currentMode} initialIds={[...mergedFeed, ...(listings.vipStrip ?? [])].map((item) => item.id)} initialPage={1} total={listings.total} limit={20} basePath={feedApiPath} apiBase={API_URL} />
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
