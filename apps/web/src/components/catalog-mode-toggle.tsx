'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useOptimistic, useSyncExternalStore, useTransition } from 'react';
import { ArrowLeftRight, Store } from 'lucide-react';
import {
  CATALOG_MODE_COOKIE, CATALOG_MODE_EVENT, catalogModeHref, modeFromCookie,
  parseCatalogMode, type CatalogMode,
} from '@/lib/catalog-mode';

export function persistCatalogMode(mode: CatalogMode) {
  document.cookie = `${CATALOG_MODE_COOKIE}=${mode}; path=/; max-age=15552000; samesite=lax`;
  try { localStorage.setItem(CATALOG_MODE_COOKIE, mode); } catch { /* Cookie still works. */ }
  document.documentElement.dataset.mode = mode;
  window.dispatchEvent(new CustomEvent(CATALOG_MODE_EVENT, { detail: mode }));
}

function subscribe(listener: () => void) {
  window.addEventListener(CATALOG_MODE_EVENT, listener);
  return () => {
    window.removeEventListener(CATALOG_MODE_EVENT, listener);
  };
}

export function useCatalogMode(explicitMode: string | null) {
  return useSyncExternalStore(subscribe,
    () => explicitMode !== null ? parseCatalogMode(explicitMode) : modeFromCookie(document.cookie),
    () => parseCatalogMode(explicitMode));
}

export function CatalogModeToggle({ mode, values, path = '/', syncPreference = true }: {
  mode: CatalogMode;
  values: Record<string, string>;
  path?: '/' | '/search';
  syncPreference?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [displayMode, setDisplayMode] = useOptimistic(mode);
  useEffect(() => {
    // On static /search hydration the server snapshot is Market. Do not
    // overwrite an existing Barter cookie before the client snapshot is read.
    const urlMode = new URLSearchParams(window.location.search).get('mode');
    if (syncPreference || urlMode === mode) persistCatalogMode(mode);
    else document.documentElement.dataset.mode = mode;
  }, [mode, syncPreference]);
  return <nav aria-label="Маркет или Бартер" aria-busy={isPending}
    className="glass-panel relative isolate inline-flex w-full max-w-sm rounded-full border border-border p-1">
    <span aria-hidden data-mode={displayMode}
      className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-4px)] translate-x-0 rounded-full bg-[#006bd6] transition-[translate,background-color] duration-200 ease-out data-[mode=barter]:translate-x-full data-[mode=barter]:bg-[#b84617] motion-reduce:transition-none" />
    {(['market', 'barter'] as const).map((value) => {
      const Icon = value === 'market' ? Store : ArrowLeftRight;
      const href = catalogModeHref(path, values, value);
      return <Link key={value} href={href} scroll={false}
        onNavigate={(event) => {
          event.preventDefault();
          // Modifier/new-tab clicks keep native Link behavior. Do not mutate
          // the page theme or preferences until the route has committed.
          if (value === displayMode) return;
          startTransition(() => {
            setDisplayMode(value);
            router.push(href, { scroll: false });
          });
        }} aria-current={mode === value ? 'page' : undefined}
        data-selected={displayMode === value}
        className="relative z-10 flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-muted-foreground transition-colors duration-200 hover:text-foreground data-[selected=true]:text-white motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        <Icon size={18} strokeWidth={1.8} aria-hidden />{value === 'market' ? 'Маркет' : 'Бартер'}
      </Link>;
    })}
    <span role="status" className="sr-only">{isPending ? 'Загружаем выбранный каталог' : ''}</span>
  </nav>;
}
