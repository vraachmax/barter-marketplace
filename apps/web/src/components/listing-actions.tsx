'use client';

import { Link2, Mail, Flag } from 'lucide-react';
import { useCallback, useState } from 'react';
import { apiFetchJson } from '@/lib/api';

const s = 1.8;

type Props = { listingId: string; title: string };

export function ListingShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const share = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (typeof navigator?.share === 'function') {
      try {
        await navigator.share({ title, url });
        return;
      } catch { /* user cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  }, [title]);

  return (
    <button
      onClick={share}
      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted/50"
    >
      {copied ? <Link2 size={16} strokeWidth={s} aria-hidden /> : <Mail size={16} strokeWidth={s} aria-hidden />}
      {copied ? 'Скопировано!' : 'Поделиться'}
    </button>
  );
}

export function ListingReportButton({ listingId }: Props) {
  const [state, setState] = useState<'idle' | 'confirm' | 'sending' | 'done' | 'error'>('idle');

  const send = useCallback(async () => {
    setState('sending');
    try {
      await apiFetchJson(`/listings/${listingId}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Жалоба пользователя' }),
      });
      setState('done');
    } catch {
      setState('error');
    }
  }, [listingId]);

  if (state === 'done') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl border border-secondary/30 bg-secondary/10 px-3 py-2 text-xs font-semibold text-secondary">
        Жалоба отправлена
      </span>
    );
  }

  if (state === 'confirm' || state === 'sending') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Пожаловаться на объявление?</span>
        <button
          disabled={state === 'sending'}
          onClick={send}
          className="rounded-xl bg-destructive/10 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
        >
          {state === 'sending' ? '…' : 'Да'}
        </button>
        <button
          onClick={() => setState('idle')}
          className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground"
        >
          Нет
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setState('confirm')}
      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
    >
      <Flag size={16} strokeWidth={s} aria-hidden />
      Пожаловаться
    </button>
  );
}
