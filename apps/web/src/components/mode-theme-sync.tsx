'use client';

import { useEffect } from 'react';

type Mode = 'barter' | 'market';

const STORAGE_KEY = 'barter_mode';
const EVENT = 'barter:mode-change';

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
 * Синхронизирует <html data-mode="..."> и <meta name="theme-color"> с localStorage.
 *
 * - При монтировании читает `barter_mode` из localStorage.
 * - Проставляет `data-mode` на <html>, чтобы CSS-токены переопределились.
 * - Обновляет (и при необходимости создаёт) <meta name="theme-color">, чтобы
 *   верхний system-status-bar в iOS Safari / Android Chrome окрашивался в цвет режима.
 * - Подписан на `barter:mode-change` CustomEvent, который диспатчит
 *   `MobileModeToggle`, — меняет цвета без перезагрузки.
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

    // 1) Изначальный режим из localStorage (на случай, если пре-пейнт скрипт не отработал)
    let initial: Mode = 'barter';
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'barter' || saved === 'market') {
        initial = saved;
      }
    } catch {
      /* SSR / storage denied — ignore */
    }
    apply(initial);

    // 2) Слушаем смену режима из MobileModeToggle
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<Mode>).detail;
      if (detail === 'barter' || detail === 'market') {
        apply(detail);
      }
    };
    window.addEventListener(EVENT, onChange);

    // 3) Синхронизация между вкладками (storage event)
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const v = event.newValue;
      if (v === 'barter' || v === 'market') apply(v);
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return null;
}
