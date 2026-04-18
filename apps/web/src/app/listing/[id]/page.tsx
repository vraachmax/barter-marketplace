import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import {
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  MapPin,
  Store,
} from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const listing = await apiGetJson<{ title: string; city: string; priceRub: number | null; images?: Array<{ url: string }> }>(`/listings/${id}`);
    if (!listing) return { title: 'Объявление не найдено' };
    const price = listing.priceRub != null ? `${listing.priceRub.toLocaleString('ru-RU')} ₽` : 'Цена договорная';
    const title = `${listing.title} — ${price}`;
    const desc = `${listing.title} в ${listing.city}. ${price}. Купить на Бартер.`;
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
    }),
    apiGetJson<ListingCard[]>(`/listings/${id}/similar?limit=10`).catch(() => [] as ListingCard[]),
  ]);

  if (!listing) {
    return (
      <div className="min-h-screen bg-muted px-4 py-10">
        <Card className="mx-auto max-w-3xl p-8">
          <div className="text-lg font-bold text-foreground">Объявление не найдено</div>
          <Button render={<Link href="/" />} className="mt-4">
            На главную
          </Button>
        </Card>
      </div>
    );
  }

  const images = listing.images ?? [];
  const galleryPlaceholder = (
    <ListingPlaceholder
      title={listing.title}
      categoryTitle={listing.category.title}
      className="aspect-[4/3] w-full rounded-2xl border border-border sm:aspect-[16/10]"
    />
  );

  return (
    <div className="min-h-screen bg-muted text-foreground antialiased">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Button render={<Link href="/" />} variant="ghost" size="sm" className="h-9 gap-1.5 px-3 text-sm">
            <ChevronLeft size={18} strokeWidth={1.8} aria-hidden />
            Назад в ленту
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pt-5 pb-28 lg:pb-12">
        <ListingViewTracker listingId={listing.id} />

        {/* Breadcrumbs — Avito-style */}
        <nav
          aria-label="Breadcrumb"
          className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
        >
          <Link href="/" className="transition-colors hover:text-primary">
            Главная
          </Link>
          <ChevronRight size={12} className="text-foreground/30" aria-hidden />
          <Link
            href={`/?categoryId=${listing.category.id}`}
            className="transition-colors hover:text-primary"
          >
            {listing.category.title}
          </Link>
          <ChevronRight size={12} className="text-foreground/30" aria-hidden />
          <Link
            href={`/?city=${encodeURIComponent(listing.city)}`}
            className="transition-colors hover:text-primary"
          >
            {listing.city}
          </Link>
          <ChevronRight size={12} className="text-foreground/30" aria-hidden />
          <span className="truncate font-medium text-foreground/80">{listing.title}</span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-4">
          <div className="min-w-0 space-y-3">
            {/* Header card: title + meta */}
            <Card className="gap-2 px-5 py-4">
              <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-[28px]">
                {listing.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="tabular-nums">№ {listing.id.slice(0, 9)}</span>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <Calendar size={12} strokeWidth={1.8} aria-hidden />
                  {formatListedAt(listing.createdAt)}
                </span>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <Eye size={12} strokeWidth={1.8} aria-hidden />
                  {listing.viewsCount ?? 0} просмотров
                </span>
              </div>
              {listing.status !== 'ACTIVE' ? (
                <div className="mt-2 rounded-md bg-muted px-3 py-2 text-xs font-semibold text-foreground/70">
                  {statusLabel(listing.status, listing.duplicateImageFlag)}
                </div>
              ) : null}
            </Card>

            {/* Gallery */}
            <Card className="overflow-hidden p-0">
              <ListingGallery
                images={images}
                title={listing.title}
                apiBase={API_URL}
                placeholder={galleryPlaceholder}
              />
            </Card>

            {/* Description + attributes */}
            <Card className="gap-3 px-5 py-5">
              <h2 className="text-lg font-semibold text-foreground">Описание</h2>
              <div className="overflow-hidden break-words text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                {listing.description}
              </div>
              <ListingAttributesDisplay attributes={listing.attributes} />
            </Card>

            {/* Actions row */}
            <div className="flex flex-wrap items-center gap-2 px-1">
              <ListingShareButton title={listing.title} />
              <ListingReportButton listingId={listing.id} title={listing.title} />
              <span className="ml-auto inline-flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
                <MapPin size={12} strokeWidth={1.8} aria-hidden />
                {listing.city}
              </span>
            </div>

            {/* Safety notice */}
            <div className="flex gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-4 text-sm text-accent">
              <AlertTriangle
                size={20}
                strokeWidth={1.8}
                className="mt-0.5 shrink-0 text-accent"
                aria-hidden
              />
              <div>
                <p className="font-bold">Безопасная сделка</p>
                <p className="mt-1 text-xs leading-relaxed opacity-95">
                  Не переходите в WhatsApp, Telegram и другие мессенджеры по просьбе продавцов и
                  покупателей — так действуют мошенники. Договаривайтесь и переписывайтесь здесь, как
                  рекомендуют крупные маркетплейсы.
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

          {/* Sticky right rail — buy panel */}
          <aside className="space-y-3 lg:sticky lg:top-20">
            {/* Price + CTA */}
            <Card className="gap-3 px-5 py-5">
              <div className="text-[28px] leading-tight font-bold tracking-tight text-foreground tabular-nums">
                {formatRub(listing.priceRub)}
              </div>
              <p className="text-xs text-muted-foreground">Включая торг — уточняйте в чате</p>

              <div className="mt-1 space-y-2">
                <Button
                  render={<Link href={`/messages?listingId=${listing.id}`} />}
                  size="lg"
                  className="h-11 w-full rounded-xl text-[15px] font-semibold"
                >
                  Написать сообщение
                </Button>
                <ShowPhoneButton
                  phone={listing.owner.phone}
                  email={listing.owner.email}
                  sellerId={listing.owner.id}
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">Отвечает за несколько часов</p>

              <Separator />

              <FavoriteToggle listingId={listing.id} />
            </Card>

            {/* Seller card */}
            <Card className="gap-3 px-5 py-5">
              <div className="flex items-start gap-3">
                <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-base font-bold text-primary-foreground">
                  {(listing.owner.name ?? 'П').slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                    Продавец
                  </p>
                  <Link
                    href={`/seller/${listing.owner.id}`}
                    className="block truncate text-base font-bold text-foreground transition-colors hover:text-primary"
                  >
                    {listing.owner.name ?? 'Продавец'}
                  </Link>
                  <div className="mt-0.5">
                    <SellerPresenceBadge sellerId={listing.owner.id} compact />
                  </div>
                </div>
              </div>
              <Badge
                variant="outline"
                className="w-fit gap-1.5 border-primary/20 bg-primary/10 text-primary"
              >
                <Store size={12} strokeWidth={1.8} aria-hidden />
                Документы проверены
              </Badge>
              <Link
                href={`/seller/${listing.owner.id}`}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Все объявления продавца →
              </Link>
            </Card>

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

      {/* Bottom nav lives in layout.tsx — MobileBottomNav */}
    </div>
  );
}
