'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ChevronLeft, Globe } from 'lucide-react';

const ListingsMap = dynamic(() => import('@/components/listings-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-zinc-100 dark:bg-zinc-900">
      <div className="text-sm text-zinc-500">Загрузка карты…</div>
    </div>
  ),
});

export function MapPageClient() {
  return (
    <div className="flex h-screen flex-col bg-zinc-100 dark:bg-zinc-950">
      <header className="z-50 flex shrink-0 items-center gap-3 border-b border-zinc-200/90 bg-white/95 px-4 py-2.5 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200/90 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-sky-600"
        >
          <ChevronLeft size={20} strokeWidth={1.8} aria-hidden />
          Лента
        </Link>
        <div className="flex items-center gap-2">
          <Globe size={22} strokeWidth={1.8} className="text-sky-600 dark:text-sky-400" aria-hidden />
          <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Карта объявлений</h1>
        </div>
      </header>
      <div className="relative min-h-0 flex-1">
        <ListingsMap />
      </div>
    </div>
  );
}
