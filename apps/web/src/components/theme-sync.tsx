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
    const stored = getStoredThemePreference();
    applyThemePreference(stored ?? 'LIGHT');

    let cancelled = false;
    (async () => {
      const me = await apiFetchJson<AuthMe>('/auth/me');
      if (cancelled || !me.ok) return;
      applyThemePreference((me.data.appTheme ?? 'SYSTEM') as ThemePreference);
    })();

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

