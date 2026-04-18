'use client';

import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  Camera,
  FileText,
  Search,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';

const s = 1.8;
import {
  API_URL,
  type AuthMe,
  apiFetchJson,
  apiGetJson,
  type Category,
  type MyListing,
} from '@/lib/api';
import ListingPlaceholder from '@/components/listing-placeholder';
import { ProfileArchivedSection } from '@/components/profile-archived-section';
import { UiSelect } from '@/components/ui-select';
import { listingThumbPromoExtraClass } from '@/lib/listing-card-visuals';

type ListingTab = 'ALL' | 'ACTIVE' | 'ARCHIVED' | 'SOLD';

const PROMO_TIERS: Array<{
  type: 'TOP' | 'VIP' | 'XL';
  title: string;
  blurb: string;
  icon: LucideIcon;
  shell: string;
}> = [
  {
    type: 'TOP',
    title: 'Топ',
    blurb: 'Выше в общей ленте',
    icon: Star,
    shell: 'bg-card hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)]',
  },
  {
    type: 'VIP',
    title: 'VIP',
    blurb: 'Больше показов и доверия',
    icon: Sparkles,
    shell: 'bg-card hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)]',
  },
  {
    type: 'XL',
    title: 'XL',
    blurb: 'Крупное фото в рекомендациях',
    icon: Camera,
    shell: 'bg-card hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)]',
  },
];

function formatPromoEndsAt(iso: string) {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function ListingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [me, setMe] = useState<AuthMe | null>(null);
  const [status, setStatus] = useState<'loading' | 'need_auth' | 'ready' | 'error'>('loading');
  const [listings, setListings] = useState<MyListing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<ListingTab>('ACTIVE');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    city: '',
    categoryId: '',
    priceRub: '',
  });

  function setListingTab(tab: ListingTab) {
    setActiveTab(tab);
    router.push(`/listings?tab=${tab}`, { scroll: false });
  }

  async function loadData() {
    setStatus('loading');
    const [res, cats] = await Promise.all([
      apiFetchJson<AuthMe>('/auth/me'),
      apiGetJson<Category[]>('/categories').catch(() => [] as Category[]),
    ]);
    if (!res.ok) {
      if (res.status === 401) { setStatus('need_auth'); return; }
      setStatus('error');
      return;
    }
    setMe(res.data);
    setCategories(cats);
    const myListings = await apiFetchJson<MyListing[]>('/listings/my');
    if (myListings.ok) setListings(myListings.data);
    setStatus('ready');
  }

  async function promote(id: string, type: 'TOP' | 'VIP' | 'XL') {
    const res = await apiFetchJson<{ ok: true }>(`/listings/${id}/promote`, {
      method: 'POST',
      body: JSON.stringify({ type, days: 3 }),
    });
    if (res.ok) await loadData();
  }

  async function setListingStatus(id: string, nextStatus: 'ACTIVE' | 'SOLD' | 'ARCHIVED') {
    const res = await apiFetchJson<{ id: string; status: string }>(`/listings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) await loadData();
  }

  async function publishAfterImageReview(id: string) {
    const res = await apiFetchJson(`/listings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ publishFromModeration: true }),
    });
    if (res.ok) await loadData();
  }

  async function removeListing(id: string) {
    const ok = window.confirm('Удалить объявление безвозвратно?');
    if (!ok) return;
    const res = await apiFetchJson<{ ok: true }>(`/listings/${id}`, { method: 'DELETE' });
    if (res.ok) await loadData();
  }

  function startEdit(x: MyListing) {
    setEditingId(x.id);
    setEditForm({
      title: x.title,
      description: '',
      city: x.city,
      categoryId: x.category.id,
      priceRub: x.priceRub == null ? '' : String(x.priceRub),
    });
  }

  async function saveEdit(id: string) {
    const payload: Record<string, unknown> = {
      title: editForm.title.trim(),
      city: editForm.city.trim(),
      categoryId: editForm.categoryId,
    };
    if (editForm.description.trim().length >= 10) payload.description = editForm.description.trim();
    if (editForm.priceRub.trim().length > 0) payload.priceRub = Number(editForm.priceRub);
    const res = await apiFetchJson(`/listings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setEditingId(null);
      await loadData();
    }
  }

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'ACTIVE' || tab === 'ARCHIVED' || tab === 'SOLD' || tab === 'ALL') {
      setActiveTab(tab);
      return;
    }
    setActiveTab('ACTIVE');
  }, [searchParams]);

  useEffect(() => {
    void loadData();
  }, []);

  const activeCount = listings.filter((x) => x.status === 'ACTIVE' || x.status === 'PENDING').length;
  const archivedCount = listings.filter((x) => x.status === 'ARCHIVED').length;
  const soldCount = listings.filter((x) => x.status === 'SOLD').length;
  const visibleListings = listings.filter((x) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'ACTIVE') return x.status === 'ACTIVE' || x.status === 'PENDING';
    return x.status === activeTab;
  });

  function statusLabel(st: MyListing['status']) {
    if (st === 'ACTIVE') return { text: 'Активно', className: 'bg-secondary/10 text-secondary ring-secondary/30' };
    if (st === 'PENDING')
      return { text: 'Модерация', className: 'bg-accent/10 text-accent ring-border' };
    if (st === 'BLOCKED')
      return { text: 'Скрыто', className: 'bg-destructive/10 text-destructive ring-border' };
    if (st === 'SOLD') return { text: 'Продано', className: 'bg-primary/10 text-primary ring-primary/30' };
    return { text: 'Архив', className: 'bg-accent/10 text-accent ring-accent/30' };
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4] text-[#1a1a1a] antialiased">
      {/* Mobile header */}
      <header className="sticky top-0 z-20 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.08)] backdrop-blur-md md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center rounded-lg p-2 transition hover:bg-[#f4f4f4]"
          >
            <ArrowLeft size={24} strokeWidth={s} className="text-[#1a1a1a]" aria-hidden />
          </button>
          <h1 className="text-base font-bold text-[#1a1a1a]">Мои объявления</h1>
          <button
            type="button"
            onClick={() => router.push('/search')}
            className="inline-flex items-center justify-center rounded-lg p-2 transition hover:bg-[#f4f4f4]"
          >
            <Search size={24} strokeWidth={s} className="text-[#1a1a1a]" aria-hidden />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8 lg:py-8">
        {status === 'loading' ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <span className="inline-block size-10 animate-spin rounded-full border-2 border-primary/30 border-t-transparent" aria-hidden />
            <p className="text-sm text-muted-foreground">Загружаем объявления…</p>
          </div>
        ) : null}

        {status === 'need_auth' ? (
          <div className="mx-auto max-w-md py-10">
            <div className="overflow-hidden rounded-lg bg-card">
              <div className="bg-[#E8F2FF] px-6 py-10 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg bg-card">
                  <Sparkles size={32} strokeWidth={s} className="text-[#007AFF]" aria-hidden />
                </div>
                <h1 className="mt-4 text-xl font-bold text-[#1a1a1a]">Мои объявления</h1>
                <p className="mt-2 text-sm text-[#6b7280]">Войдите, чтобы управлять объявлениями.</p>
              </div>
              <div className="p-6">
                <Link
                  href="/auth"
                  className="flex h-12 w-full items-center justify-center rounded-lg bg-[#007AFF] text-sm font-semibold text-white transition hover:bg-[#0066DD]"
                >
                  Войти или зарегистрироваться
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {status === 'error' ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
            Не удалось загрузить данные. Попробуйте обновить страницу.
          </div>
        ) : null}

        {status === 'ready' && me ? (
          <>
            {/* ===== MOBILE VIEW ===== */}
            <div className="md:hidden pb-28">
              {/* Tabs */}
              <div className="flex items-baseline gap-4 border-b border-[#E8E8E8] bg-card px-4 pt-3">
                {([
                  { tab: 'ACTIVE' as ListingTab, label: 'Активные', count: activeCount },
                  { tab: 'SOLD' as ListingTab, label: 'Продано', count: soldCount },
                  { tab: 'ARCHIVED' as ListingTab, label: 'Архив', count: archivedCount },
                ] as const).map((t) => (
                  <button
                    key={t.tab}
                    type="button"
                    onClick={() => setListingTab(t.tab)}
                    className={`relative pb-3 text-base transition ${
 activeTab === t.tab
 ? 'font-bold text-[#1a1a1a]'
 : 'font-medium text-muted-foreground'
 }`}
                  >
                    {t.label}
                    {t.count > 0 ? <sup className="ml-0.5 text-[11px] font-semibold">{t.count}</sup> : null}
                    {activeTab === t.tab ? (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[#1a1a1a]" />
                    ) : null}
                  </button>
                ))}
              </div>

              {/* Listings list */}
              <div className="bg-card">
                {visibleListings.length === 0 ? (
                  <div className="px-4 py-16 text-center">
                    <p className="text-sm text-muted-foreground">
                      {activeTab === 'ACTIVE' ? 'Нет активных объявлений' : activeTab === 'SOLD' ? 'Нет проданных' : 'Архив пуст'}
                    </p>
                  </div>
                ) : (
                  visibleListings.map((x) => {
                    const thumbImg = x.images?.[0];
                    const thumbUrl = thumbImg
                      ? thumbImg.url.startsWith('http') ? thumbImg.url : `${API_URL}${thumbImg.url}`
                      : null;
                    return (
                      <div key={x.id} className="flex gap-3 border-b border-[#F0F0F0] px-4 py-3">
                        <Link href={`/listing/${x.id}`} className="flex-shrink-0">
                          <div className="h-[80px] w-[80px] overflow-hidden rounded-lg bg-[#f4f4f4]">
                            {thumbUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={thumbUrl} alt={x.title} className="h-full w-full object-cover" />
                            ) : (
                              <ListingPlaceholder />
                            )}
                          </div>
                        </Link>
                        <div className="flex min-w-0 flex-1 flex-col justify-between">
                          <div>
                            <Link href={`/listing/${x.id}`} className="text-sm font-medium text-[#1a1a1a] line-clamp-2 hover:underline">
                              {x.title}
                            </Link>
                            <div className="mt-0.5 text-sm font-bold text-[#1a1a1a]">
                              {x.priceRub != null ? `${x.priceRub.toLocaleString('ru-RU')} \u20BD` : 'Цена не указана'}
                            </div>
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span>{x.city}</span>
                            <span>{statusLabel(x.status).text}</span>
                          </div>
                          {x.activePromotion ? (
                            <div className="mt-1 text-[11px] font-medium text-[#007AFF]">
                              {x.activePromotion.type} до {formatPromoEndsAt(x.activePromotion.endsAt)}
                            </div>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => startEdit(x)}
                          className="flex-shrink-0 self-start p-1 text-muted-foreground hover:text-muted-foreground"
                        >
                          <FileText size={18} strokeWidth={1.5} aria-hidden />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Sticky bottom button */}
              <div className="fixed bottom-[72px] left-0 right-0 z-50 border-t border-[#E8E8E8] bg-card px-4 py-3">
                <Link
                  href="/new"
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-[#00AAFF] text-sm font-bold text-white transition hover:bg-[#0099EE]"
                >
                  Разместить объявление
                </Link>
              </div>
            </div>

            {/* ===== DESKTOP VIEW ===== */}
            <div className="hidden md:block">
              {/* Desktop title */}
              <div className="mb-6 flex items-center justify-between gap-4">
                <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
                  Мои объявления
                </h1>
                <Link
                  href="/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#007AFF] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0066DD]"
                >
                  Разместить объявление
                </Link>
              </div>

              {/* Listings management */}
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Управление объявлениями</h2>
                    <p className="text-xs text-muted-foreground">Всего в кабинете: {listings.length}</p>
                  </div>
                </div>

                {/* Segmented tabs */}
                <div className="mb-5 flex flex-wrap gap-2 rounded-xl bg-muted p-1">
                  {(
                    [
                      ['ACTIVE', 'Активные', activeCount],
                      ['SOLD', 'Продано', soldCount],
                      ['ARCHIVED', 'Архив', archivedCount],
                      ['ALL', 'Все', listings.length],
                    ] as const
                  ).map(([tab, label, count]) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setListingTab(tab)}
                      className={`flex-1 min-w-[100px] rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
 activeTab === tab
 ? tab === 'ARCHIVED'
 ? 'bg-accent/10 text-white shadow-sm'
 : 'bg-card text-foreground shadow-sm'
 : 'text-muted-foreground hover:text-foreground'
 }`}
                    >
                      {label}
                      <span className="ml-1 opacity-70">({count})</span>
                    </button>
                  ))}
                </div>

                {activeTab === 'ARCHIVED' ? (
                  <ProfileArchivedSection
                    items={visibleListings}
                    onRestore={(id) => void setListingStatus(id, 'ACTIVE')}
                    onRemove={removeListing}
                  />
                ) : (
                  <>
                    {visibleListings.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border bg-muted/50 py-12 text-center">
                        <p className="text-sm font-medium text-muted-foreground">В этом разделе пока пусто</p>
                        <Link
                          href="/new"
                          className="mt-3 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary"
                        >
                          Создать объявление
                        </Link>
                      </div>
                    ) : null}

                    <ul className="space-y-4">
                      {visibleListings.map((x) => {
                        const st = statusLabel(x.status);
                        return (
                          <li
                            key={x.id}
                            className="rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                          >
                            <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-stretch">
                              <div
                                className={`listing-thumb-wrap relative h-28 w-full shrink-0 overflow-hidden rounded-xl border border-border sm:h-32 lg:h-[100px] lg:w-[140px] ${listingThumbPromoExtraClass(x.activePromotion?.type ?? null)}`.trim()}
                              >
                                {x.images?.[0]?.url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={`${API_URL}${x.images[0].url}`}
                                    alt=""
                                    className="listing-thumb-img h-full w-full object-cover"
                                  />
                                ) : (
                                  <ListingPlaceholder
                                    title={x.title}
                                    categoryTitle={x.category.title}
                                    className="h-full w-full rounded-none border-0"
                                  />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <Link
                                    href={`/listing/${x.id}`}
                                    className="line-clamp-2 text-base font-bold text-foreground hover:text-primary hover:underline"
                                  >
                                    {x.title}
                                  </Link>
                                  <span
                                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${st.className}`}
                                  >
                                    {st.text}
                                  </span>
                                </div>
                                <div className="mt-1 text-xl font-bold text-foreground">
                                  {x.priceRub != null ? `${x.priceRub.toLocaleString('ru-RU')} ₽` : 'Цена не указана'}
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {x.city} · {x.category.title} ·{' '}
                                  {new Date(x.createdAt).toLocaleDateString('ru-RU')}
                                </div>
                                {x.activePromotion ? (
                                  <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                                    Продвижение активно до {formatPromoEndsAt(x.activePromotion.endsAt)}
                                  </p>
                                ) : null}
                              </div>

                              <div className="flex flex-col gap-2 lg:w-56 lg:shrink-0">
                                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                                  Продвижение · 3 дня
                                </p>
                                <div className="flex flex-col gap-2">
                                  {x.status === 'ACTIVE' ? (
                                    PROMO_TIERS.map((tier) => {
                                      const TierIcon = tier.icon;
                                      return (
                                        <button
                                          key={tier.type}
                                          type="button"
                                          onClick={() => void promote(x.id, tier.type)}
                                          className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${tier.shell}`}
                                        >
                                          <TierIcon size={22} strokeWidth={1.8} className="shrink-0" aria-hidden />
                                          <span className="min-w-0">
                                            <span className="block text-xs font-bold tracking-tight text-foreground">
                                              {tier.title}
                                            </span>
                                            <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
                                              {tier.blurb}
                                            </span>
                                          </span>
                                        </button>
                                      );
                                    })
                                  ) : (
                                    <p className="rounded-xl border border-border bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
                                      {x.status === 'PENDING'
                                        ? 'Продвижение доступно после публикации в ленте.'
                                        : x.status === 'BLOCKED'
                                          ? 'Объявление скрыто — продвижение недоступно.'
                                          : 'Продвижение только для активных лотов.'}
                                    </p>
                                  )}
                                </div>
                                {x.status === 'PENDING' ? (
                                  <button
                                    type="button"
                                    onClick={() => void publishAfterImageReview(x.id)}
                                    className="w-full rounded-xl border border-secondary/30 bg-secondary/10 py-2 text-xs font-bold text-secondary hover:bg-secondary/10"
                                  >
                                    Подтвердить публикацию в ленте
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => startEdit(x)}
                                  className="w-full rounded-xl border border-border bg-card py-2 text-xs font-semibold text-foreground hover:bg-muted/50"
                                >
                                  Редактировать
                                </button>
                                <button
                                  type="button"
                                  disabled={x.status === 'BLOCKED'}
                                  onClick={() => void setListingStatus(x.id, x.status === 'SOLD' ? 'ACTIVE' : 'SOLD')}
                                  className="w-full rounded-xl border border-border bg-card py-2 text-xs font-semibold text-foreground hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {x.status === 'SOLD' ? 'Вернуть в активные' : 'Отметить проданным'}
                                </button>
                                <button
                                  type="button"
                                  disabled={x.status === 'BLOCKED'}
                                  onClick={() =>
                                    void setListingStatus(x.id, x.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED')
                                  }
                                  className="w-full rounded-xl border border-border bg-card py-2 text-xs font-semibold text-foreground hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {x.status === 'ARCHIVED' ? 'Из архива' : 'В архив'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void removeListing(x.id)}
                                  className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-destructive/30 bg-destructive/10 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 size={16} strokeWidth={1.8} aria-hidden />
                                  Удалить
                                </button>
                              </div>
                            </div>

                            {editingId === x.id ? (
                              <div className="border-t border-border bg-card p-4">
                                <div className="mx-auto max-w-3xl space-y-3">
                                  <input
                                    value={editForm.title}
                                    onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                                    className="h-11 w-full rounded-xl border border-border bg-muted/50 px-3 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/30"
                                    placeholder="Название"
                                  />
                                  <textarea
                                    value={editForm.description}
                                    onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                                    className="min-h-24 w-full rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/30"
                                    placeholder="Описание (необязательно, от 10 символов)"
                                  />
                                  <div className="grid gap-2 sm:grid-cols-3">
                                    <input
                                      value={editForm.city}
                                      onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))}
                                      className="h-11 rounded-xl border border-border bg-muted/50 px-3 text-sm outline-none focus:border-primary/30"
                                      placeholder="Город"
                                    />
                                    <UiSelect
                                      value={editForm.categoryId}
                                      onChange={(v) => setEditForm((p) => ({ ...p, categoryId: v }))}
                                      options={categories.map((c) => ({ value: c.id, label: c.title }))}
                                      className="h-11 rounded-xl border-border bg-muted/50 px-2 text-sm"
                                      menuClassName="text-sm"
                                    />
                                    <input
                                      value={editForm.priceRub}
                                      onChange={(e) =>
                                        setEditForm((p) => ({ ...p, priceRub: e.target.value.replace(/[^\d]/g, '') }))
                                      }
                                      className="h-11 rounded-xl border border-border bg-muted/50 px-3 text-sm outline-none focus:border-primary/30"
                                      placeholder="Цена ₽"
                                    />
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => void saveEdit(x.id)}
                                      className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary"
                                    >
                                      Сохранить
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingId(null)}
                                      className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted/50"
                                    >
                                      Отмена
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function ListingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 bg-muted">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-primary/30 border-t-transparent"
            role="status"
            aria-label="Загрузка"
          />
          <p className="text-sm text-muted-foreground">Загрузка объявлений…</p>
        </div>
      }
    >
      <ListingsContent />
    </Suspense>
  );
}
