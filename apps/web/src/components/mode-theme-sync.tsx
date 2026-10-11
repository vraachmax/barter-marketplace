'use client';

import { THEME_EVENT } from '@/lib/theme';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { CATALOG_MODE_EVENT, modeFromCookie } from '@/lib/catalog-mode';

type Mode = 'barter' | 'market';

const EVENT = CATALOG_MODE_EVENT;

/** Keep catalog, browser chrome and restored home-screen pages in sync. */
export function ModeThemeSync() {
  const pathname = usePathname();

  useEffect(() => {
    const html = document.documentElement;

    const applyMetaThemeColor = () => {
      const color = pathname.startsWith('/games/barter-dash')
        ? '#060914'
        : html.getAttribute('data-theme') === 'dark'
          ? '#141519'
          : '#FFFFFF';
      html.style.colorScheme = html.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      // Основной meta[name="theme-color"]
      let meta = document.querySelector<HTMLMetaElement>(
        'meta[name="theme-color"]:not([media])'
      );
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.appendChild(meta);
      }
      meta.content = color;
    };

    const apply = (mode: Mode) => {
      html.setAttribute('data-mode', mode);
      applyMetaThemeColor();
    };

    // Изначальный режим из URL/cookie, если пре-пейнт скрипт не отработал.
    let initial: Mode = 'market';
    try {
      const saved = new URLSearchParams(window.location.search).get('mode') ?? modeFromCookie(document.cookie);
      if (saved === 'barter' || saved === 'market') {
        initial = saved;
      }
    } catch {
      /* SSR / storage denied — ignore */
    }
    apply(initial);

    // Слушаем смену режима каталога.
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<Mode>).detail;
      if (detail === 'barter' || detail === 'market') {
        apply(detail);
      }
    };
    window.addEventListener(EVENT, onChange);
    const onTheme = () => applyMetaThemeColor();
    const onVisible = () => { if (!document.hidden) onTheme(); };
    window.addEventListener(THEME_EVENT, onTheme);
    window.addEventListener('pageshow', onTheme);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener(THEME_EVENT, onTheme);
      window.removeEventListener('pageshow', onTheme);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [pathname]);

  return null;
}
