'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import {
  apiFetchJson,
  apiGetJson,
  type AuthMe,
  type ChatSummary,
  type MyListing,
  type MyReviewsResponse,
  type SellerProfileResponse,
} from '@/lib/api';
import ProfileSidebar from '@/components/profile-sidebar';

export default function MyReviewsPage() {
  const [status, setStatus] = useState<'loading' | 'need_auth' | 'ready' | 'error'>('loading');
  const [data, setData] = useState<MyReviewsResponse>({ given: [], received: [] });
  const [counts, setCounts] = useState({ active: 0, archived: 0, chats: 0 });
  const [me, setMe] = useState<AuthMe | null>(null);
  const [rating, setRating] = useState<{ avg: number | null; count: number }>({ avg: null, count: 0 });

  async function load() {
    setStatus('loading');
    const [res, myListings, chats, meRes] = await Promise.all([
      apiFetchJson<MyReviewsResponse>('/reviews/my'),
      apiFetchJson<MyListing[]>('/listings/my'),
      apiFetchJson<ChatSummary[]>('/chats'),
      apiFetchJson<AuthMe>('/auth/me'),
    ]);
    if (!res.ok) {
      if (res.status === 401) {
        setStatus('need_auth');
        return;
      }
      setStatus('error');
      return;
    }
    setData(res.data);
    if (meRes.ok) {
      setMe(meRes.data);
      const profile = await apiGetJson<SellerProfileResponse>(`/users/${meRes.data.id}/profile`).catch(
        () => null as SellerProfileResponse | null,
      );
      if (profile?.rating) {
        setRating({
          avg: profile.rating.avg ?? null,
          count: profile.rating.count ?? 0,
        });
      }
    }
    if (myListings.ok) {
      setCounts({
        active: myListings.data.filter((x) => x.status === 'ACTIVE').length,
        archived: myListings.data.filter((x) => x.status === 'ARCHIVED').length,
        chats: chats.ok ? chats.data.length : 0,
      });
    }
    setStatus('ready');
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="min-h-screen bg-muted px-4 py-8 text-foreground antialiased md:py-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-3xl border border-border bg-card shadow-lg">
          <div className="flex items-center gap-3 border-b border-border bg-primary px-5 py-4 sm:border-b-0 sm:bg-transparent">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-white shadow-md">
              <Star size={22} strokeWidth={1.8} className="text-white" aria-hidden />
            </span>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground md:text-xl">Мои отзывы</h1>
              <p className="text-xs font-medium text-muted-foreground">Что вы написали и что вам написали</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 px-5 pb-4 sm:pb-0 sm:pr-5">
            <Link
              href="/profile/settings"
              className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
            >
              Настройки
            </Link>
            <Link
              href="/profile"
              className="rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white shadow-md shadow-primary/20"
            >
              В кабинет
            </Link>
          </div>
        </div>

        {status === 'loading' ? (
          <div className="text-sm text-muted-foreground">Загрузка…</div>
        ) : null}
        {status === 'need_auth' ? (
          <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm">
            Нужно войти.{' '}
            <Link href="/auth" className="font-semibold text-primary underline">
              Войти
            </Link>
          </div>
        ) : null}
        {status === 'error' ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Не удалось загрузить отзывы.
          </div>
        ) : null}

        {status === 'ready' ? (
          <div className="grid gap-5 md:grid-cols-[260px_1fr] lg:gap-6">
            <ProfileSidebar
              active="reviews"
              activeCount={counts.active}
              archivedCount={counts.archived}
              profileName={me?.name ?? me?.email ?? 'Профиль'}
              profileAvatarUrl={me?.avatarUrl ?? null}
              ratingAvg={rating.avg}
              ratingCount={rating.count}
              sellerUserId={me?.id ?? null}
            />
            <div className="overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-md md:p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-muted/50 p-4">
                  <div className="mb-3 text-sm font-bold text-foreground">Вы оставили</div>
                  {data.given.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Пока вы не оставляли отзывы.</div>
                  ) : (
                    <div className="space-y-2">
                      {data.given.map((r) => (
                        <div
                          key={r.id}
                          className="rounded-xl border border-border bg-card p-3 text-xs"
                        >
                          <div className="font-bold text-foreground">{r.listing.title}</div>
                          <div className="text-muted-foreground">Продавец: {r.seller.name ?? 'Пользователь'}</div>
                          <div className="mt-1 font-semibold text-accent">Оценка: {r.rating}/5</div>
                          {r.text ? <div className="mt-2 text-foreground">{r.text}</div> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-border bg-muted/50 p-4">
                  <div className="mb-3 text-sm font-bold text-foreground">Обо мне</div>
                  {data.received.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Пока вам не оставляли отзывы.</div>
                  ) : (
                    <div className="space-y-2">
                      {data.received.map((r) => (
                        <div
                          key={r.id}
                          className="rounded-xl border border-border bg-card p-3 text-xs"
                        >
                          <div className="font-bold text-foreground">{r.listing.title}</div>
                          <div className="text-muted-foreground">Автор: {r.author.name ?? 'Покупатель'}</div>
                          <div className="mt-1 font-semibold text-accent">Оценка: {r.rating}/5</div>
                          {r.text ? <div className="mt-2 text-foreground">{r.text}</div> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
