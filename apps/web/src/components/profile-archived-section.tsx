'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Archive, Folder, Link2, Package, RefreshCw, Search, Trash2 } from 'lucide-react';
import { API_URL, type MyListing } from '@/lib/api';
import ListingPlaceholder from '@/components/listing-placeholder';

const s = 1.8;

type Props = {
  items: MyListing[];
  onRestore: (id: string) => void;
  onRemove: (id: string) => void;
};

export function ProfileArchivedSection({ items, onRestore, onRemove }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (x) =>
        x.title.toLowerCase().includes(q) ||
        x.city.toLowerCase().includes(q) ||
        x.category.title.toLowerCase().includes(q),
    );
  }, [items, query]);

  if (items.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-accent/30 bg-primary px-6 py-10 text-center md:px-10">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-card shadow-md ring-1 ring-accent/30">
            <Folder size={40} strokeWidth={s} className="text-accent" aria-hidden />
          </div>
          <h2 className="mt-5 text-xl font-bold tracking-tight text-foreground md:text-2xl">Архив пуст</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Сюда попадают объявления, которые вы скрыли из поиска. Их не видят покупатели, пока вы не вернёте их
            в продажу.
          </p>
          <Link
            href="/listings?tab=ACTIVE"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20"
          >
            Мои активные объявления
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border bg-primary px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-card shadow-sm ring-1 ring-accent/30">
              <Archive size={26} strokeWidth={s} className="text-accent" aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground md:text-xl">Архив объявлений</h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Не отображаются в поиске и на главной. Восстановите в один клик или удалите навсегда — по аналогии с
                архивом на Facebook Marketplace и завершёнными лотами на eBay.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border">
                <Package size={14} strokeWidth={s} aria-hidden />
                В архиве: <span className="font-bold text-foreground">{items.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-5">
          <div className="relative max-w-md">
            <span className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-muted-foreground">
              <Search size={16} strokeWidth={s} className="opacity-60" aria-hidden />
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по названию, городу, категории…"
              className="h-11 w-full rounded-xl border border-border bg-muted/50 pl-10 pr-3 text-sm outline-none transition focus:border-accent/30 focus:bg-card focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>
      </div>

      <div className="hidden rounded-t-xl border border-b-0 border-border bg-muted/50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid md:grid-cols-[120px_1fr_140px_200px] md:gap-4 md:px-5">
        <span>Фото</span>
        <span>Объявление</span>
        <span>Дата</span>
        <span className="text-right">Действия</span>
      </div>

      <ul className="space-y-3 md:-mt-3 md:space-y-0 md:rounded-b-xl md:border md:border-t-0 md:border-border md:bg-card">
        {filtered.length === 0 ? (
          <li className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground md:border-0">
            Ничего не найдено. Измените запрос поиска.
          </li>
        ) : null}
        {filtered.map((x) => (
          <li
            key={x.id}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:rounded-none md:border-0 md:border-t md:border-border md:shadow-none"
          >
            <div className="grid gap-4 p-4 md:grid-cols-[120px_1fr_140px_200px] md:items-center md:gap-4 md:px-5 md:py-4">
              <div className="flex gap-4 md:contents">
                <div className="listing-thumb-wrap h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border md:h-[72px] md:w-[120px]">
                  {x.images?.[0]?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`${API_URL}${x.images[0].url}`}
                      alt=""
                      className="listing-thumb-img h-full w-full object-cover"
                    />
                  ) : (
                    <ListingPlaceholder
                      title={x.title}
                      categoryTitle={x.category.title}
                      className="h-full w-full rounded-none border-0"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent ring-1 ring-accent/30">
                    <Folder size={12} strokeWidth={s} aria-hidden />
                    В архиве
                  </div>
                  <Link
                    href={`/listing/${x.id}`}
                    className="line-clamp-2 text-base font-semibold text-foreground hover:text-primary hover:underline"
                  >
                    {x.title}
                  </Link>
                  <div className="mt-1 text-lg font-bold text-foreground">
                    {x.priceRub != null ? `${x.priceRub.toLocaleString('ru-RU')} ₽` : 'Цена не указана'}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {x.city} · {x.category.title}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 md:hidden">
                    <button
                      type="button"
                      onClick={() => onRestore(x.id)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm"
                    >
                      <RefreshCw size={16} strokeWidth={s} aria-hidden />
                      Вернуть
                    </button>
                    <Link
                      href={`/listing/${x.id}`}
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted/50"
                    >
                      <Link2 size={16} strokeWidth={s} aria-hidden />
                      Открыть
                    </Link>
                    <button
                      type="button"
                      onClick={() => onRemove(x.id)}
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 size={16} strokeWidth={s} aria-hidden />
                      Удалить
                    </button>
                  </div>
                </div>

                <div className="hidden text-sm text-muted-foreground md:block">
                  <div className="text-xs text-muted-foreground">Размещено</div>
                  <time dateTime={x.createdAt}>{new Date(x.createdAt).toLocaleDateString('ru-RU')}</time>
                </div>

                <div className="hidden flex-col items-end gap-2 md:flex">
                  <button
                    type="button"
                    onClick={() => onRestore(x.id)}
                    className="inline-flex w-full max-w-[180px] items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm"
                  >
                    <RefreshCw size={16} strokeWidth={s} aria-hidden />
                    Вернуть в продажу
                  </button>
                  <Link
                    href={`/listing/${x.id}`}
                    className="inline-flex w-full max-w-[180px] items-center justify-center gap-1 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted/50"
                  >
                    <Link2 size={16} strokeWidth={s} aria-hidden />
                    Просмотр
                  </Link>
                  <button
                    type="button"
                    onClick={() => onRemove(x.id)}
                    className="inline-flex w-full max-w-[180px] items-center justify-center gap-1 rounded-xl border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 size={16} strokeWidth={s} aria-hidden />
                    Удалить навсегда
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
