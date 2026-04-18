import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MessageCircle,
  Package,
  Star,
  Store,
  UserCircle,
} from 'lucide-react';
import { API_URL, apiGetJson, type SellerProfileResponse } from '@/lib/api';
import ListingPlaceholder from '@/components/listing-placeholder';
import { SellerPresenceBadge } from '@/components/seller-presence-badge';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const p = await apiGetJson<SellerProfileResponse>(`/users/${id}/profile`);
    if (!p) return { title: 'Продавец не найден' };
    const name = p.user?.name ?? 'Продавец';
    const title = `${name} — профиль на Barter`;
    return { title, description: `Объявления продавца ${name}. Рейтинг ${p.rating?.avg?.toFixed(1) ?? '—'}.` };
  } catch {
    return { title: 'Продавец' };
  }
}

function formatRub(v: number | null) {
  if (v == null) return 'Цена не указана';
  return `${v.toLocaleString('ru-RU')} ₽`;
}

function reviewsWord(n: number) {
  const abs = n % 100;
  const d = n % 10;
  if (abs > 10 && abs < 20) return 'отзывов';
  if (d === 1) return 'отзыв';
  if (d >= 2 && d <= 4) return 'отзыва';
  return 'отзывов';
}

function resolveAvatar(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_URL}${url}`;
}

function StarRow({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <div className="flex items-center gap-0.5" aria-label={`Рейтинг ${value} из 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={18}
          strokeWidth={1.8}
          className={i < full ? 'fill-accent text-accent' : 'opacity-25'}
          aria-hidden
        />
      ))}
    </div>
  );
}

function ReviewStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={14}
          strokeWidth={1.8}
          className={i < rating ? 'fill-accent text-accent' : 'opacity-25'}
          aria-hidden
        />
      ))}
    </div>
  );
}

export default async function SellerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await apiGetJson<SellerProfileResponse>(`/users/${id}/profile`);

  const avatarSrc = resolveAvatar(profile.user.avatarUrl);
  const avg = profile.rating.avg ?? 0;
  const reviewCount = profile.rating.count;
  const verifiedSeller = avg >= 4.7 && reviewCount >= 10;
  const displayName = profile.user.name ?? 'Продавец';
  const memberSince = new Date(profile.user.createdAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-muted text-foreground antialiased">
      {/* Top bar */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 lg:h-16 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition hover:text-primary"
          >
            <ChevronLeft size={22} strokeWidth={1.8} aria-hidden />
            На главную
          </Link>
          <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
            <span>Главная</span>
            <ChevronRight size={16} strokeWidth={1.8} aria-hidden />
            <span className="font-medium text-muted-foreground">Продавец</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr] lg:items-start">
          {/* Seller card — Vinted / eBay public profile style */}
          <aside className="lg:sticky lg:top-6">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
              <div className="h-24 bg-primary" aria-hidden />
              <div className="relative px-5 pb-5 pt-0">
                <div className="-mt-12 flex justify-center lg:justify-start">
                  {avatarSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarSrc}
                      alt=""
                      className="h-24 w-24 rounded-2xl border-4 border-white object-cover shadow-md ring-1 ring-border"
                    />
                  ) : (
                    <div className="grid h-24 w-24 place-items-center rounded-2xl border-4 border-white bg-muted text-muted-foreground shadow-md ring-1 ring-border">
                      <UserCircle size={44} strokeWidth={1.8} aria-hidden />
                    </div>
                  )}
                </div>

                <div className="mt-4 text-center lg:text-left">
                  <h1 className="text-xl font-bold tracking-tight text-foreground lg:text-2xl">{displayName}</h1>
                  <div className="mt-1.5 flex justify-center lg:justify-start">
                    <SellerPresenceBadge sellerId={id} />
                  </div>
                  {profile.user.companyName ? (
                    <p className="mt-1 text-sm font-medium text-primary">{profile.user.companyName}</p>
                  ) : null}
                  {verifiedSeller ? (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2.5 py-1 text-xs font-bold text-secondary ring-1 ring-secondary/30">
                      <Star size={14} strokeWidth={1.8} className="fill-secondary text-secondary" aria-hidden />
                      Проверенный продавец
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground lg:justify-start">
                  <Calendar size={16} strokeWidth={1.8} className="shrink-0" aria-hidden />
                  <span>На площадке с {memberSince}</span>
                </div>

                <div className="mt-5 rounded-2xl border border-border bg-muted/50 p-4">
                  <div className="text-center lg:text-left">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Рейтинг</p>
                    <div className="mt-2 flex flex-col items-center gap-2 sm:flex-row sm:justify-center lg:items-start lg:justify-start">
                      <span className="text-3xl font-black tabular-nums text-foreground">
                        {profile.rating.avg != null ? profile.rating.avg.toFixed(1) : '—'}
                        <span className="text-lg font-bold text-muted-foreground">/5</span>
                      </span>
                    </div>
                    {profile.rating.avg != null ? (
                      <div className="mt-2 flex justify-center lg:justify-start">
                        <StarRow value={profile.rating.avg} />
                      </div>
                    ) : null}
                    <p className="mt-2 text-sm text-muted-foreground">
                      На основе <span className="font-bold text-foreground">{reviewCount}</span>{' '}
                      {reviewsWord(reviewCount)}
                    </p>
                  </div>
                </div>

                {profile.user.about ? (
                  <div className="mt-4 rounded-xl border border-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground">
                    <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">О продавце</p>
                    {profile.user.about}
                  </div>
                ) : null}
                {profile.user.companyInfo ? (
                  <div className="mt-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-xs leading-relaxed text-primary">
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-primary">Компания</p>
                    {profile.user.companyInfo}
                  </div>
                ) : null}

                <div className="mt-5 grid gap-2">
                  <div className="flex items-center justify-between rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Package size={18} strokeWidth={1.8} aria-hidden />
                      Активных объявлений
                    </span>
                    <span className="font-bold text-foreground">{profile.activeListings.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <div className="min-w-0 space-y-6">
            {/* Listings */}
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex flex-col gap-2 border-b border-border bg-primary px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-card shadow-sm ring-1 ring-primary/30">
                    <Store size={22} strokeWidth={1.8} className="text-primary" aria-hidden />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Активные объявления</h2>
                    <p className="text-xs text-muted-foreground">Товары и услуги этого продавца</p>
                  </div>
                </div>
                <span className="inline-flex w-fit items-center rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary">
                  {profile.activeListings.length}
                </span>
              </div>

              <div className="p-4 sm:p-5">
                {profile.activeListings.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/50 py-14 text-center">
                    <Package size={44} strokeWidth={1.8} className="mx-auto opacity-40" aria-hidden />
                    <p className="mt-3 text-sm font-medium text-muted-foreground">Пока нет активных объявлений</p>
                    <p className="mt-1 text-xs text-muted-foreground">Загляните позже или посмотрите похожие лоты на главной.</p>
                    <Link
                      href="/"
                      className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/20"
                    >
                      К объявлениям
                    </Link>
                  </div>
                ) : (
                  <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {profile.activeListings.map((x) => {
                      const img = x.images?.[0]?.url ? `${API_URL}${x.images[0].url}` : null;
                      return (
                        <li key={x.id}>
                          <Link
                            href={`/listing/${x.id}`}
                            className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-muted/50 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                          >
                            <div className="listing-thumb-wrap relative aspect-[16/10] w-full overflow-hidden border-b border-border">
                              {img ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={img}
                                  alt=""
                                  className="listing-thumb-img h-full w-full object-cover transition group-hover:scale-[1.02]"
                                />
                              ) : (
                                <ListingPlaceholder
                                  title={x.title}
                                  categoryTitle={x.category.title}
                                  className="h-full min-h-[140px] rounded-none border-0"
                                />
                              )}
                            </div>
                            <div className="flex flex-1 flex-col p-4">
                              <p className="line-clamp-2 text-sm font-bold leading-snug text-foreground group-hover:text-primary">
                                {x.title}
                              </p>
                              <p className="mt-2 text-lg font-black text-primary">{formatRub(x.priceRub)}</p>
                              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin size={14} strokeWidth={1.8} className="shrink-0" aria-hidden />
                                {x.city} · {x.category.title}
                              </p>
                              <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary">
                                Открыть
                                <ChevronRight size={14} strokeWidth={1.8} className="transition group-hover:translate-x-0.5 opacity-70" aria-hidden />
                              </span>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>

            {/* Reviews */}
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex flex-col gap-2 border-b border-border bg-primary px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-card shadow-sm ring-1 ring-accent/30">
                    <MessageCircle size={22} strokeWidth={1.8} className="text-accent" aria-hidden />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Отзывы покупателей</h2>
                    <p className="text-xs text-muted-foreground">Реальные оценки после сделок</p>
                  </div>
                </div>
                <span className="inline-flex w-fit rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
                  {reviewCount}
                </span>
              </div>

              <div className="divide-y divide-border p-2 sm:p-4">
                {profile.reviews.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">Пока нет отзывов — станьте первым покупателем.</div>
                ) : (
                  <ul className="space-y-3">
                    {profile.reviews.map((r) => {
                      const initial = (r.author.name ?? 'П')[0]?.toUpperCase() ?? '?';
                      return (
                        <li
                          key={r.id}
                          className="rounded-2xl border border-border bg-muted/50 p-4 transition hover:border-border hover:bg-card sm:p-5"
                        >
                          <div className="flex gap-3">
                            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary ring-1 ring-primary/30">
                              {initial}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-semibold text-foreground">
                                  {r.author.name ?? 'Покупатель'}
                                </span>
                                <time
                                  className="text-xs text-muted-foreground"
                                  dateTime={r.createdAt}
                                >
                                  {new Date(r.createdAt).toLocaleDateString('ru-RU')}
                                </time>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <ReviewStars rating={r.rating} />
                                <span className="text-xs font-bold text-accent">{r.rating}/5</span>
                              </div>
                              {r.text ? (
                                <p className="mt-2 text-sm leading-relaxed text-foreground">{r.text}</p>
                              ) : null}
                              <Link
                                href={`/listing/${r.listing.id}`}
                                className="mt-3 inline-flex items-center gap-1 rounded-lg bg-card px-2.5 py-1.5 text-xs font-semibold text-primary ring-1 ring-primary/30 transition hover:bg-primary/10"
                              >
                                По объявлению: <span className="truncate max-w-[200px] sm:max-w-xs">{r.listing.title}</span>
                                <ChevronRight size={14} strokeWidth={1.8} className="shrink-0 opacity-60" aria-hidden />
                              </Link>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
