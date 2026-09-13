'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { apiFetchJson, type ReviewEligibility } from '@/lib/api';
import { listingLoginHref } from '@/lib/listing-presentation';

export default function SellerReviewForm({ sellerId, listingId }: { sellerId: string; listingId: string }) {
  const { user, ready } = useAuth();
  if (!ready) return <p role="status" className="pt-3 text-sm text-muted-foreground">Проверяем вход…</p>;
  if (!user) return <div className="space-y-3 pt-3"><p className="text-sm leading-6 text-muted-foreground">Отзыв доступен после переписки с продавцом. Войдите, чтобы проверить возможность его оставить.</p><Button render={<Link href={listingLoginHref(listingId)} />} variant="secondary">Войти</Button></div>;
  return <ReviewEditor key={`${user.id}:${listingId}`} sellerId={sellerId} listingId={listingId} />;
}

function ReviewEditor({ sellerId, listingId }: { sellerId: string; listingId: string }) {
  const [elig, setElig] = useState<ReviewEligibility | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [rating, setRating] = useState('5');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const lock = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    void apiFetchJson<ReviewEligibility>(`/reviews/listing/${listingId}/eligibility`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) }).then((result) => {
      if (controller.signal.aborted) return;
      if (result.ok) { setElig(result.data); setLoadError(false); }
      else setLoadError(true);
    });
    return () => controller.abort();
  }, [listingId, attempt]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current || !elig?.canReview) return;
    lock.current = true;
    setBusy(true);
    setStatus('idle');
    try {
      const result = await apiFetchJson(`/reviews/seller/${sellerId}`, {
        method: 'POST',
        body: JSON.stringify({ listingId, rating: Number(rating), text: text.trim() || undefined }),
        signal: AbortSignal.timeout(15000),
      });
      if (result.ok) {
        setStatus('ok');
        setElig({ canReview: false, reason: 'already_reviewed', sellerId, hasExistingReview: true });
      } else setStatus('error');
    } finally { lock.current = false; setBusy(false); }
  }
  if (loadError) return <div className="space-y-3 pt-3"><p role="alert" className="text-sm text-muted-foreground">Не удалось проверить возможность оставить отзыв.</p><Button variant="secondary" onClick={() => { setLoadError(false); setAttempt((n) => n + 1); }}>Повторить</Button></div>;
  if (!elig) return <p role="status" className="pt-3 text-sm text-muted-foreground">Проверяем условия…</p>;
  if (elig.reason === 'is_owner') return <p className="pt-3 text-sm text-muted-foreground">Это ваше объявление. Отзыв могут оставить покупатели после переписки.</p>;
  if (elig.reason === 'already_reviewed') return <p role="status" className="pt-3 text-sm">{status === 'ok' ? 'Спасибо! Ваш отзыв сохранён.' : 'Вы уже оставили отзыв по этому объявлению.'}</p>;
  if (!elig.canReview) return <div className="space-y-3 pt-3"><p className="text-sm leading-6 text-muted-foreground">{elig.reason === 'need_mutual_messages' ? 'Отзыв станет доступен после обмена сообщениями с продавцом.' : elig.reason === 'no_chat' ? 'Сначала обсудите объявление с продавцом в чате.' : 'Сейчас отзыв недоступен.'}</p><Button render={<Link href={`/messages?listingId=${listingId}`} />} variant="secondary">Открыть переписку</Button></div>;
  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4 pt-4">
      <label className="block space-y-2 text-sm font-medium"><span>Оценка</span>
        <select value={rating} onChange={(e) => setRating(e.target.value)} disabled={busy} className="block min-h-12 w-full rounded-2xl border border-border bg-background px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-primary">{[5,4,3,2,1].map((n) => <option key={n} value={n}>{n} из 5</option>)}</select>
      </label>
      <label className="block space-y-2 text-sm font-medium"><span>Ваш опыт общения</span><Textarea value={text} onChange={(e) => setText(e.target.value)} disabled={busy} placeholder="Что понравилось или пошло не так (необязательно)" /></label>
      {status === 'error' ? <p role="alert" className="text-sm text-destructive">Отзыв не сохранён. Проверьте соединение и попробуйте ещё раз.</p> : null}
      <Button type="submit" size="lg" disabled={busy} aria-busy={busy} className="w-full sm:w-auto">{busy ? 'Публикуем…' : 'Опубликовать отзыв'}</Button>
    </form>
  );
}
