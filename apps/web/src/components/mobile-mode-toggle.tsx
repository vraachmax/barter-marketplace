'use client';

import { useEffect, useState } from 'react';
import { ArrowLeftRight, Store } from 'lucide-react';

type Mode = 'barter' | 'market';

const STORAGE_KEY = 'barter_mode';
const EVENT = 'barter:mode-change';

/**
 * Mobile-only pill toggle Бартер/Маркет.
 *
 * UI-стаб до Phase 13 — сохраняет выбор в localStorage и диспатчит
 * `barter:mode-change` CustomEvent, чтобы подписчики (hero, лента)
 * переключали оформление. Фильтрация бэкенда по isBarter появится
 * после `listing.isBarter`-миграции в Phase 13.
 */
export function MobileModeToggle({ className }: { className?: string }) {
  const [mode, setMode] = useState<Mode>('barter');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'barter' || saved === 'market') setMode(saved);
    } catch {
      /* SSR / storage denied — ignore */
    }
  }, []);

  const pick = (next: Mode) => {
    setMode(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    try {
      // 1) Ставим data-mode на <html>, чтобы CSS-переменные переопределились.
      //    ModeThemeSync также слушает CustomEvent, но прямое выставление
      //    гарантирует мгновенную реакцию на клик без моргания.
      document.documentElement.setAttribute('data-mode', next);
      // 2) Дополнительно сохраняем на body для совместимости с existing selectors,
      //    если кто-то ещё пишет `body[data-mode="..."]`.
      document.body.setAttribute('data-mode', next);
      // 3) Диспатчим событие — ModeThemeSync обновит <meta name="theme-color">.
      window.dispatchEvent(new CustomEvent<Mode>(EVENT, { detail: next }));
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Режим каталога"
      className={`inline-flex items-center gap-0.5 rounded-full bg-muted p-[3px] ${className ?? ''}`}
    >
      <button
        role="tab"
        aria-selected={mode === 'barter'}
        onClick={() => pick('barter')}
        className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition ${
          mode === 'barter'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground'
        }`}
      >
        <ArrowLeftRight size={14} strokeWidth={2} aria-hidden />
        Бартер
      </button>
      <button
        role="tab"
        aria-selected={mode === 'market'}
        onClick={() => pick('market')}
        className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition ${
          mode === 'market'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground'
        }`}
      >
        <Store size={14} strokeWidth={2} aria-hidden />
        Маркет
      </button>
    </div>
  );
}
