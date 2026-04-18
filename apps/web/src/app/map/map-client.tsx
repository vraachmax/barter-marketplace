'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ChevronLeft, Globe } from 'lucide-react';

const ListingsMap = dynamic(() => import('@/components/listings-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-muted">
      <div className="text-sm text-muted-foreground">Загрузка карты…</div>
    </div>
  ),
});

export function MapPageClient() {
  return (
    <div className="flex h-screen flex-col bg-muted">
      <header className="z-50 flex shrink-0 items-center gap-3 border-b border-border bg-card/95 px-4 py-2.5 backdrop-blur-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/30 hover:bg-primary/10"
        >
          <ChevronLeft size={20} strokeWidth={1.8} aria-hidden />
          Лента
        </Link>
        <div className="flex items-center gap-2">
          <Globe size={22} strokeWidth={1.8} className="text-primary" aria-hidden />
          <h1 className="text-base font-bold text-foreground">Карта объявлений</h1>
        </div>
      </header>
      <div className="relative min-h-0 flex-1">
        <ListingsMap />
      </div>
    </div>
  );
}
