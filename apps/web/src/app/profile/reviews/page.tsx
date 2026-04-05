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
    <div className="min-h-screen bg-zinc-100 px-4 py-8 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100 md:py-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-lg shadow-zinc-200/30 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/40">
          <div className="flex items-center gap-3 border-b border-zinc-100 bg-gradient-to-r from-amber-50 via-white to-sky-50/80 px-5 py-4 dark:border-zinc-800 dark:from-amber-950/30 dark:via-zinc-900 dark:to-sky-950/20 sm:border-b-0 sm:bg-transparent sm:dark:bg-transparent">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md">
              <Star size={22} strokeWidth={1.8} className="text-white" aria-hidden />
            </span>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">Мои отзывы</h1>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Что вы написали и что вам написали</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 px-5 pb-4 sm:pb-0 sm:pr-5">
            <Link
              href="/profile/settings"
              className="rounded-xl border border-zinc-200/90 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-900 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-sky-700 dark:hover:bg-sky-950/40"
            >
              Настройки
            </Link>
            <Link
              href="/profile"
              className="rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-3 py-2 text-sm font-bold text-white shadow-md shadow-sky-600/20 hover:from-sky-700 hover:to-cyan-700"
            >
              В кабинет
            </Link>
          </div>
        </div>

        {status === 'loading' ? (
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Загрузка…</div>
        ) : null}
        {status === 'need_auth' ? (
          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            Нужно войти.{' '}
            <Link href="/auth" className="font-semibold text-sky-700 underline dark:text-sky-400">
              Войти
            </Link>
          </div>
        ) : null}
        {status === 'error' ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
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
            <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/30 md:p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
                  <div className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">Вы оставили</div>
                  {data.given.length === 0 ? (
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">Пока вы не оставляли отзывы.</div>
                  ) : (
                    <div className="space-y-2">
                      {data.given.map((r) => (
                        <div
                          key={r.id}
                          className="rounded-xl border border-zinc-200/80 bg-white p-3 text-xs dark:border-zinc-700 dark:bg-zinc-900/80"
                        >
                          <div className="font-bold text-zinc-900 dark:text-zinc-100">{r.listing.title}</div>
                          <div className="text-zinc-500 dark:text-zinc-400">Продавец: {r.seller.name ?? 'Пользователь'}</div>
                          <div className="mt-1 font-semibold text-amber-700 dark:text-amber-400">Оценка: {r.rating}/5</div>
                          {r.text ? <div className="mt-2 text-zinc-700 dark:text-zinc-300">{r.text}</div> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
                  <div className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">Обо мне</div>
                  {data.received.length === 0 ? (
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">Пока вам не оставляли отзывы.</div>
                  ) : (
                    <div className="space-y-2">
                      {data.received.map((r) => (
                        <div
                          key={r.id}
                          className="rounded-xl border border-zinc-200/80 bg-white p-3 text-xs dark:border-zinc-700 dark:bg-zinc-900/80"
                        >
                          <div className="font-bold text-zinc-900 dark:text-zinc-100">{r.listing.title}</div>
                          <div className="text-zinc-500 dark:text-zinc-400">Автор: {r.author.name ?? 'Покупатель'}</div>
                          <div className="mt-1 font-semibold text-amber-700 dark:text-amber-400">Оценка: {r.rating}/5</div>
                          {r.text ? <div className="mt-2 text-zinc-700 dark:text-zinc-300">{r.text}</div> : null}
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
