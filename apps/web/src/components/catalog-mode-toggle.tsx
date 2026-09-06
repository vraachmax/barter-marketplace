'use client';

import Link from 'next/link';
import { useEffect, useSyncExternalStore } from 'react';
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
  useEffect(() => {
    // On static /search hydration the server snapshot is Market. Do not
    // overwrite an existing Barter cookie before the client snapshot is read.
    if (syncPreference) persistCatalogMode(mode);
    else document.documentElement.dataset.mode = mode;
  }, [mode, syncPreference]);
  return <nav aria-label="Маркет или Бартер" className="glass-panel inline-flex w-full max-w-sm gap-1 rounded-full border border-border p-1">
    {(['market', 'barter'] as const).map((value) => {
      const Icon = value === 'market' ? Store : ArrowLeftRight;
      return <Link key={value} href={catalogModeHref(path, values, value)} scroll={false}
        onClick={() => persistCatalogMode(value)} aria-current={mode === value ? 'page' : undefined}
        className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        <Icon size={18} strokeWidth={1.8} aria-hidden />{value === 'market' ? 'Маркет' : 'Бартер'}
      </Link>;
    })}
  </nav>;
}
