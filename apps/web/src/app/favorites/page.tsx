'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Heart, Home, Trash2 } from 'lucide-react';
import { API_URL, apiFetchJson, type FavoriteItem } from '@/lib/api';
import { ListingCardComponent, ListingCardSkeleton } from '@/components/listing-card';

/**
 * /favorites — мобильная 2-col сетка, повторяющая геометрию ленты.
 *
 * До Hotfix #9 страница была единой «custom» карточкой со списком объявлений
 * в виде горизонтальных строк (эскиз 80×112 + заголовок). На мобильном это
 * выглядело «вычурно» (Максим: «лента избранного выглядит как-то странно»).
 *
 * Теперь:
 *  — На мобильном: 2 колонки × N рядов, точно как `MarketExampleCluster`
 *    и лента главной. Используем тот же `ListingCardComponent` → полный
 *    паритет по тени/радиусу/типографике.
 *  — На десктопе: 3 колонки (ширина до 1200px, отступ 16px).
 *  — Заголовок шапки мигрирует на `--mode-accent*` (сердце = brand-accent
 *    режима), чтобы не было палитра-лика.
 *  — Для каждого объявления есть кнопка «Удалить» (Trash2 icon). Она
 *    парит поверх превью в правом нижнем углу, чтобы не перекрывать
 *    промо-бейдж TOP/XL и не спорить с сердечком в правом верхнем.
 */
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
    <div className="min-h-screen bg-muted text-foreground antialiased">
      {/* Шапка — на мобильном прилипает сверху, мягкий mode-accent акцент
          через сердечко, без широкой плашки `bg-primary via-white` как было. */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span
              className="grid h-9 w-9 place-items-center rounded-2xl text-white shadow-sm"
              style={{
                backgroundColor: 'var(--mode-accent)',
                boxShadow: '0 4px 12px var(--mode-accent-ring)',
              }}
            >
              <Heart size={18} strokeWidth={1.8} aria-hidden />
            </span>
            <div>
              <h1 className="text-[17px] font-bold tracking-tight text-foreground md:text-xl">
                Избранное
              </h1>
              <p className="text-[11px] font-medium text-muted-foreground">
                {items.length > 0
                  ? `${items.length} ${pluralizeListings(items.length)}`
                  : 'Сохранённые объявления'}
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:border-[color:var(--mode-accent-ring)] hover:[color:var(--mode-accent)]"
          >
            <Home size={18} strokeWidth={1.8} aria-hidden />
            <span className="hidden sm:inline">На главную</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 pt-3 pb-28 md:px-4 md:pb-12">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <ListingCardSkeleton key={i} thumbHeight={160} />
            ))}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}{' '}
            <Link
              href="/auth"
              className="font-semibold underline"
              style={{ color: 'var(--mode-accent)' }}
            >
              Войти
            </Link>
          </div>
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <div
            className="mt-6 rounded-2xl border border-dashed p-8 text-center"
            style={{
              borderColor: 'var(--mode-accent-ring)',
              backgroundColor: 'var(--mode-accent-soft)',
            }}
          >
            <div
              className="mx-auto grid h-14 w-14 place-items-center rounded-full text-white"
              style={{ backgroundColor: 'var(--mode-accent)' }}
            >
              <Heart size={28} strokeWidth={1.8} aria-hidden />
            </div>
            <p className="mt-3 text-base font-bold text-foreground">Пока пусто</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Откройте объявление и нажмите «Добавить в избранное», чтобы оно появилось здесь.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white transition"
              style={{
                backgroundColor: 'var(--mode-accent)',
                boxShadow: '0 4px 12px var(--mode-accent-ring)',
              }}
            >
              Посмотреть ленту
            </Link>
          </div>
        ) : null}

        {items.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {items.map((x) => (
              <div key={x.id} className="relative">
                <ListingCardComponent data={x.listing} apiBase={API_URL} thumbHeight={160} />
                {/* Кнопка «Удалить из избранного». Позиционируем в правом
                    верхнем углу контейнера (over-overlay heart-icon, который
                    внутри ListingCardComponent вообще не wired-up на действие).
                    Используем mode-accent как нейтральный фон; на hover —
                    destructive (красный), чтобы сигнализировать удаление. */}
                <button
                  type="button"
                  aria-label="Удалить из избранного"
                  onClick={() => void remove(x.listing.id)}
                  className="absolute right-2 top-2 z-[3] grid size-8 place-items-center rounded-full bg-background/95 text-foreground shadow-sm backdrop-blur transition hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 size={14} strokeWidth={1.8} aria-hidden />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </main>
    </div>
  );
}

function pluralizeListings(n: number): string {
  const abs = Math.abs(n) % 100;
  const n1 = abs % 10;
  if (abs > 10 && abs < 20) return 'объявлений';
  if (n1 > 1 && n1 < 5) return 'объявления';
  if (n1 === 1) return 'объявление';
  return 'объявлений';
}
