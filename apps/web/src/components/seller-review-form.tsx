'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MessageCircle, Star } from 'lucide-react';
import { apiFetchJson, type ReviewEligibility } from '@/lib/api';
import { UiSelect } from '@/components/ui-select';

type Props = {
  sellerId: string;
  listingId: string;
};

export default function SellerReviewForm({ sellerId, listingId }: Props) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [eligLoading, setEligLoading] = useState(true);
  const [elig, setElig] = useState<ReviewEligibility | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setEligLoading(true);
      const res = await apiFetchJson<ReviewEligibility>(`/reviews/listing/${listingId}/eligibility`, {
        method: 'GET',
      });
      if (!alive) return;
      setEligLoading(false);
      if (res.ok) {
        setElig(res.data);
        setAuthRequired(false);
        return;
      }
      if (res.status === 401) {
        setAuthRequired(true);
        setElig(null);
        return;
      }
      setElig(null);
    })();
    return () => {
      alive = false;
    };
  }, [listingId]);

  async function submit() {
    setBusy(true);
    setStatus('idle');
    const res = await apiFetchJson<{ id: string }>(`/reviews/seller/${sellerId}`, {
      method: 'POST',
      body: JSON.stringify({
        listingId,
        rating,
        text: text.trim() || undefined,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setStatus('error');
      setMessage(res.message);
      return;
    }
    setStatus('ok');
    setMessage('Спасибо! Отзыв сохранён и учтётся в рейтинге продавца.');
    setText('');
    setElig({ canReview: false, reason: 'already_reviewed', sellerId, hasExistingReview: true });
  }

  const chatHref = `/messages?listingId=${encodeURIComponent(listingId)}`;

  return (
    <div
      id="listing-review"
      className="scroll-mt-24 rounded-2xl border border-border bg-primary to-white p-4"
    >
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10 text-accent">
          <Star size={16} strokeWidth={1.8} className="text-accent" aria-hidden />
        </span>
        <div>
          <div className="text-sm font-bold text-foreground">Оценка продавца</div>
          <p className="text-[11px] text-muted-foreground">Только после переписки</p>
        </div>
      </div>

      {eligLoading ? (
        <p className="mt-3 text-xs text-muted-foreground">Проверяем условия…</p>
      ) : authRequired ? (
        <div className="mt-3 rounded-xl border border-primary/30 bg-primary/10 px-3 py-3 text-sm text-primary">
          <p>Войдите, чтобы увидеть, можете ли вы оставить отзыв по этой сделке.</p>
          <Link
            href={`/auth?next=${encodeURIComponent(`/listing/${listingId}#listing-review`)}`}
            className="mt-2 inline-flex text-sm font-bold text-primary underline"
          >
            Войти или зарегистрироваться
          </Link>
        </div>
      ) : elig?.reason === 'is_owner' ? (
        <p className="mt-3 text-xs text-muted-foreground">Это ваше объявление — отзыв оставляют покупатели после чата.</p>
      ) : elig?.canReview ? (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Оценка:</span>
            <UiSelect
              value={String(rating)}
              onChange={(v) => setRating(Number(v))}
              options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} ★` }))}
              className="h-9 min-w-[100px] rounded-xl border-border bg-card px-2"
            />
          </div>
          <textarea
            className="mt-3 min-h-[5rem] w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/30 focus:ring-2 focus:ring-primary/30"
            placeholder="Коротко о встрече, комплекте, общении (по желанию)"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className="mt-3 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/20 transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Сохраняю…' : 'Опубликовать отзыв'}
          </button>
        </>
      ) : elig?.reason === 'already_reviewed' ? (
        <p className="mt-3 text-sm font-medium text-secondary">Вы уже оставили отзыв по этому объявлению.</p>
      ) : (
        <div className="mt-3 space-y-3 rounded-xl border border-accent/30 bg-accent/10 px-3 py-3 text-sm text-accent">
          <p className="font-medium">
            {elig?.reason === 'no_chat'
              ? 'Отзыв можно оставить только после начала переписки с продавцом в чате площадки.'
              : elig?.reason === 'need_mutual_messages'
                ? 'Напишите продавцу и дождитесь ответа в этом чате — после обмена сообщениями отзыв станет доступен (защита от накрутки).'
                : 'Сейчас отзыв недоступен.'}
          </p>
          <p className="text-xs leading-relaxed opacity-90">
            В чате помощник спросит, как прошла сделка, напомнит не уходить в сторонние мессенджеры и подскажет про оценку.
          </p>
          <Link
            href={chatHref}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/20"
          >
            <MessageCircle size={18} strokeWidth={1.8} aria-hidden />
            Перейти в чат
          </Link>
        </div>
      )}

      {status === 'ok' ? (
        <div className="mt-2 text-xs font-medium text-secondary">{message}</div>
      ) : null}
      {status === 'error' ? (
        <div className="mt-2 text-xs font-medium text-destructive">{message}</div>
      ) : null}
    </div>
  );
}
