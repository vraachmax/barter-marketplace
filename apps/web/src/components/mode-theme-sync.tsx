'use client';

import { useEffect } from 'react';
import { CATALOG_MODE_EVENT, modeFromCookie } from '@/lib/catalog-mode';

type Mode = 'barter' | 'market';

const EVENT = CATALOG_MODE_EVENT;

/**
 * Цвет system-bar (Safari/Chrome top bar).
 *
 * Решение от 2026-04-19: реф-дизайн (handoff-bundle/home.html) делает шапку
 * БЕЛОЙ для обоих режимов — акцент применяется только к мелким элементам.
 * Поэтому status-bar тоже остаётся белым, без режим-зависимого цвета.
 *
 * Если в будущем захочется режим-цветной status-bar — поменять обратно на
 * `barter: '#E85D26', market: '#00AAFF'`.
 */
const COLOR_BY_MODE: Record<Mode, string> = {
  barter: '#FFFFFF',
  market: '#FFFFFF',
};

/**
 * Синхронизирует <html data-mode="..."> и <meta name="theme-color"> с режимом каталога.
 *
 * - При монтировании читает URL и cookie `barter_catalog_mode`.
 * - Проставляет `data-mode` на <html>, чтобы CSS-токены переопределились.
 * - Обновляет (и при необходимости создаёт) <meta name="theme-color">, чтобы
 *   верхний system-status-bar в iOS Safari / Android Chrome окрашивался в цвет режима.
 * - Подписан на событие CatalogModeToggle, меняет цвета без перезагрузки.
 *
 * Пре-пейнт установка (до первого кадра, чтобы не было FOUC) делается
 * инлайновым `<script>` внутри <head> в layout.tsx.
 */
export function ModeThemeSync() {
  useEffect(() => {
    const html = document.documentElement;

    const applyMetaThemeColor = (mode: Mode) => {
      const color = COLOR_BY_MODE[mode];
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
      applyMetaThemeColor(mode);
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

    return () => {
      window.removeEventListener(EVENT, onChange);
    };
  }, []);

  return null;
}
