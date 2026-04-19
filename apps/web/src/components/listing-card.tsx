'use client';

import { ArrowLeftRight, Camera, Heart } from 'lucide-react';
import { TrackedListingLink } from '@/components/tracked-listing-link';
import FeedListingHoverThumb from '@/components/feed-listing-hover-thumb';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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

/** Едва заметная цветная подсветка краёв для промо-карточек (Avito 2026).
 *
 * Промо-бейджи показываются только в режиме Маркет (см. CSS-фильтр
 * `html[data-mode="barter"] [data-promo-badge="true"] { display:none }`),
 * поэтому ring-цвет привязан к нейтральной палитре: TOP/VIP — мягкий акцент
 * primary-палитры бренда, XL — чуть ярче. Мы НЕ используем `--mode-accent`
 * здесь, так как оранжевая подсветка в Маркете была бы палитра-лик. */
function promoRing(promo: ListingCardData['promoType']): string {
  switch (promo) {
    case 'TOP':
    case 'VIP':
      return 'ring-accent/40';
    case 'XL':
      return 'ring-primary/40';
    default:
      return 'ring-foreground/10';
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
};

/**
 * Карточка объявления — Avito-стиль pixel-for-pixel 2026.
 * Используется в ленте главной, на /listings, в избранном и в кабинете продавца.
 *
 * Структура (см. `docs/design-system/project/ui_kits/web/ListingCard.jsx`):
 *  ┌──────────────────────┐
 *  │  thumb 1:1 / 140px   │  ← бейдж промо TL · сердце TR · точки фото
 *  ├──────────────────────┤
 *  │  16/700  цена        │
 *  │  13/400  заголовок   │
 *  │  12/400  город · км  │
 *  └──────────────────────┘
 */
export function ListingCardComponent({ data, apiBase, thumbHeight, className }: Props) {
  const promoRingClass = promoRing(data.promoType);
  const photoCount = data.images?.length ?? 0;
  const useSquareThumb = thumbHeight === undefined;
  const thumbStyleProp = useSquareThumb ? undefined : { height: thumbHeight };
  const thumbClassName = useSquareThumb
    ? 'relative w-full aspect-square overflow-hidden bg-muted'
    : 'relative w-full overflow-hidden bg-muted';

  return (
    <TrackedListingLink
      href={`/listing/${data.id}`}
      listingId={data.id}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card
        size="sm"
        className={cn(
          'group/card-listing gap-0 rounded-xl py-0 shadow-none transition-shadow hover:shadow-md',
          promoRingClass,
          className,
        )}
      >
        <FeedListingHoverThumb
          images={data.images}
          title={data.title}
          apiBase={apiBase}
          thumbClassName={thumbClassName}
          imageClassName="w-full h-full object-cover"
          thumbStyle={thumbStyleProp}
          imageStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
          placeholder={
            <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground/60">
              <Camera size={32} strokeWidth={1.4} aria-hidden />
            </div>
          }
          badges={
            <>
              {/* Промо-бейджи TOP/XL/VIP — ТОЛЬКО в режиме Маркет.
                  В режиме Бартер платное продвижение не предусмотрено и
                  скрывается CSS-правилом `html[data-mode="barter"] [data-promo-badge="true"] { display:none }`. */}
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
              {photoCount > 0 ? (
                <span className="pointer-events-none absolute bottom-1.5 right-1.5 z-[2] flex items-center gap-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                  <Camera size={10} strokeWidth={2} aria-hidden />
                  {photoCount}
                </span>
              ) : null}
              {/* Swap-badge — реф (handoff-bundle/home.html). Показывается
                  только в режиме Бартер: чёрная пилюля внизу-слева превью.
                  Виден через `data-barter-only`, скрытие в Маркете — через
                  CSS-правило `html:not([data-mode="barter"]) [data-barter-only]`. */}
              <span data-barter-only="true" className="swap-badge">
                <ArrowLeftRight size={11} strokeWidth={2} aria-hidden />
                Обмен
              </span>
              <button
                type="button"
                aria-label="В избранное"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="absolute right-2 top-2 z-[2] grid size-7 place-items-center rounded-full bg-background/90 text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
              >
                <Heart size={14} strokeWidth={1.8} aria-hidden />
              </button>
            </>
          }
        />
        <div className="flex flex-col gap-1 px-3 pb-3 pt-2.5">
          <div className="text-[16px] leading-tight font-bold tracking-tight text-foreground">
            {formatRub(data.priceRub, data.priceType)}
          </div>
          <div className="line-clamp-2 text-[13px] leading-snug text-foreground/85">
            {data.title}
          </div>
          <div className="mt-1 truncate text-[12px] text-muted-foreground">
            {data.city}
            {typeof data.distanceKm === 'number' ? ` · ${data.distanceKm} км` : ''}
          </div>
          {/* Бартер-only: «Хочу: …» строка + CTA «Хочу обменять» (реф).
              Скрывается в Маркете тем же data-barter-only фильтром. */}
          <div data-barter-only="true" className="want-line mt-1.5">
            <ArrowLeftRight size={12} strokeWidth={2} aria-hidden />
            <span className="truncate">Хочу: интересный обмен</span>
          </div>
          <button
            type="button"
            data-barter-only="true"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="btn-swap"
          >
            Хочу обменять
          </button>
        </div>
      </Card>
    </TrackedListingLink>
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
