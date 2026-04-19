'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { apiFetchJson } from '@/lib/api';

type Props = {
  listingId: string;
};

export default function FavoriteToggle({ listingId }: Props) {
  const [status, setStatus] = useState<'idle' | 'added' | 'error'>('idle');
  const [busy, setBusy] = useState(false);

  async function addToFavorites() {
    setBusy(true);
    const res = await apiFetchJson<{ ok: true }>(`/favorites/${listingId}`, {
      method: 'POST',
    });
    setBusy(false);
    if (!res.ok) {
      setStatus('error');
      return;
    }
    setStatus('added');
  }

  // Hover-цвет был статическим оранжевым (`accent` = #FF6D00) → в Маркете
  // получали оранжевый ободок на синем бренде. Сердечко само остаётся
  // розово-красным (#f5576c) — это сквозной семантический «like»-цвет, его
  // не трогаем. Hover/border привязали к `--mode-accent*`.
  return (
    <div className="mt-1">
      <button
        type="button"
        className="group/fav flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground shadow-sm transition disabled:opacity-60 hover:[border-color:var(--mode-accent-ring)] hover:[background-color:var(--mode-accent-soft)] hover:[color:var(--mode-accent)]"
        onClick={addToFavorites}
        disabled={busy || status === 'added'}
      >
        <Heart
          size={22}
          strokeWidth={1.8}
          color="#f5576c"
          className={status === 'added' ? 'drop-shadow-[0_0_6px_rgba(244,63,94,0.65)]' : 'opacity-90'}
          fill={status === 'added' ? 'currentColor' : 'none'}
          aria-hidden
        />
        {busy ? 'Добавляю…' : status === 'added' ? 'В избранном' : 'Добавить в избранное'}
      </button>
      {status === 'error' ? (
        <div className="mt-2 text-xs font-medium text-destructive">
          Войдите в аккаунт, чтобы добавить в избранное.
        </div>
      ) : null}
    </div>
  );
}
