import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { AlertTriangle, Calendar, ChevronLeft, MapPin, Store } from 'lucide-react';
import { apiGetJson, type ListingCard, API_URL } from '@/lib/api';
import FavoriteToggle from '@/components/favorite-toggle';
import SellerReviewForm from '@/components/seller-review-form';
import ListingBotAssistant from '@/components/listing-bot-assistant';
import ListingPlaceholder from '@/components/listing-placeholder';
import ListingAttributesDisplay from '@/components/listing-attributes-display';
import ListingGallery from '@/components/listing-gallery';
import ListingViewTracker from '@/components/listing-view-tracker';
import { SellerPresenceBadge } from '@/components/seller-presence-badge';
import { ListingShareButton, ListingReportButton } from '@/components/listing-actions';
import { ListingMiniMap } from '@/components/listing-mini-map';
import { ShowPhoneButton } from '@/components/show-phone-button';
import { SiteFooter } from '@/components/site-footer';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const listing = await apiGetJson<{ title: string; city: string; priceRub: number | null; images?: Array<{ url: string }> }>(`/listings/${id}`);
    if (!listing) return { title: 'Объявление не найдено' };
    const price = listing.priceRub != null ? `${listing.priceRub.toLocaleString('ru-RU')} ₽` : 'Цена договорная';
    const title = `${listing.title} — ${price}`;
    const desc = `${listing.title} в ${listing.city}. ${price}. Купить на Barter.`;
    const img = listing.images?.[0]?.url ? `${API_URL}${listing.images[0].url}` : undefined;
    return {
      title,
      description: desc,
      openGraph: { title, description: desc, ...(img ? { images: [img] } : {}) },
    };
  } catch {
    return { title: 'Объявление' };
  }
}

type Listing = ListingCard & {
  description: string;
  status: 'ACTIVE' | 'PENDING' | 'BLOCKED' | 'SOLD' | 'ARCHIVED';
  duplicateImageFlag?: boolean;
  createdAt: string;
  attributes?: Record<string, unknown> | null;
  promotions?: Array<{ type: string; weight: number; endsAt: string }>;
  viewsCount?: number;
  owner: { id: string; name: string | null; phone: string | null; email: string | null };
};

function formatRub(v: number | null) {
  if (v == null) return 'Цена договорная';
  return `${v.toLocaleString('ru-RU')} ₽`;
}

function formatListedAt(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
  const [listing, similar] = await Promise.all([
    apiGetJson<Listing>(`/listings/${id}`, {
      headers: cookieHeader ? { cookie: cookieHeader } : {},
    }),
    apiGetJson<ListingCard[]>(`/listings/${id}/similar?limit=10`).catch(() => [] as ListingCard[]),
  ]);

  if (!listing) {
    return (
      <div className="min-h-screen bg-zinc-100 px-4 py-10 dark:bg-zinc-950">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Объявление не найдено</div>
          <Link
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-sky-600/25"
            href="/"
          >
            На главную
          </Link>
        </div>
      </div>
    );
  }

  const images = listing.images ?? [];
  const galleryPlaceholder = (
    <ListingPlaceholder
      title={listing.title}
      categoryTitle={listing.category.title}
      className="aspect-[4/3] w-full rounded-2xl border border-zinc-200/80 sm:aspect-[16/10] dark:border-zinc-700"
    />
  );

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
      <header className="sticky top-0 z-50 border-b border-zinc-200/90 bg-white/95 shadow-sm backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200/90 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-sky-600 dark:hover:bg-sky-950/40"
          >
            <ChevronLeft size={20} strokeWidth={1.8} className="shrink-0" aria-hidden />
            Назад в ленту
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-5 lg:pb-12">
        <ListingViewTracker listingId={listing.id} />

        {/* Breadcrumbs — как у Авито */}
        <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-sky-700 dark:hover:text-sky-400">Главная</Link>
          <span className="text-zinc-300 dark:text-zinc-600">/</span>
          <Link
            href={`/?categoryId=${listing.category.id}`}
            className="hover:text-sky-700 dark:hover:text-sky-400"
          >
            {listing.category.title}
          </Link>
          <span className="text-zinc-300 dark:text-zinc-600">/</span>
          <Link
            href={`/?city=${encodeURIComponent(listing.city)}`}
            className="hover:text-sky-700 dark:hover:text-sky-400"
          >
            {listing.city}
          </Link>
          <span className="text-zinc-300 dark:text-zinc-600">/</span>
          <span className="truncate font-medium text-zinc-700 dark:text-zinc-300">{listing.title}</span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8">
          <div className="min-w-0 space-y-5">
            <ListingGallery images={images} title={listing.title} apiBase={API_URL} placeholder={galleryPlaceholder} />

            <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-md shadow-zinc-200/30 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/30">
              <div className="border-b border-zinc-100 px-4 py-4 dark:border-zinc-800 sm:px-6 sm:py-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <h1 className="text-xl font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-2xl lg:text-3xl">
                    {listing.title}
                  </h1>
                  <div className="shrink-0 text-left sm:text-right">
                    <div className="text-2xl font-black tabular-nums text-sky-700 dark:text-sky-400 sm:text-3xl">
                      {formatRub(listing.priceRub)}
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Включая торг — уточняйте в чате</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={18} strokeWidth={1.8} className="text-zinc-400" aria-hidden />
                    {listing.city}
                  </span>
                  {listing.latitude != null && listing.longitude != null ? (
                    <>
                      <span className="text-zinc-300 dark:text-zinc-600">·</span>
                      <span className="text-xs tabular-nums text-zinc-400 dark:text-zinc-500" title="WGS-84">
                        {listing.latitude.toFixed(4)}, {listing.longitude.toFixed(4)}
                      </span>
                    </>
                  ) : null}
                  <span className="text-zinc-300 dark:text-zinc-600">·</span>
                  <span>{listing.category.title}</span>
                  <span className="text-zinc-300 dark:text-zinc-600">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={16} strokeWidth={1.8} className="opacity-70" aria-hidden />
                    {formatListedAt(listing.createdAt)}
                  </span>
                </div>
                {listing.status !== 'ACTIVE' ? (
                  <p className="mt-2 rounded-lg bg-zinc-100 px-2 py-1.5 text-xs font-semibold leading-snug text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {listing.status === 'SOLD'
                      ? 'Продано'
                      : listing.status === 'ARCHIVED'
                        ? 'В архиве'
                        : listing.status === 'PENDING'
                          ? listing.duplicateImageFlag
                            ? 'На модерации: те же фото, что у другого объявления. В кабинете продавца можно подтвердить публикацию.'
                            : 'На модерации.'
                          : listing.status === 'BLOCKED'
                            ? 'Скрыто из-за жалоб пользователей.'
                            : 'Недоступно'}
                  </p>
                ) : null}
              </div>

              <div className="px-4 py-5 sm:px-6">
                <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Описание</h2>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {listing.description}
                </div>
                <ListingAttributesDisplay attributes={listing.attributes} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 px-1">
              <ListingShareButton title={listing.title} />
              <ListingReportButton listingId={listing.id} title={listing.title} />
              <span className="ml-auto text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                {listing.viewsCount ?? 0} просмотров
              </span>
            </div>

            <div className="flex gap-3 rounded-2xl border border-amber-200/90 bg-amber-50/80 p-4 text-sm text-amber-950 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100">
              <AlertTriangle size={22} strokeWidth={1.8} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />
              <div>
                <p className="font-bold">Безопасная сделка</p>
                <p className="mt-1 text-xs leading-relaxed opacity-95">
                  Не переходите в WhatsApp, Telegram и другие мессенджеры по просьбе продавцов и покупателей — так
                  действуют мошенники. Договаривайтесь и переписывайтесь здесь, как рекомендуют Avito и крупные
                  маркетплейсы.
                </p>
              </div>
            </div>

            <ListingBotAssistant
              listing={{
                id: listing.id,
                title: listing.title,
                description: listing.description,
                city: listing.city,
                category: listing.category,
              }}
              similar={similar}
            />
          </div>

          {/* Боковая панель — как «Buy box» на Amazon / блок справа на eBay */}
          <aside className="space-y-4 lg:sticky lg:top-20">
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-lg shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/40">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-100 to-cyan-100 dark:from-sky-950 dark:to-cyan-950">
                  <Store size={24} strokeWidth={1.8} className="text-sky-700 dark:text-sky-400" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Продавец</p>
                  <p className="truncate text-base font-bold text-zinc-900 dark:text-zinc-50">
                    {listing.owner.name ?? 'Продавец'}
                  </p>
                  <div className="mt-1">
                    <SellerPresenceBadge sellerId={listing.owner.id} compact />
                  </div>
                  <Link
                    href={`/seller/${listing.owner.id}`}
                    className="mt-1 inline-flex text-xs font-semibold text-sky-700 underline decoration-sky-600/30 underline-offset-2 hover:text-sky-900 dark:text-sky-400"
                  >
                    Все объявления продавца
                  </Link>
                </div>
              </div>
              <div className="mt-3">
                <ShowPhoneButton
                  phone={listing.owner.phone}
                  email={listing.owner.email}
                  sellerId={listing.owner.id}
                />
              </div>
              <Link
                className="mt-4 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-sky-600/25 transition hover:from-sky-700 hover:to-cyan-700"
                href={`/messages?listingId=${listing.id}`}
              >
                Написать в чат
              </Link>
              <div className="mt-3">
                <FavoriteToggle listingId={listing.id} />
              </div>
            </div>

            <SellerReviewForm sellerId={listing.owner.id} listingId={listing.id} />

            {listing.latitude != null && listing.longitude != null ? (
              <ListingMiniMap
                latitude={listing.latitude}
                longitude={listing.longitude}
                city={listing.city}
              />
            ) : null}
          </aside>
        </div>
      </main>

      <div className="hidden lg:block">
        <SiteFooter />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white/95 p-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium text-zinc-500 dark:text-zinc-400">{listing.title}</div>
            <div className="text-base font-black text-sky-700 dark:text-sky-400">{formatRub(listing.priceRub)}</div>
          </div>
          <Link
            href={`/messages?listingId=${listing.id}`}
            className="shrink-0 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-sky-600/25"
          >
            Чат
          </Link>
        </div>
      </div>
    </div>
  );
}
