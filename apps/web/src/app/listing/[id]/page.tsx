import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { ApiRequestError } from '@/lib/api-error';
import {
  Calendar,
  ChevronRight,
  Eye,
  MapPin,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import { apiGetJson, type ListingCard, API_URL, resolveAssetUrl } from '@/lib/api';
import ListingContactActions from '@/components/listing-contact-actions';
import { formatListingPrice } from '@/lib/listing-presentation';
import SellerReviewForm from '@/components/seller-review-form';
import ListingBotAssistant from '@/components/listing-bot-assistant';
import ListingPlaceholder from '@/components/listing-placeholder';
import ListingAttributesDisplay from '@/components/listing-attributes-display';
import ListingGallery from '@/components/listing-gallery';
import ListingViewTracker from '@/components/listing-view-tracker';
import { SellerPresenceBadge } from '@/components/seller-presence-badge';
import { ListingShareButton, ListingReportButton } from '@/components/listing-actions';
import { ListingMiniMap } from '@/components/listing-mini-map';
import { SiteFooter } from '@/components/site-footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const listing = await apiGetJson<{ title: string; city: string; priceRub: number | null; images?: Array<{ url: string }> }>(`/listings/${id}`);
    if (!listing) return { title: 'Объявление не найдено' };
    const price = listing.priceRub != null ? `${listing.priceRub.toLocaleString('ru-RU')} ₽` : 'Цена договорная';
    const title = `${listing.title} — ${price}`;
    const desc = `${listing.title} в ${listing.city}. ${price}. Купить на Бартер.`;
    const img = resolveAssetUrl(listing.images?.[0]?.url) ?? undefined;
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

function statusLabel(status: Listing['status'], duplicateImageFlag?: boolean) {
  if (status === 'SOLD') return 'Продано';
  if (status === 'ARCHIVED') return 'В архиве';
  if (status === 'PENDING') {
    return duplicateImageFlag
      ? 'На модерации: те же фото, что у другого объявления. В кабинете продавца можно подтвердить публикацию.'
      : 'На модерации.';
  }
  if (status === 'BLOCKED') return 'Скрыто из-за жалоб пользователей.';
  return 'Недоступно';
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
    }).catch((error: unknown) => {
      if (error instanceof ApiRequestError && error.status === 404) return null;
      throw error;
    }),
    apiGetJson<ListingCard[]>(`/listings/${id}/similar?limit=10`).catch(() => [] as ListingCard[]),
  ]);

  if (!listing) notFound();

  const images = listing.images ?? [];
  const galleryPlaceholder = (
    <ListingPlaceholder
      title={listing.title}
      categoryTitle={listing.category.title}
      categorySlug={listing.category.slug}
      className="min-h-60 rounded-3xl sm:min-h-80"
    />
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="glass-panel sticky top-0 z-30 border-b border-border/60 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-4 py-2 md:px-6">
          <Button render={<Link href="/" />} variant="ghost" size="sm">
            <ArrowLeft size={20} strokeWidth={1.8} aria-hidden /> В ленту
          </Button>
          <ListingShareButton title={listing.title} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-4 md:px-6 lg:pb-12">
        <ListingViewTracker listingId={listing.id} />
        <nav aria-label="Путь к объявлению" className="mb-3 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <Link href={`/?categoryId=${listing.category.id}`} className="inline-flex min-h-11 items-center rounded-lg px-1 hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary">
            {listing.category.title}
          </Link>
          <ChevronRight size={14} aria-hidden />
          <span>{listing.city}</span>
        </nav>
        <div className="mb-6 space-y-3">
          <h1 className="max-w-4xl break-words text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{listing.title}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><MapPin size={16} aria-hidden />{listing.city}</span>
            <span className="inline-flex items-center gap-1.5"><Calendar size={16} aria-hidden />{formatListedAt(listing.createdAt)}</span>
            <span className="inline-flex items-center gap-1.5"><Eye size={16} aria-hidden />{listing.viewsCount ?? 0} просмотров</span>
          </div>
          {listing.status !== 'ACTIVE' ? <p role="status" className="rounded-2xl bg-muted p-4 text-sm">{statusLabel(listing.status, listing.duplicateImageFlag)}</p> : null}
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
          <section aria-label="Фотографии объявления" className="min-w-0 lg:col-start-1 lg:row-start-1">
            <ListingGallery categoryTitle={listing.category.title} images={images} title={listing.title} apiBase={API_URL} placeholder={galleryPlaceholder} />
          </section>

          <aside aria-label="Цена и связь с продавцом" className="min-w-0 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <Card className="gap-5 p-5 sm:p-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{listing.category.slug === 'job' ? 'Зарплата' : 'Стоимость'}</p>
                <p className="break-words text-3xl font-semibold leading-tight tracking-tight tabular-nums">{formatListingPrice(listing.priceRub, listing.priceType)}</p>
                {listing.isBarter ? <p className="text-sm font-medium text-foreground">Возможен обмен</p> : null}
              </div>
              <ListingContactActions listingId={listing.id} sellerId={listing.owner.id} active={listing.status === 'ACTIVE'} phone={listing.owner.phone} email={listing.owner.email} />
              <div className="border-t border-border pt-5">
                <Link href={`/seller/${listing.owner.id}`} className="group flex min-h-14 items-center gap-3 rounded-2xl focus-visible:outline-2 focus-visible:outline-primary">
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-muted text-lg font-semibold" aria-hidden>{(listing.owner.name?.trim() || 'П').slice(0, 1).toUpperCase()}</span>
                  <span className="min-w-0 flex-1"><span className="block break-words text-base font-semibold group-hover:underline">{listing.owner.name || 'Продавец'}</span><span className="block text-sm text-muted-foreground">Профиль и объявления</span></span>
                  <ChevronRight size={18} className="shrink-0 text-muted-foreground" aria-hidden />
                </Link>
                <div className="mt-3"><SellerPresenceBadge sellerId={listing.owner.id} compact /></div>
              </div>
            </Card>
          </aside>

          <div className="min-w-0 space-y-7 lg:col-start-1 lg:row-start-2">
            <section aria-labelledby="listing-description">
              <h2 id="listing-description" className="mb-3 text-xl font-semibold tracking-tight">Описание</h2>
              <div className="break-words whitespace-pre-wrap text-base leading-7">{listing.description?.trim() || 'Продавец пока не добавил описание.'}</div>
            </section>
            <ListingAttributesDisplay attributes={listing.attributes} />
            <section aria-labelledby="listing-location" className="border-t border-border pt-6">
              <h2 id="listing-location" className="mb-3 text-xl font-semibold tracking-tight">Местоположение</h2>
              {listing.latitude != null && listing.longitude != null ? <ListingMiniMap latitude={listing.latitude} longitude={listing.longitude} city={listing.city} /> : <p className="text-base">{listing.city}</p>}
            </section>
            <details className="rounded-3xl border border-border p-4 sm:p-5">
              <summary className="min-h-11 cursor-pointer content-center text-base font-semibold focus-visible:outline-2 focus-visible:outline-primary">Оставить отзыв о продавце</summary>
              <SellerReviewForm sellerId={listing.owner.id} listingId={listing.id} />
            </details>
            <div className="flex gap-3 rounded-2xl bg-muted/60 p-4">
              <ShieldCheck size={20} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
              <p className="text-sm leading-6 text-muted-foreground">Обсудите условия в чате. Не сообщайте коды из SMS и данные банковской карты, проверяйте вещь перед оплатой.</p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <span className="break-all text-xs text-muted-foreground">Объявление № {listing.id}</span>
              <ListingReportButton listingId={listing.id} title={listing.title} />
            </div>
            <ListingBotAssistant listing={{ id: listing.id, title: listing.title, description: listing.description, city: listing.city, category: listing.category }} similar={similar} />
          </div>
        </div>
      </main>
      <div className="hidden lg:block"><SiteFooter /></div>
    </div>
  );
}
