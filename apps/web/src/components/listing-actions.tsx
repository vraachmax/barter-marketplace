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
      className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
      <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
        Жалоба отправлена
      </span>
    );
  }

  if (state === 'confirm' || state === 'sending') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">Пожаловаться на объявление?</span>
        <button
          disabled={state === 'sending'}
          onClick={send}
          className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
        >
          {state === 'sending' ? '…' : 'Да'}
        </button>
        <button
          onClick={() => setState('idle')}
          className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
        >
          Нет
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setState('confirm')}
      className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-red-800 dark:hover:bg-red-950/40 dark:hover:text-red-300"
    >
      <Flag size={16} strokeWidth={s} aria-hidden />
      Пожаловаться
    </button>
  );
}
