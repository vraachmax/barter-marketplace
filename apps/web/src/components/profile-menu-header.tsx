'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle, Star, UserCircle } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { apiGetJson, type SellerProfileResponse } from '@/lib/api';

export function ProfileMenuHeader() {
  const { ready, user } = useAuth();
  const [avg, setAvg] = useState<number | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    apiGetJson<SellerProfileResponse>(`/users/${user.id}/profile`)
      .then((p) => {
        setAvg(p?.rating?.avg ?? null);
        setCount(p?.rating?.count ?? 0);
      })
      .catch(() => {});
  }, [user]);

  if (!ready) {
    return (
      <div className="border-b border-zinc-200/80 bg-gradient-to-br from-sky-50/90 via-white to-cyan-50/80 px-3.5 py-4 dark:border-zinc-700/80 dark:from-sky-950/35 dark:via-zinc-900 dark:to-cyan-950/25">
        <div className="h-6 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="border-b border-zinc-200/80 bg-gradient-to-br from-sky-50/90 via-white to-cyan-50/80 px-3.5 py-3.5 dark:border-zinc-700/80 dark:from-sky-950/35 dark:via-zinc-900 dark:to-cyan-950/25">
        <Link
          href="/auth?mode=login"
          className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-sky-600/25 transition hover:from-sky-700 hover:to-cyan-700"
        >
          <UserCircle size={20} strokeWidth={1.8} aria-hidden />
          Войти или зарегистрироваться
        </Link>
      </div>
    );
  }

  const stars = avg ? Math.round(avg) : 0;
  const isVerified = (avg ?? 0) >= 4.7 && count >= 10;

  return (
    <div className="border-b border-zinc-200/80 bg-gradient-to-br from-sky-50/90 via-white to-cyan-50/80 px-3.5 py-3.5 dark:border-zinc-700/80 dark:from-sky-950/35 dark:via-zinc-900 dark:to-cyan-950/25">
      <div className="flex items-center gap-2.5">
        <Link
          href="/profile"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-600 to-cyan-600 text-white shadow-md shadow-sky-600/25 ring-2 ring-white transition hover:from-sky-700 hover:to-cyan-700 dark:ring-zinc-900"
          aria-label="Открыть профиль"
        >
          <UserCircle size={24} strokeWidth={1.8} aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-50">
            {user.name ?? user.email ?? user.phone ?? 'Пользователь'}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {user.email ?? user.phone ?? ''}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
        <span className="text-lg font-black tabular-nums text-zinc-900 dark:text-zinc-50">
          {avg ? avg.toFixed(1) : '—'}
        </span>
        <span className="inline-flex items-center gap-0.5" aria-hidden>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={14}
              strokeWidth={1.8}
              className={i < stars ? 'fill-amber-400 text-amber-400' : 'opacity-30'}
              aria-hidden
            />
          ))}
        </span>
        <Link
          href="/profile/reviews"
          className="font-semibold text-sky-700 underline decoration-sky-600/30 underline-offset-2 hover:text-sky-800 dark:text-sky-400"
        >
          {count} отзывов
        </Link>
      </div>

      {isVerified ? (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 shadow-sm dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-200">
          <CheckCircle size={14} strokeWidth={1.8} className="shrink-0" aria-hidden />
          Проверенный продавец
        </div>
      ) : null}
    </div>
  );
}
