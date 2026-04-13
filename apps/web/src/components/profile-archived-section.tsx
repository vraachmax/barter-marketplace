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
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-black/30">
        <div className="border-b border-violet-100 bg-gradient-to-r from-violet-50 via-slate-50 to-sky-50 px-6 py-10 text-center dark:border-violet-900/40 dark:from-violet-950/40 dark:via-zinc-900 dark:to-sky-950/30 md:px-10">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-white shadow-md ring-1 ring-violet-100 dark:bg-zinc-900 dark:ring-violet-900/40">
            <Folder size={40} strokeWidth={s} className="text-violet-600 dark:text-violet-400" aria-hidden />
          </div>
          <h2 className="mt-5 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 md:text-2xl">Архив пуст</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
            Сюда попадают объявления, которые вы скрыли из поиска. Их не видят покупатели, пока вы не вернёте их
            в продажу.
          </p>
          <Link
            href="/listings?tab=ACTIVE"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-600/20 hover:from-sky-700 hover:to-cyan-700"
          >
            Мои активные объявления
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-black/30">
        <div className="flex flex-col gap-4 border-b border-zinc-100 bg-gradient-to-r from-slate-50 via-violet-50/40 to-sky-50/60 px-5 py-5 dark:border-zinc-800 dark:from-zinc-900 dark:via-violet-950/30 dark:to-sky-950/20 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white shadow-sm ring-1 ring-violet-100 dark:bg-zinc-900 dark:ring-violet-900/40">
              <Archive size={26} strokeWidth={s} className="text-violet-600 dark:text-violet-400" aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 md:text-xl">Архив объявлений</h2>
              <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
                Не отображаются в поиске и на главной. Восстановите в один клик или удалите навсегда — по аналогии с
                архивом на Facebook Marketplace и завершёнными лотами на eBay.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200/80 dark:bg-zinc-800/80 dark:text-zinc-300 dark:ring-zinc-700">
                <Package size={14} strokeWidth={s} aria-hidden />
                В архиве: <span className="font-bold text-zinc-900 dark:text-zinc-100">{items.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-5">
          <div className="relative max-w-md">
            <span className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-zinc-400">
              <Search size={16} strokeWidth={s} className="opacity-60" aria-hidden />
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по названию, городу, категории…"
              className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-3 text-sm outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-500/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-violet-500 dark:focus:bg-zinc-900"
            />
          </div>
        </div>
      </div>

      <div className="hidden rounded-t-xl border border-b-0 border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 md:grid md:grid-cols-[120px_1fr_140px_200px] md:gap-4 md:px-5">
        <span>Фото</span>
        <span>Объявление</span>
        <span>Дата</span>
        <span className="text-right">Действия</span>
      </div>

      <ul className="space-y-3 md:-mt-3 md:space-y-0 md:rounded-b-xl md:border md:border-t-0 md:border-zinc-200 md:bg-white dark:md:border-zinc-800 dark:md:bg-zinc-900">
        {filtered.length === 0 ? (
          <li className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 md:border-0">
            Ничего не найдено. Измените запрос поиска.
          </li>
        ) : null}
        {filtered.map((x) => (
          <li
            key={x.id}
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 md:rounded-none md:border-0 md:border-t md:border-zinc-100 dark:md:border-zinc-800 md:shadow-none"
          >
            <div className="grid gap-4 p-4 md:grid-cols-[120px_1fr_140px_200px] md:items-center md:gap-4 md:px-5 md:py-4">
              <div className="flex gap-4 md:contents">
                <div className="listing-thumb-wrap h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700 md:h-[72px] md:w-[120px]">
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
                  <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-900/50">
                    <Folder size={12} strokeWidth={s} aria-hidden />
                    В архиве
                  </div>
                  <Link
                    href={`/listing/${x.id}`}
                    className="line-clamp-2 text-base font-semibold text-zinc-900 hover:text-sky-700 hover:underline dark:text-zinc-100 dark:hover:text-sky-400"
                  >
                    {x.title}
                  </Link>
                  <div className="mt-1 text-lg font-bold text-zinc-800 dark:text-zinc-200">
                    {x.priceRub != null ? `${x.priceRub.toLocaleString('ru-RU')} ₽` : 'Цена не указана'}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {x.city} · {x.category.title}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 md:hidden">
                    <button
                      type="button"
                      onClick={() => onRestore(x.id)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:from-sky-700 hover:to-cyan-700"
                    >
                      <RefreshCw size={16} strokeWidth={s} aria-hidden />
                      Вернуть
                    </button>
                    <Link
                      href={`/listing/${x.id}`}
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <Link2 size={16} strokeWidth={s} aria-hidden />
                      Открыть
                    </Link>
                    <button
                      type="button"
                      onClick={() => onRemove(x.id)}
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={16} strokeWidth={s} aria-hidden />
                      Удалить
                    </button>
                  </div>
                </div>

                <div className="hidden text-sm text-zinc-600 dark:text-zinc-400 md:block">
                  <div className="text-xs text-zinc-400 dark:text-zinc-500">Размещено</div>
                  <time dateTime={x.createdAt}>{new Date(x.createdAt).toLocaleDateString('ru-RU')}</time>
                </div>

                <div className="hidden flex-col items-end gap-2 md:flex">
                  <button
                    type="button"
                    onClick={() => onRestore(x.id)}
                    className="inline-flex w-full max-w-[180px] items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:from-sky-700 hover:to-cyan-700"
                  >
                    <RefreshCw size={16} strokeWidth={s} aria-hidden />
                    Вернуть в продажу
                  </button>
                  <Link
                    href={`/listing/${x.id}`}
                    className="inline-flex w-full max-w-[180px] items-center justify-center gap-1 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <Link2 size={16} strokeWidth={s} aria-hidden />
                    Просмотр
                  </Link>
                  <button
                    type="button"
                    onClick={() => onRemove(x.id)}
                    className="inline-flex w-full max-w-[180px] items-center justify-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
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
