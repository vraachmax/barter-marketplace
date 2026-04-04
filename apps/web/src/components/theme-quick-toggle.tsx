'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { apiFetchJson } from '@/lib/api';
import {
  applyThemePreference,
  getStoredThemePreference,
  type ThemePreference,
} from '@/lib/theme';

export function ThemeQuickToggle() {
  const [theme, setTheme] = useState<ThemePreference>('SYSTEM');
  const [systemDark, setSystemDark] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stored = getStoredThemePreference();
    if (stored) setTheme(stored);
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => setSystemDark(mql.matches);
    sync();
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, []);

  const displayDark = theme === 'DARK' || (theme === 'SYSTEM' && systemDark);

  async function toggleTheme() {
    if (busy) return;
    const next: ThemePreference = displayDark ? 'LIGHT' : 'DARK';
    setTheme(next);
    applyThemePreference(next);
    setBusy(true);
    try {
      await apiFetchJson('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ appTheme: next }),
      });
    } catch {
      // Not logged in — theme still saved locally
    }
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={() => void toggleTheme()}
      disabled={busy}
      className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-colors disabled:opacity-60 ${
        displayDark
          ? 'border-sky-600 bg-sky-600'
          : 'border-zinc-300 bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-800'
      }`}
      title="Сменить тему"
      aria-label={displayDark ? 'Включена тёмная тема' : 'Включена светлая тема'}
      aria-pressed={displayDark}
    >
      <span
        className={`absolute inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-zinc-700 shadow-sm transition-transform dark:bg-zinc-100 ${
          displayDark ? 'translate-x-6' : 'translate-x-1'
        }`}
      >
        {displayDark ? <Moon size={14} strokeWidth={1.8} aria-hidden /> : <Sun size={14} strokeWidth={1.8} aria-hidden />}
      </span>
    </button>
  );
}
