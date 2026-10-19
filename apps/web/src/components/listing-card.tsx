'use client';

import { useRouter } from 'next/navigation';
import { trackBehaviorEvents } from '@/lib/behavior-track';
import { Camera, MapPin } from 'lucide-react';
import { TrackedListingLink } from '@/components/tracked-listing-link';
import FeedListingHoverThumb from '@/components/feed-listing-hover-thumb';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import ListingPlaceholder from '@/components/listing-placeholder';
import FeedFavoriteAction from '@/components/feed-favorite-action';
import { cn } from '@/lib/utils';
import type { ListingCard as ListingCardData } from '@/lib/api';

const PRICE_TYPE_SUFFIX: Record<string, string> = {
  per_day: 'за сутки',
  per_hour: 'в час',
  per_service: 'за услугу',
  per_sqm: 'за м²',
  per_month: 'в месяц',
  per_shift: 'за смену',
};

function formatRub(v: number | null | undefined, priceType?: string | null) {
  if (v == null) return 'Цена не указана';
  const base = `${v.toLocaleString('ru-RU')} ₽`;
  const suffix = priceType ? PRICE_TYPE_SUFFIX[priceType] : undefined;
  return suffix ? `${base} ${suffix}` : base;
}

/** Промо-маркировка и нейтральная подсветка сохраняются в обоих режимах. */
function promoRing(promo: ListingCardData['promoType']): string {
  switch (promo) {
    case 'TOP':
    case 'VIP':
      return 'ring-accent/40';
    case 'XL':
      return 'ring-primary/40';
    default:
      return 'ring-0';
  }
}

type Props = {
  data: ListingCardData;
  apiBase: string;
  /**
   * Зафиксированная высота превью в px. Если передан — используется fixed-height.
   * Если не передан — применяется aspect-square (1:1) как в Claude Design home.html.
   */
  thumbHeight?: number;
  className?: string;
  /** Favorites manages removal with its own single action; don't stack two hearts. */
  showFavoriteAction?: boolean;
  /** Home tiles show the trade mode on the photo; catalog tiles show it below the title. */
  surface?: 'home' | 'catalog';
};

/**
 * Общая карточка объявления в выбранном дизайне каталога.
 * Используется в ленте главной, на /listings, в избранном и в кабинете продавца.
 *
 * Структура (см. `docs/design-system/project/ui_kits/web/ListingCard.jsx`):
 *  ┌──────────────────────┐
 *  │  thumb 1:1 / 140px   │  ← бейдж промо TL · точки фото
 *  ├──────────────────────┤
 *  │  16/700  цена        │
 *  │  13/400  заголовок   │
 *  │  12/400  город · км  │
 *  └──────────────────────┘
 */
export function ListingCardComponent({ data, apiBase, thumbHeight, className, showFavoriteAction = true, surface = 'catalog' }: Props) {
  const router = useRouter();
  const openListing = () => { void trackBehaviorEvents([{ type: 'click_item', listingId: data.id }]); router.push(`/listing/${data.id}`); };
  const promoRingClass = promoRing(data.promoType);
  const photoCount = data.images?.length ?? 0;
  const tradeLabel = data.saleEnabled === false ? 'Обмен' : (data.barterEnabled ?? data.isBarter) ? 'Обмен / Покупка' : 'Покупка';
  const useSquareThumb = thumbHeight === undefined;
  const thumbStyleProp = useSquareThumb ? undefined : { height: thumbHeight };
  const thumbClassName = useSquareThumb
    ? surface === 'home'
      ? 'relative w-full aspect-square overflow-hidden rounded-t-[18px] bg-muted'
      : 'relative w-full aspect-[313/195] overflow-hidden rounded-t-[18px] bg-muted md:aspect-square'
    : 'relative w-full overflow-hidden rounded-t-[18px] bg-muted';

  return (
    <>
      <Card
        size="sm"
        data-surface={surface}
        className={cn(
          'refresh-listing-card group/card-listing gap-0 rounded-2xl bg-card py-0 shadow-none data-[size=sm]:gap-0 data-[size=sm]:py-0',
          promoRingClass,
          className,
        )}
      >
        <FeedListingHoverThumb
          onOpen={openListing}
          images={data.images}
          title={data.title}
          apiBase={apiBase}
          categoryTitle={data.category.title}
          categorySlug={data.category.slug}
          thumbClassName={thumbClassName}
          imageClassName="w-full h-full object-cover"
          thumbStyle={thumbStyleProp}
          imageStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
          placeholder={<ListingPlaceholder categoryTitle={data.category.title} categorySlug={data.category.slug} compact />}
          badges={
            <>
              {surface === 'home' ? <span className="listing-trade-badge" data-exchange={Boolean(data.barterEnabled ?? data.isBarter)}>{tradeLabel}</span> : null}
              {/* Продвижение обозначается независимо от режима каталога. */}
              {data.promoType === 'TOP' || data.isBoosted ? (
                <Badge
                  data-promo-badge="true"
                  className="absolute left-2 top-2 z-[2] h-[18px] rounded bg-accent px-1.5 text-[10px] font-bold tracking-wider uppercase text-accent-foreground"
                >
                  Топ
                </Badge>
              ) : data.promoType === 'XL' ? (
                <Badge data-promo-badge="true" className="absolute left-2 top-2 z-[2] h-[18px] rounded bg-primary px-1.5 text-[10px] font-bold tracking-wider uppercase text-primary-foreground">
                  XL
                </Badge>
              ) : data.promoType === 'VIP' ? (
                <Badge data-promo-badge="true" className="absolute left-2 top-2 z-[2] h-[18px] rounded bg-foreground px-1.5 text-[10px] font-bold tracking-wider uppercase text-background">
                  VIP
                </Badge>
              ) : null}
              {photoCount > 1 ? (
                <span className="pointer-events-none absolute bottom-1.5 right-1.5 z-[2] flex items-center gap-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                  <Camera size={10} strokeWidth={2} aria-hidden />
                  {photoCount}
                </span>
              ) : null}
              {showFavoriteAction ? <FeedFavoriteAction listingId={data.id} /> : null}
            </>
          }
        />
        <TrackedListingLink href={`/listing/${data.id}`} listingId={data.id} className="listing-card-copy flex flex-col gap-1 px-3 pb-3 pt-2.5">
          <div className="line-clamp-2 text-[16px] leading-snug font-bold text-foreground md:text-[15px]">{data.title}</div>
          {surface === 'home' ? (
            <div className="listing-card-category text-xs text-muted-foreground truncate">{data.category.title}</div>
          ) : (
            <div className="listing-card-trade truncate text-[11px] text-[#ff5a0a]">{tradeLabel}</div>
          )}
          <div className="listing-card-price text-[17px] leading-tight font-bold tracking-tight text-foreground">{data.priceRub != null ? formatRub(data.priceRub, data.priceType) : data.saleEnabled === false ? 'Только обмен' : 'Цена не указана'}</div>
          <div className="listing-card-location mt-1 flex items-center gap-1 text-[12px] text-muted-foreground">
            <MapPin size={14} className="shrink-0" aria-hidden /><span className="truncate">{data.city}
            {typeof data.distanceKm === 'number' ? ` · ${data.distanceKm} км` : ''}</span>
          </div>
        </TrackedListingLink>
      </Card>
    </>
  );
}

/** Скелетон для ленты — точно повторяет геометрию `ListingCardComponent`. */
export function ListingCardSkeleton({ thumbHeight = 140 }: { thumbHeight?: number }) {
  return (
    <Card size="sm" className="gap-0 rounded-xl py-0 shadow-none">
      <Skeleton className="w-full rounded-none" style={{ height: thumbHeight }} />
      <div className="flex flex-col gap-2 px-3 pb-3 pt-2.5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </Card>
  );
}

