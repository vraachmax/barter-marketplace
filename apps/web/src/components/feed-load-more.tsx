'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import type { ListingCard } from '@/lib/api';

type Props = {
  initialPage: number;
  total: number;
  limit: number;
  basePath: string;
  apiBase: string;
};

const PRICE_TYPE_SUFFIX: Record<string, string> = {
  per_day: 'за сутки',
  per_hour: 'в час',
  per_service: 'за услугу',
  per_sqm: 'за м²',
  per_month: 'в месяц',
  per_shift: 'за смену',
};

function formatPrice(v: number | null, priceType?: string | null) {
  if (v == null) return 'Цена не указана';
  const base = `${v.toLocaleString('ru-RU')} ₽`;
  const suffix = priceType ? PRICE_TYPE_SUFFIX[priceType] : undefined;
  return suffix ? `${base} ${suffix}` : base;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин. назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ч. назад`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} дн. назад`;
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function resolveImg(url: string, apiBase: string) {
  if (url.startsWith('http')) return url;
  return `${apiBase}${url}`;
}

export function FeedLoadMore({ initialPage, total, limit, basePath, apiBase }: Props) {
  const [extra, setExtra] = useState<ListingCard[]>([]);
  const [page, setPage] = useState(initialPage);
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(initialPage * limit >= total);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(() => {
    if (isPending || done) return;
    const nextPage = page + 1;
    startTransition(async () => {
      try {
        const sep = basePath.includes('?') ? '&' : '?';
        const res = await fetch(`${basePath}${sep}page=${nextPage}`);
        if (!res.ok) { setDone(true); return; }
        const data = await res.json();
        const items: ListingCard[] = data.items ?? [];
        if (items.length === 0) { setDone(true); return; }
        setExtra((prev) => [...prev, ...items]);
        setPage(nextPage);
        if (nextPage * limit >= (data.total ?? total)) setDone(true);
      } catch {
        setDone(true);
      }
    });
  }, [isPending, done, page, basePath, limit, total, startTransition]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || done) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMore(); },
      { rootMargin: '600px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [done, loadMore]);

  return (
    <>
      {extra.map((x) => (
        <Link
          key={x.id}
          href={`/listing/${x.id}`}
          className="group flex gap-2.5 rounded-2xl border border-zinc-200/90 bg-white p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-20px_rgba(15,23,42,0.18)] dark:border-zinc-800/90 dark:bg-zinc-950 dark:shadow-[0_1px_2px_rgba(0,0,0,0.35)] dark:hover:border-zinc-600 md:gap-3 md:p-3.5"
        >
          <div className="listing-thumb-wrap relative h-[5.5rem] w-28 flex-none overflow-hidden rounded-xl border border-zinc-200/90 dark:border-zinc-700 md:h-24 md:w-32">
            {x.images && x.images.length > 0 ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveImg(x.images[0].url, apiBase)}
                  alt={x.title}
                  className="listing-thumb-img h-full w-full object-cover"
                  loading="lazy"
                />
                {x.images.length > 2 ? (
                  <span className="pointer-events-none absolute right-1.5 top-1.5 z-[3] rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white backdrop-blur-sm">
                    {x.images.length} фото
                  </span>
                ) : null}
              </>
            ) : (
              <div className="listing-placeholder-surface flex h-full w-full items-center justify-center text-[10px] font-semibold opacity-60">
                Нет фото
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="line-clamp-2 text-[14px] font-semibold leading-snug tracking-tight text-zinc-900 group-hover:text-sky-700 group-hover:underline dark:text-zinc-100 dark:group-hover:text-sky-400 md:text-[15px]">
              {x.title}
            </div>
            <div className="mt-1.5 text-base font-bold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50 md:text-lg">
              {formatPrice(x.priceRub, x.priceType)}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <span>{x.city}</span>
              <span className="text-zinc-300 dark:text-zinc-600">·</span>
              <span>{x.category.title}</span>
              <span className="text-zinc-300 dark:text-zinc-600">·</span>
              <span className="text-zinc-400 dark:text-zinc-500">{timeAgo(x.createdAt)}</span>
            </div>
          </div>
        </Link>
      ))}
      {!done ? (
        <div ref={sentinelRef} className="col-span-full flex justify-center py-6">
          {isPending ? (
            <span
              className="inline-block size-6 animate-spin rounded-full border-2 border-sky-500 border-t-transparent"
            />
          ) : null}
        </div>
      ) : null}
    </>
  );
}