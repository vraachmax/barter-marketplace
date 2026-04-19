'use client';

import { useEffect, useState } from 'react';

type Mode = 'barter' | 'market';

const STORAGE_KEY = 'barter_mode';
const EVENT = 'barter:mode-change';

const PLACEHOLDER: Record<Mode, string> = {
  barter: 'Что обмениваем?',
  market: 'Что ищем?',
};

/**
 * Поле поиска в мобильной шапке с плейсхолдером, зависящим от режима.
 *
 * - Бартер → «Что обмениваем?»
 * - Маркет → «Что ищем?» (как в Авито)
 *
 * Подписывается на `barter:mode-change` CustomEvent, чтобы текст менялся
 * в ту же секунду, что и цветовая палитра.
 */
export function MobileSearchInput({
  name = 'q',
  defaultValue = '',
  className,
  style,
}: {
  name?: string;
  defaultValue?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  // Default = barter (как у MobileModeToggle). Не влияет на плейсхолдер
  // серверного рендера — placeholder подставится только после монтирования.
  const [mode, setMode] = useState<Mode>('barter');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'barter' || saved === 'market') setMode(saved);
    } catch {
      /* ignore */
    }
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<Mode>).detail;
      if (detail === 'barter' || detail === 'market') setMode(detail);
    };
    window.addEventListener(EVENT, onChange);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const v = event.newValue;
      if (v === 'barter' || v === 'market') setMode(v);
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return (
    <input
      type="text"
      name={name}
      defaultValue={defaultValue}
      placeholder={PLACEHOLDER[mode]}
      className={className}
      style={style}
    />
  );
}
