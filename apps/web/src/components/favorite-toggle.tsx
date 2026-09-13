'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import { apiFetchJson, type FavoriteItem } from '@/lib/api';
import { listingLoginHref } from '@/lib/listing-presentation';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';

export default function FavoriteToggle({ listingId }: { listingId: string }) {
  const { user, ready } = useAuth();
  if (!ready) return <Button variant="secondary" size="lg" className="w-full" disabled>Избранное</Button>;
  if (!user) return <Button render={<Link href={listingLoginHref(listingId)} />} variant="secondary" size="lg" className="w-full"><Heart size={20} aria-hidden />В избранное</Button>;
  return <FavoriteControl key={`${user.id}:${listingId}`} listingId={listingId} />;
}

function FavoriteControl({ listingId }: { listingId: string }) {
  const [saved, setSaved] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const lock = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    void apiFetchJson<FavoriteItem[]>('/favorites', { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) }).then((result) => {
      if (controller.signal.aborted) return;
      if (result.ok) {
        setSaved(result.data.some((item) => item.listing.id === listingId));
        setError(false);
      } else {
        setError(true);
        setUnauthorized(result.status === 401);
      }
    });
    return () => controller.abort();
  }, [listingId, attempt]);

  async function toggle() {
    if (lock.current || saved === null) return;
    lock.current = true;
    setBusy(true);
    setError(false);
    try {
      const result = await apiFetchJson(`/favorites/${listingId}`, { method: saved ? 'DELETE' : 'POST', signal: AbortSignal.timeout(15000) });
      if (result.ok) setSaved(!saved);
      else { setError(true); setUnauthorized(result.status === 401); }
    } finally { lock.current = false; setBusy(false); }
  }
  if (unauthorized) return <Button variant="secondary" size="lg" className="w-full" render={<Link href={listingLoginHref(listingId)} />}>Войти для сохранения</Button>;
  return (
    <div className="space-y-2">
      <Button variant="secondary" size="lg" className="w-full" aria-pressed={saved ?? undefined} aria-busy={busy || (saved === null && !error)} disabled={busy || (saved === null && !error)} onClick={() => { if (saved === null) { setError(false); setAttempt((n) => n + 1); } else void toggle(); }}>
        <Heart size={20} fill={saved ? 'currentColor' : 'none'} aria-hidden />
        {saved === null ? error ? 'Повторить загрузку' : 'Проверяем избранное…' : busy ? 'Сохраняем…' : saved ? 'Убрать из избранного' : 'В избранное'}
      </Button>
      {error ? <p role="alert" className="text-sm text-destructive">{saved === null ? 'Не удалось проверить избранное.' : 'Изменение не сохранено. Попробуйте ещё раз.'}</p> : null}
    </div>
  );
}
