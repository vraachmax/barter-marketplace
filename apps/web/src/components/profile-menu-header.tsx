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
      <div className="border-b border-border bg-primary px-3.5 py-4">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="border-b border-border bg-primary px-3.5 py-3.5">
        <Link
          href="/auth?mode=login"
          className="flex items-center gap-2.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/20 transition"
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
    <div className="border-b border-border bg-primary px-3.5 py-3.5">
      <div className="flex items-center gap-2.5">
        <Link
          href="/profile"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-white shadow-md shadow-primary/20 ring-2 ring-white transition"
          aria-label="Открыть профиль"
        >
          <UserCircle size={24} strokeWidth={1.8} aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">
            {user.name ?? user.email ?? user.phone ?? 'Пользователь'}
          </p>
          <p className="text-xs text-muted-foreground">
            {user.email ?? user.phone ?? ''}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
        <span className="text-lg font-black tabular-nums text-foreground">
          {avg ? avg.toFixed(1) : '—'}
        </span>
        <span className="inline-flex items-center gap-0.5" aria-hidden>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={14}
              strokeWidth={1.8}
              className={i < stars ? 'fill-accent text-accent' : 'opacity-30'}
              aria-hidden
            />
          ))}
        </span>
        <Link
          href="/profile/reviews"
          className="font-semibold text-primary underline underline-offset-2 hover:text-primary"
        >
          {count} отзывов
        </Link>
      </div>

      {isVerified ? (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/10 px-2.5 py-1 text-[11px] font-bold text-secondary shadow-sm">
          <CheckCircle size={14} strokeWidth={1.8} className="shrink-0" aria-hidden />
          Проверенный продавец
        </div>
      ) : null}
    </div>
  );
}
