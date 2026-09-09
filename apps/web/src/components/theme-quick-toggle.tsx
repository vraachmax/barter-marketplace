'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { apiFetchJson } from '@/lib/api';
import { applyThemePreference, subscribeTheme, type ThemePreference } from '@/lib/theme';

// Serialize account writes so rapid taps cannot persist responses out of order.
let pendingSave: Promise<unknown> = Promise.resolve();
export function ThemeQuickToggle() {
  const displayDark = useSyncExternalStore(subscribeTheme,
    () => document.documentElement.getAttribute('data-theme') === 'dark', () => false);

  function toggleTheme() {
    const next: ThemePreference = document.documentElement.getAttribute('data-theme') === 'dark' ? 'LIGHT' : 'DARK';
    applyThemePreference(next);
    pendingSave = pendingSave.catch(() => undefined).then(() => apiFetchJson('/auth/me', {
      method: 'PATCH', body: JSON.stringify({ appTheme: next }), signal: AbortSignal.timeout(8000),
    }));
  }

  return <button type="button" role="switch" aria-checked={displayDark} aria-label="Тёмная тема"
    onClick={toggleTheme} className="inline-flex min-h-11 min-w-14 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary">
    <span aria-hidden className={`relative inline-flex h-8 w-14 items-center rounded-full border transition-colors ${displayDark ? 'border-primary bg-primary' : 'border-border bg-muted'}`}>
      <span className={`absolute left-0.5 grid size-7 place-items-center rounded-full bg-white text-slate-700 shadow-sm transition-transform motion-reduce:transition-none ${displayDark ? 'translate-x-6' : ''}`}>
        {displayDark ? <Moon size={16} /> : <Sun size={16} />}
      </span>
    </span>
  </button>;
}
