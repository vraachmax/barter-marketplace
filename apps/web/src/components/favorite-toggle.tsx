'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import { apiFetchJson } from '@/lib/api';
import { Button } from '@/components/ui/button';

type Props = {
  listingId: string;
};

export default function FavoriteToggle({ listingId }: Props) {
  const [status, setStatus] = useState<'idle' | 'added' | 'error' | 'unauthorized'>('idle');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  async function addToFavorites() {
    if (inFlight.current || status === 'added') return;
    inFlight.current = true;
    setBusy(true);
    setStatus('idle');
    const res = await apiFetchJson<{ ok: true }>(`/favorites/${listingId}`, {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
    });
    inFlight.current = false;
    setBusy(false);
    if (!res.ok) {
      setStatus(res.status === 401 ? 'unauthorized' : 'error');
      return;
    }
    setStatus('added');
  }

  return (
    <div className="mt-1">
      <Button variant="secondary" size="lg"
        type="button"
        className="w-full"
        aria-busy={busy}
        onClick={addToFavorites}
        disabled={busy || status === 'added'}
      >
        <Heart
          size={22}
          strokeWidth={1.8}
          className={status === 'added' ? 'text-primary' : 'text-muted-foreground'}
          fill={status === 'added' ? 'currentColor' : 'none'}
          aria-hidden
        />
        {busy ? 'Добавляю…' : status === 'added' ? 'В избранном' : 'Добавить в избранное'}
      </Button>
      {status === 'error' || status === 'unauthorized' ? (
        <div role="alert" className="mt-2 text-sm text-destructive">
          {status === 'unauthorized' ? <Link className="inline-flex min-h-11 items-center underline" href={`/auth?next=${encodeURIComponent(`/listing/${listingId}`)}`}>Войдите, чтобы сохранить объявление</Link> : 'Не удалось сохранить. Попробуйте ещё раз.'}
        </div>
      ) : null}
    </div>
  );
}
