'use client';

import { useEffect } from 'react';
import { apiFetchJson, type AuthMe } from '@/lib/api';
import {
  applyThemePreference,
  getStoredThemePreference,
  reapplyCurrentTheme,
  type ThemePreference,
} from '@/lib/theme';

export function ThemeSync() {
  useEffect(() => {
    // Apply stored local preference first (defaults to LIGHT if none)
    const stored = getStoredThemePreference();
    applyThemePreference(stored ?? 'LIGHT');

    // Only sync from API if user has NO local preference saved yet
    // This prevents the API from overriding the user's explicit local choice
    let cancelled = false;
    if (!stored) {
      (async () => {
        const me = await apiFetchJson<AuthMe>('/auth/me');
        if (cancelled || !me.ok) return;
        const apiTheme = (me.data.appTheme ?? 'LIGHT') as ThemePreference;
        applyThemePreference(apiTheme);
      })();
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onMedia = () => reapplyCurrentTheme();
    media.addEventListener('change', onMedia);

    return () => {
      cancelled = true;
      media.removeEventListener('change', onMedia);
    };
  }, []);

  return null;
}
