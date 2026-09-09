'use client';

import { useEffect } from 'react';
import { apiFetchJson, type AuthMe } from '@/lib/api';
import { applyThemePreference, getStoredThemePreference, reapplyCurrentTheme } from '@/lib/theme';

export function ThemeSync() {
  useEffect(() => {
    const stored = getStoredThemePreference();
    applyThemePreference(stored ?? 'LIGHT', false);
    let cancelled = false;
    if (!stored) {
      void apiFetchJson<AuthMe>('/auth/me', { signal: AbortSignal.timeout(10000) }).then((me) => {
        // A late account response must never undo a choice made while loading.
        if (cancelled || !me.ok || getStoredThemePreference()) return;
        applyThemePreference(me.data.appTheme ?? 'LIGHT', false);
      });
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onMedia = () => reapplyCurrentTheme();
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'barter_theme_pref') applyThemePreference(getStoredThemePreference() ?? 'LIGHT', false);
    };
    media.addEventListener('change', onMedia);
    window.addEventListener('storage', onStorage);
    return () => {
      cancelled = true;
      media.removeEventListener('change', onMedia);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return null;
}
