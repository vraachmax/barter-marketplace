'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { apiFetchJson, type FavoriteItem, type ListingCard } from '@/lib/api';

type ListingDetails = {
  id: string;
  title: string;
  description: string;
  city: string;
  category: { id: string; title: string };
};

type Props = {
  listing: ListingDetails;
  similar: ListingCard[];
};

function isRentalListing(x: ListingDetails) {
  const text = `${x.title} ${x.description} ${x.category.title}`.toLowerCase();
  return (
    text.includes('аренд') ||
    text.includes('сдам') ||
    text.includes('кварт') ||
    text.includes('студи') ||
    text.includes('недвиж')
  );
}

function formatRub(v: number | null) {
  if (v == null) return 'Цена не указана';
  return `${v.toLocaleString('ru-RU')} ₽`;
}

export default function ListingBotAssistant({ listing, similar }: Props) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [favoritesIds, setFavoritesIds] = useState<Set<string>>(new Set());
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [shownCount, setShownCount] = useState(3);

  const enabled = useMemo(
    () => isRentalListing(listing) && similar.length > 0,
    [listing, similar.length],
  );

  const filteredSimilar = useMemo(() => {
    if (!enabled) return [];
    return similar.filter((x) => !viewedIds.has(x.id) && !favoritesIds.has(x.id) && x.id !== listing.id);
  }, [enabled, favoritesIds, listing.id, similar, viewedIds]);

  useEffect(() => {
    try {
      const key = 'barter_viewed_listing_ids';
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      const next = [listing.id, ...parsed.filter((x) => x !== listing.id)].slice(0, 80);
      window.localStorage.setItem(key, JSON.stringify(next));
      setViewedIds(new Set(next));
      document.cookie = `barter_viewed_listing_ids=${encodeURIComponent(next.slice(0, 15).join(','))}; path=/; max-age=15552000; samesite=lax`;
    } catch {
      // ignore localStorage issues
    }
  }, [listing.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fav = await apiFetchJson<FavoriteItem[]>('/favorites');
      if (cancelled || !fav.ok) return;
      setFavoritesIds(new Set(fav.data.map((x) => x.listing.id)));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const key = `barter-bot-hide-${listing.id}`;
    if (window.localStorage.getItem(key) === '1') {
      setDismissed(true);
      return;
    }
    const timer = window.setTimeout(() => {
      setVisible(true);
    }, 1900);
    return () => window.clearTimeout(timer);
  }, [enabled, listing.id]);

  useEffect(() => {
    setShownCount(3);
  }, [listing.id, favoritesIds, viewedIds]);

  function hideForThisListing() {
    const key = `barter-bot-hide-${listing.id}`;
    window.localStorage.setItem(key, '1');
    setDismissed(true);
    setVisible(false);
  }

  if (!enabled || dismissed || !visible || filteredSimilar.length === 0) return null;

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-sky-200/90 bg-gradient-to-br from-sky-50/90 to-cyan-50/60 p-4 text-sm shadow-sm dark:border-sky-900/50 dark:from-sky-950/40 dark:to-cyan-950/20">
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-sm">
          <Sparkles size={18} strokeWidth={1.8} className="text-white" aria-hidden />
        </span>
        <div className="font-bold text-sky-950 dark:text-sky-100">Бот-помощник</div>
      </div>
      <p className="text-sky-900/90 dark:text-sky-200/90">
        Нашёл похожие варианты по цене и параметрам — возможно, подойдут и вам:
      </p>

      <div className="mt-3 space-y-2">
        {filteredSimilar.slice(0, shownCount).map((x) => (
          <div
            key={x.id}
            className="rounded-xl border border-sky-200/70 bg-white/90 p-3 shadow-sm dark:border-sky-900/40 dark:bg-zinc-900/70"
          >
            <Link
              href={`/listing/${x.id}`}
              className="font-bold text-sky-800 hover:underline dark:text-sky-300"
            >
              {x.title}
            </Link>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              {x.city} • {x.category.title}
            </div>
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{formatRub(x.priceRub)}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold">
        {shownCount < filteredSimilar.length ? (
          <button
            type="button"
            onClick={() => setShownCount((p) => Math.min(filteredSimilar.length, p + 5))}
            className="text-sky-700 underline decoration-sky-600/30 underline-offset-2 hover:text-sky-900 dark:text-sky-400 dark:hover:text-sky-300"
          >
            Показать ещё 5 похожих
          </button>
        ) : (
          <Link
            href="/"
            className="text-sky-700 underline decoration-sky-600/30 underline-offset-2 dark:text-sky-400"
          >
            Больше вариантов в ленте
          </Link>
        )}
        <button
          type="button"
          onClick={hideForThisListing}
          className="font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-300"
        >
          Не показывать для этого объявления
        </button>
      </div>
    </div>
  );
}
