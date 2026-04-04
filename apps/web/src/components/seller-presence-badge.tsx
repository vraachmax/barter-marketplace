'use client';

import { useEffect, useState } from 'react';
import { usePresenceContext } from '@/components/presence-provider';

function formatLastSeen(iso: string | null | undefined) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (sameDay) {
      return `Был(а) сегодня в ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return `Был(а) ${d.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  } catch {
    return null;
  }
}

type Props = {
  sellerId: string;
  className?: string;
  /** компактная строка в одну линию под именем */
  compact?: boolean;
};

/**
 * Статус продавца: «В сети» при открытом приложении (WebSocket + JWT), иначе последний раз в сети по HTTP.
 */
export function SellerPresenceBadge({ sellerId, className = '', compact }: Props) {
  const ctx = usePresenceContext();
  const [polledOnline, setPolledOnline] = useState<boolean | null>(null);
  const [polledLast, setPolledLast] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const r = await fetch(`/presence/users/${sellerId}`);
        if (!r.ok || !alive) return;
        const j = (await r.json()) as { online: boolean; lastSeenAt: string | null };
        setPolledOnline(j.online);
        setPolledLast(j.lastSeenAt);
      } catch {
        /* ignore */
      }
    }
    void poll();
    const id = window.setInterval(poll, 15000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [sellerId]);

  useEffect(() => {
    void ctx?.refreshUser(sellerId);
  }, [ctx, sellerId]);

  const ctxOn = ctx?.onlineByUserId[sellerId];
  const online = ctxOn === true || (ctxOn === undefined && polledOnline === true);

  const lastIso =
    ctx?.lastSeenByUserId[sellerId] ??
    polledLast ??
    null;
  const lastLabel = online ? null : formatLastSeen(lastIso);

  if (online) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 ${className}`.trim()}
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30 dark:bg-emerald-400 dark:ring-emerald-400/40" />
        </span>
        {compact ? 'В сети' : 'Сейчас в сети'}
      </span>
    );
  }

  if (lastLabel) {
    return (
      <span className={`text-xs font-medium text-zinc-500 dark:text-zinc-400 ${className}`.trim()}>{lastLabel}</span>
    );
  }

  return (
    <span className={`text-xs font-medium text-zinc-400 dark:text-zinc-500 ${className}`.trim()}>
      Нет данных о визите
    </span>
  );
}
