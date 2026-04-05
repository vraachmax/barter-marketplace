'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Heart, Home } from 'lucide-react';
import { API_URL, apiFetchJson, type FavoriteItem } from '@/lib/api';
import ListingPlaceholder from '@/components/listing-placeholder';

function formatRub(v: number | null) {
  if (v == null) return 'Цена не указана';
  return `${v.toLocaleString('ru-RU')} ₽`;
}

export default function FavoritesPage() {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await apiFetchJson<FavoriteItem[]>('/favorites');
    setLoading(false);
    if (!res.ok) {
      if (res.status === 401) {
        setError('Нужно войти в аккаунт. Откройте страницу входа.');
        return;
      }
      setError(res.message);
      return;
    }
    setItems(res.data);
  }

  async function remove(listingId: string) {
    const res = await apiFetchJson<{ ok: true }>(`/favorites/${listingId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setItems((prev) => prev.filter((x) => x.listing.id !== listingId));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-100 px-4 py-8 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100 md:py-10">
      <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-xl shadow-zinc-300/25 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/40">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/80 bg-gradient-to-r from-sky-50 via-white to-cyan-50/90 px-5 py-4 dark:border-zinc-800 dark:from-sky-950/40 dark:via-zinc-900 dark:to-cyan-950/25">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 shadow-md shadow-rose-500/25">
              <Heart size={22} strokeWidth={1.8} className="text-white" aria-hidden />
            </span>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">Избранное</h1>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Сохранённые объявления</p>
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200/90 bg-white/80 px-3 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-200 dark:hover:border-sky-600 dark:hover:bg-sky-950/50"
          >
            <Home size={20} strokeWidth={1.8} className="text-zinc-600 dark:text-zinc-300" aria-hidden />
            На главную
          </Link>
        </div>

        <div className="p-5 md:p-6">
          {loading ? (
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Загрузка…</div>
          ) : null}
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              {error}{' '}
              <Link href="/auth" className="font-semibold text-sky-700 underline dark:text-sky-400">
                Войти
              </Link>
            </div>
          ) : null}

          {!loading && !error && items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/90 px-4 py-4 text-sm leading-relaxed text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400">
              Пока пусто. Откройте объявление и нажмите «Добавить в избранное».
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            {items.map((x) => (
              <div
                key={x.id}
                className="rounded-2xl border border-zinc-200/90 bg-white p-3 shadow-sm transition hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:shadow-black/20"
              >
                <div className="flex gap-3">
                  {x.listing.images?.[0]?.url ? (
                    <div className="listing-thumb-wrap h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-zinc-200/80 dark:border-zinc-700">
                      <img
                        src={`${API_URL}${x.listing.images[0].url}`}
                        alt={x.listing.title}
                        className="listing-thumb-img h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <ListingPlaceholder
                      title={x.listing.title}
                      categoryTitle={x.listing.category.title}
                      className="h-20 w-28 shrink-0 rounded-xl border border-zinc-200/80 dark:border-zinc-700"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      className="font-bold text-zinc-900 hover:text-sky-700 hover:underline dark:text-zinc-100 dark:hover:text-sky-400"
                      href={`/listing/${x.listing.id}`}
                    >
                      {x.listing.title}
                    </Link>
                    <div className="mt-1 text-sm font-bold text-sky-700 dark:text-sky-400">{formatRub(x.listing.priceRub)}</div>
                    <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      {x.listing.city} • {x.listing.category.title}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(x.listing.id)}
                  className="mt-3 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Убрать из избранного
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
