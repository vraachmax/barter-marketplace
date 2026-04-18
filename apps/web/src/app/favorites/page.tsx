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
    <div className="min-h-screen bg-muted px-4 py-8 text-foreground antialiased md:py-10">
      <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-primary via-white px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary shadow-md">
              <Heart size={22} strokeWidth={1.8} className="text-white" aria-hidden />
            </span>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground md:text-xl">Избранное</h1>
              <p className="text-xs font-medium text-muted-foreground">Сохранённые объявления</p>
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/80 px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
          >
            <Home size={20} strokeWidth={1.8} className="text-muted-foreground" aria-hidden />
            На главную
          </Link>
        </div>

        <div className="p-5 md:p-6">
          {loading ? (
            <div className="text-sm text-muted-foreground">Загрузка…</div>
          ) : null}
          {error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}{' '}
              <Link href="/auth" className="font-semibold text-primary underline">
                Войти
              </Link>
            </div>
          ) : null}

          {!loading && !error && items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/50 px-4 py-4 text-sm leading-relaxed text-muted-foreground">
              Пока пусто. Откройте объявление и нажмите «Добавить в избранное».
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            {items.map((x) => (
              <div
                key={x.id}
                className="rounded-2xl border border-border bg-card p-3 shadow-sm transition hover:shadow-md"
              >
                <div className="flex gap-3">
                  {x.listing.images?.[0]?.url ? (
                    <div className="listing-thumb-wrap h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-border">
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
                      className="h-20 w-28 shrink-0 rounded-xl border border-border"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      className="font-bold text-foreground hover:text-primary hover:underline"
                      href={`/listing/${x.listing.id}`}
                    >
                      {x.listing.title}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
               