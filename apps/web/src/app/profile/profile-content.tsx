'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Calendar,
  Camera,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Grid3x3,
  Headphones,
  Home,
  LogOut,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Star,
  Trash2,
  Wallet,
  ArrowLeft,
} from 'lucide-react';

const s = 1.8;
import {
  API_URL,
  type AuthMe,
  apiFetchJson,
  apiGetJson,
  type Category,
  type ChatSummary,
  type MyListing,
  type SellerProfileResponse,
} from '@/lib/api';
import ListingPlaceholder from '@/components/listing-placeholder';
import { ProfileArchivedSection } from '@/components/profile-archived-section';
import ProfileSidebar from '@/components/profile-sidebar';
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
    shell:
      'bg-white hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] dark:bg-zinc-900',
  },
  {
    type: 'VIP',
    title: 'VIP',
    blurb: 'Больше показов и доверия',
    icon: Sparkles,
    shell:
      'bg-white hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] dark:bg-zinc-900',
  },
  {
    type: 'XL',
    title: 'XL',
    blurb: 'Крупное фото в рекомендациях',
    icon: Camera,
    shell:
      'bg-white hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] dark:bg-zinc-900',
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

export function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [me, setMe] = useState<AuthMe | null>(null);
  const [status, setStatus] = useState<'loading' | 'need_auth' | 'ready' | 'error'>('loading');
  const [listings, setListings] = useState<MyListing[]>([]);
  const [publicProfile, setPublicProfile] = useState<SellerProfileResponse | null>(null);
  const [chatCount, setChatCount] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<ListingTab>('ACTIVE');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    description: string;
    city: string;
    categoryId: string;
    priceRub: string;
  }>({
    title: '',
    description: '',
    city: '',
    categoryId: '',
    priceRub: '',
  });
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number | null>(null);

  function setListingTab(tab: ListingTab) {
    setActiveTab(tab);
    router.push(`/profile?tab=${tab}`, { scroll: false });
  }

  async function loadMe() {
    setStatus('loading');
    const [res, cats] = await Promise.all([
      apiFetchJson<AuthMe>('/auth/me'),
      apiGetJson<Category[]>('/categories').catch(() => [] as Category[]),
    ]);
    if (!res.ok) {
      if (res.status === 401) {
        setStatus('need_auth');
        return;
      }
      setStatus('error');
      return;
    }
    setMe(res.data);
    setCategories(cats);
    const [myListings, profile, chats] = await Promise.all([
      apiFetchJson<MyListing[]>('/listings/my'),
      apiGetJson<SellerProfileResponse>(`/users/${res.data.id}/profile`).catch(
        () => null as SellerProfileResponse | null,
      ),
      apiFetchJson<ChatSummary[]>('/chats'),
    ]);
    if (myListings.ok) setListings(myListings.data);
    if (chats.ok) setChatCount(chats.data.length);
    setPublicProfile(profile);
    setStatus('ready');
  }

  async function promote(id: string, type: 'TOP' | 'VIP' | 'XL') {
    const res = await apiFetchJson<{ ok: true }>(`/listings/${id}/promote`, {
      method: 'POST',
      body: JSON.stringify({ type, days: 3 }),
    });
    if (res.ok) await loadMe();
  }

  async function setListingStatus(id: string, nextStatus: 'ACTIVE' | 'SOLD' | 'ARCHIVED') {
    const res = await apiFetchJson<{ id: string; status: string }>(`/listings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) await loadMe();
  }

  async function publishAfterImageReview(id: string) {
    const res = await apiFetchJson(`/listings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ publishFromModeration: true }),
    });
    if (res.ok) await loadMe();
  }

  async function removeListing(id: string) {
    const ok = window.confirm('Удалить объявление безвозвратно?');
    if (!ok) return;
    const res = await apiFetchJson<{ ok: true }>(`/listings/${id}`, { method: 'DELETE' });
    if (res.ok) await loadMe();
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
      await loadMe();
    }
  }

  async function logout() {
    await apiFetchJson<{ ok: true }>('/auth/logout', { method: 'POST' });
    setMe(null);
    setStatus('need_auth');
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
    void loadMe();
  }, []);

  const strictActiveCount = listings.filter((x) => x.status === 'ACTIVE').length;
  /** Активные + на модерации (видны во вкладке «Активные»). */
  const activeCount = listings.filter((x) => x.status === 'ACTIVE' || x.status === 'PENDING').length;
  const archivedCount = listings.filter((x) => x.status === 'ARCHIVED').length;
  const soldCount = listings.filter((x) => x.status === 'SOLD').length;
  const visibleListings = listings.filter((x) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'ACTIVE') return x.status === 'ACTIVE' || x.status === 'PENDING';
    return x.status === activeTab;
  });
  const currentPathname = usePathname();
  const showListingsView = searchParams.get('tab') !== null || currentPathname === '/profile/listings';
  const avatarUrl = me?.avatarUrl?.startsWith('http')
    ? me.avatarUrl
    : me?.avatarUrl
      ? `${API_URL}${me.avatarUrl}`
      : null;
  const profileFields = [me?.name, me?.avatarUrl, me?.about, me?.companyName, me?.companyInfo, me?.email, me?.phone];
  const profileCompletion = Math.round(
    (profileFields.filter((x) => Boolean(String(x ?? '').trim())).length / profileFields.length) * 100,
  );
  const withImagesCount = listings.filter((x) => (x.images?.length ?? 0) > 0).length;
  const listingQuality = listings.length > 0 ? Math.round((withImagesCount / listings.length) * 100) : 0;
  const hasTopRated = Boolean((publicProfile?.rating.avg ?? 0) >= 4.8 && (publicProfile?.rating.count ?? 0) >= 5);
  const hasActiveSeller = strictActiveCount >= 3;
  const hasResponsive = chatCount >= 3;
  const actionItems = [
    profileCompletion < 100
      ? {
          key: 'profile',
          title: 'Заполните профиль',
          hint: `Сейчас ${profileCompletion}% — добавьте данные для доверия`,
          href: '/profile/settings',
        }
      : null,
    strictActiveCount === 0 && !listings.some((x) => x.status === 'PENDING')
      ? { key: 'listing', title: 'Первое объявление', hint: 'Разместите товар или услугу', href: '/new' }
      : null,
    listings.some((x) => !x.activePromotion)
      ? { key: 'promo', title: 'Продвижение', hint: 'TOP / VIP / XL увеличивают охват', href: '/profile?tab=ACTIVE' }
      : null,
  ].filter(Boolean) as Array<{ key: string; title: string; hint: string; href: string }>;

  function statusLabel(s: MyListing['status']) {
    if (s === 'ACTIVE') return { text: 'Активно', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200' };
    if (s === 'PENDING')
      return { text: 'Модерация', className: 'bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-800' };
    if (s === 'BLOCKED')
      return { text: 'Скрыто', className: 'bg-red-50 text-red-800 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900' };
    if (s === 'SOLD') return { text: 'Продано', className: 'bg-sky-50 text-sky-800 ring-sky-200' };
    return { text: 'Архив', className: 'bg-violet-50 text-violet-800 ring-violet-200' };
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4] text-[#1a1a1a] antialiased dark:bg-zinc-950 dark:text-zinc-100">
      {/* Mobile header */}
      <header className="sticky top-0 z-20 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)] backdrop-blur-md dark:bg-zinc-950/95 md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center rounded-lg p-2 transition hover:bg-[#f4f4f4] dark:hover:bg-zinc-900"
          >
            <ArrowLeft size={24} strokeWidth={s} className="text-[#1a1a1a] dark:text-zinc-100" aria-hidden />
          </button>
          <h1 className="text-base font-bold text-[#1a1a1a] dark:text-zinc-100">Профиль</h1>
          <button
            type="button"
            onClick={() => router.push('/search')}
            className="inline-flex items-center justify-center rounded-lg p-2 transition hover:bg-[#f4f4f4] dark:hover:bg-zinc-900"
          >
            <Search size={24} strokeWidth={s} className="text-[#1a1a1a] dark:text-zinc-100" aria-hidden />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
        {status === 'loading' ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <span className="inline-block size-10 animate-spin rounded-full border-2 border-sky-500 border-t-transparent dark:border-cyan-400 dark:border-t-transparent" aria-hidden />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Загружаем кабинет…</p>
          </div>
        ) : null}

        {status === 'need_auth' ? (
          <div className="mx-auto max-w-md py-10">
            <div className="overflow-hidden rounded-lg bg-white dark:bg-zinc-900/80">
              <div className="bg-[#E8F2FF] px-6 py-10 text-center dark:bg-sky-950/40">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg bg-white dark:bg-zinc-900">
                  <Sparkles size={32} strokeWidth={s} className="text-[#007AFF]" aria-hidden />
                </div>
                <h1 className="mt-4 text-xl font-bold text-[#1a1a1a] dark:text-zinc-100">Кабинет продавца</h1>
                <p className="mt-2 text-sm text-[#6b7280] dark:text-zinc-400">Войдите, чтобы управлять объявлениями и заказами.</p>
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
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            Не удалось загрузить данные. Попробуйте обновить страницу.
          </div>
        ) : null}

        {status === 'ready' && me ? (
          <>
            {/* MOBILE SECTION (md:hidden) */}
            <div className="md:hidden">
              {showListingsView ? (
                /* ===== AVITO-STYLE LISTINGS VIEW ===== */
                <div className="pb-28">
                  {/* Tabs: Активные / Продано / Архив */}
                  <div className="flex items-baseline gap-4 border-b border-[#E8E8E8] bg-white px-4 pt-3 dark:border-zinc-800 dark:bg-zinc-900/80">
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
                            ? 'font-bold text-[#1a1a1a] dark:text-zinc-100'
                            : 'font-medium text-zinc-400 dark:text-zinc-500'
                        }`}
                      >
                        {t.label}
                        {t.count > 0 ? (
                          <sup className="ml-0.5 text-[11px] font-semibold">{t.count}</sup>
                        ) : null}
                        {activeTab === t.tab ? (
                          <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[#1a1a1a] dark:bg-zinc-100" />
                        ) : null}
                      </button>
                    ))}
                  </div>

                  {/* Listings list */}
                  <div className="bg-white dark:bg-zinc-900/80">
                    {visibleListings.length === 0 ? (
                      <div className="px-4 py-16 text-center">
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
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
                          <div key={x.id} className="flex gap-3 border-b border-[#F0F0F0] px-4 py-3 dark:border-zinc-800">
                            {/* Thumbnail */}
                            <Link href={`/listing/${x.id}`} className="flex-shrink-0">
                              <div className="h-[80px] w-[80px] overflow-hidden rounded-lg bg-[#f4f4f4] dark:bg-zinc-800">
                                {thumbUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={thumbUrl} alt={x.title} className="h-full w-full object-cover" />
                                ) : (
                                  <ListingPlaceholder />
                                )}
                              </div>
                            </Link>

                            {/* Info */}
                            <div className="flex min-w-0 flex-1 flex-col justify-between">
                              <div>
                                <Link href={`/listing/${x.id}`} className="text-sm font-medium text-[#1a1a1a] dark:text-zinc-100 line-clamp-2 hover:underline">
                                  {x.title}
                                </Link>
                                <div className="mt-0.5 text-sm font-bold text-[#1a1a1a] dark:text-zinc-100">
                                  {x.priceRub != null ? `${x.priceRub.toLocaleString('ru-RU')} \u20BD` : 'Цена не указана'}
                                </div>
                              </div>
                              <div className="mt-1 flex items-center gap-3 text-[11px] text-zinc-400 dark:text-zinc-500">
                                <span>{x.city}</span>
                                <span>{statusLabel(x.status).text}</span>
                              </div>
                              {x.activePromotion ? (
                                <div className="mt-1 text-[11px] font-medium text-[#007AFF]">
                                  {x.activePromotion.type} до {formatPromoEndsAt(x.activePromotion.endsAt)}
                                </div>
                              ) : null}
                            </div>

                            {/* Edit button */}
                            <button
                              type="button"
                              onClick={() => startEdit(x)}
                              className="flex-shrink-0 self-start p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                            >
                              <FileText size={18} strokeWidth={1.5} aria-hidden />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Sticky bottom: Разместить объявление */}
                  <div className="fixed bottom-[72px] left-0 right-0 z-50 border-t border-[#E8E8E8] bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
                    <Link
                      href="/new"
                      className="flex h-12 w-full items-center justify-center rounded-xl bg-[#00AAFF] text-sm font-bold text-white transition hover:bg-[#0099EE]"
                    >
                      Разместить объявление
                    </Link>
                  </div>
                </div>
              ) : (
                /* ===== PROFILE MENU VIEW ===== */
                <>
              {/* Profile Card Section */}
              <div className="rounded-2xl bg-white p-6 text-center dark:bg-zinc-900/80">
                {/* Avatar with verified badge */}
                <div className="relative mb-4 inline-block">
                  <div className="h-20 w-20 rounded-full border-2 border-[#f4f4f4] overflow-hidden bg-gradient-to-br from-sky-200 to-cyan-200 dark:border-zinc-700 dark:from-sky-900 dark:to-cyan-900">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt={me.name ?? 'Avatar'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-sky-700 dark:text-sky-300">
                        {me.name?.charAt(0)?.toUpperCase() ?? 'P'}
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 right-0 h-6 w-6 rounded-full border-2 border-white bg-emerald-500 dark:border-zinc-900">
                    <CheckCircle size={20} strokeWidth={2} className="text-white" aria-hidden />
                  </div>
                </div>

                {/* Name */}
                <h2 className="text-lg font-bold text-[#1a1a1a] dark:text-zinc-100">
                  {me.name ?? me.email ?? 'Профиль'}
                </h2>

                {/* Rating */}
                <div className="mt-2 flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1">
                    {publicProfile && publicProfile.rating.avg ? (
                      <>
                        <Star size={16} className="fill-amber-400 text-amber-400" aria-hidden />
                        <span className="text-sm font-semibold text-[#1a1a1a] dark:text-zinc-100">
                          {publicProfile.rating.avg.toFixed(1)}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm font-semibold text-zinc-500">—</span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    ({publicProfile?.rating.count ?? 0} отзывов)
                  </span>
                </div>

                {/* Stats boxes */}
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#f4f4f4] px-3 py-3 dark:bg-zinc-800">
                    <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Активные</div>
                    <div className="mt-1 text-xl font-bold text-[#1a1a1a] dark:text-zinc-100">{activeCount}</div>
                  </div>
                  <div className="rounded-xl bg-[#f4f4f4] px-3 py-3 dark:bg-zinc-800">
                    <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Продано</div>
                    <div className="mt-1 text-xl font-bold text-[#1a1a1a] dark:text-zinc-100">{soldCount}</div>
                  </div>
                </div>

                {/* Wallet Balance Card */}
                <div className="mt-4 rounded-xl bg-gradient-to-br from-[#0088FF] to-[#0066DD] p-4 text-white">
                  <div className="flex items-start justify-between">
                    <div className="text-left">
                      <div className="text-xs font-medium opacity-80">Баланс кошелька</div>
                      <div className="mt-1 text-xl font-bold">1,500 ₽</div>
                    </div>
                    <Wallet size={24} strokeWidth={s} aria-hidden />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTopUp(true)}
                    className="mt-3 w-full rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#0088FF] transition hover:bg-slate-100"
                  >
                    Пополнить
                  </button>
                </div>
              </div>

              {/* Menu Items */}
              <div className="mt-5 space-y-2">
                <Link
                  href="/profile/listings"
                  className="flex items-center gap-3 rounded-2xl bg-white p-4 transition hover:bg-slate-50 dark:bg-zinc-900/80 dark:hover:bg-zinc-800"
                >
                  <Grid3x3 size={24} strokeWidth={1.5} className="text-[#0088FF]" aria-hidden />
                  <span className="flex-1 text-sm font-semibold text-[#1a1a1a] dark:text-zinc-100">Мои объявления</span>
                  <ChevronRight size={20} strokeWidth={1.5} className="text-zinc-400" aria-hidden />
                </Link>

                <Link
                  href="/messages"
                  className="flex items-center gap-3 rounded-2xl bg-white p-4 transition hover:bg-slate-50 dark:bg-zinc-900/80 dark:hover:bg-zinc-800"
                >
                  <ShoppingBag size={24} strokeWidth={1.5} className="text-[#0088FF]" aria-hidden />
                  <span className="flex-1 text-sm font-semibold text-[#1a1a1a] dark:text-zinc-100">Заказы</span>
                  <ChevronRight size={20} strokeWidth={1.5} className="text-zinc-400" aria-hidden />
                </Link>

                <Link
                  href={`/seller/${me.id}?section=reviews`}
                  className="flex items-center gap-3 rounded-2xl bg-white p-4 transition hover:bg-slate-50 dark:bg-zinc-900/80 dark:hover:bg-zinc-800"
                >
                  <Star size={24} strokeWidth={1.5} className="text-[#0088FF]" aria-hidden />
                  <span className="flex-1 text-sm font-semibold text-[#1a1a1a] dark:text-zinc-100">Отзывы</span>
                  <ChevronRight size={20} strokeWidth={1.5} className="text-zinc-400" aria-hidden />
                </Link>

                <Link
                  href="/profile/settings"
                  className="flex items-center gap-3 rounded-2xl bg-white p-4 transition hover:bg-slate-50 dark:bg-zinc-900/80 dark:hover:bg-zinc-800"
                >
                  <Settings size={24} strokeWidth={1.5} className="text-[#0088FF]" aria-hidden />
                  <span className="flex-1 text-sm font-semibold text-[#1a1a1a] dark:text-zinc-100">Настройки</span>
                  <ChevronRight size={20} strokeWidth={1.5} className="text-zinc-400" aria-hidden />
                </Link>

                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 transition hover:bg-slate-50 dark:bg-zinc-900/80 dark:hover:bg-zinc-800"
                >
                  <Headphones size={24} strokeWidth={1.5} className="text-[#0088FF]" aria-hidden />
                  <span className="flex-1 text-sm font-semibold text-[#1a1a1a] dark:text-zinc-100">Поддержка</span>
                  <ChevronRight size={20} strokeWidth={1.5} className="text-zinc-400" aria-hidden />
                </button>

                <button
                  type="button"
                  onClick={() => void logout()}
                  className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 transition hover:bg-red-50 dark:bg-zinc-900/80 dark:hover:bg-red-950/20"
                >
                  <LogOut size={24} strokeWidth={1.5} className="text-red-500" aria-hidden />
                  <span className="flex-1 text-sm font-semibold text-red-500">Выйти</span>
                  <ChevronRight size={20} strokeWidth={1.5} className="text-zinc-400" aria-hidden />
                </button>
              </div>
                </>
              )}
            </div>

            {/* DESKTOP SECTION (hidden md:block) */}
            <div className="hidden md:block">
              <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:items-start">
                <ProfileSidebar
                  active="profile"
                  activeCount={activeCount}
                  archivedCount={archivedCount}
                  profileName={me.name ?? me.email ?? 'Профиль'}
                  profileAvatarUrl={avatarUrl}
                  ratingAvg={publicProfile?.rating.avg ?? null}
                  ratingCount={publicProfile?.rating.count ?? 0}
                  sellerUserId={me.id}
                  onLogout={() => void logout()}
                />

                <main className="min-w-0 space-y-6">
                  {/* Desktop title */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 lg:text-3xl">Кабинет продавца</h1>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Метрики, задачи и управление лотами в одном месте.
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-2">
                      <Link
                        href="/"
                        className="inline-flex items-center gap-2 rounded-lg bg-[#007AFF] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0066DD]"
                      >
                        <Home size={20} strokeWidth={s} className="text-white" aria-hidden />
                        На главную
                      </Link>
                    </div>
                  </div>

                  {/* KPI strip — Seller Hub */}
                  <div className="overflow-hidden rounded-lg bg-white dark:bg-zinc-900/80">
                    <div className="bg-[#007AFF] px-5 py-4 text-white">
                      <p className="text-xs font-medium uppercase tracking-wide text-white/80">Сводка</p>
                      <p className="mt-1 text-lg font-bold">Здравствуйте, {me.name?.split(' ')[0] ?? 'продавец'}</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4">
                      <button
                        type="button"
                        onClick={() => setListingTab('ACTIVE')}
                        className={`flex flex-col items-start gap-1 px-4 py-4 text-left transition hover:bg-[#f0f9ff] dark:hover:bg-sky-950/40 ${
                          activeTab === 'ACTIVE' ? 'bg-[#E8F2FF] dark:bg-sky-950/50' : ''
                        }`}
                      >
                        <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{activeCount}</span>
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Активные</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setListingTab('SOLD')}
                        className={`flex flex-col items-start gap-1 px-4 py-4 text-left transition hover:bg-[#f0f9ff] dark:hover:bg-sky-950/40 ${
                          activeTab === 'SOLD' ? 'bg-[#E8F2FF] dark:bg-sky-950/50' : ''
                        }`}
                      >
                        <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{soldCount}</span>
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Продано</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setListingTab('ARCHIVED')}
                        className={`flex flex-col items-start gap-1 px-4 py-4 text-left transition hover:bg-violet-50/50 dark:hover:bg-violet-950/40 ${
                          activeTab === 'ARCHIVED' ? 'bg-violet-50/80 dark:bg-violet-950/50' : ''
                        }`}
                      >
                        <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{archivedCount}</span>
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">В архиве</span>
                      </button>
                      <Link
                        href="/messages"
                        className="flex flex-col items-start gap-1 px-4 py-4 transition hover:bg-[#f0f9ff] dark:hover:bg-sky-950/40"
                      >
                        <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{chatCount}</span>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 dark:text-sky-400">
                          Диалоги
                          <ChevronRight size={14} strokeWidth={s} aria-hidden />
                        </span>
                      </Link>
                    </div>
                    <div className="grid gap-3 p-4 sm:grid-cols-3">
                      <div className="rounded-lg bg-[#f7f7f7] px-4 py-3 dark:bg-zinc-950/50">
                        <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Профиль заполнен</div>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{profileCompletion}%</span>
                          <Link href="/profile/settings" className="text-xs font-semibold text-[#007AFF] hover:underline">
                            Улучшить
                          </Link>
                        </div>
                      </div>
                      <div className="rounded-lg bg-[#f7f7f7] px-4 py-3 dark:bg-zinc-950/50">
                        <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Качество карточек</div>
                        <div className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">{listingQuality}%</div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Доля объявлений с фото</div>
                      </div>
                      <div className="rounded-lg bg-[#f7f7f7] px-4 py-3 dark:bg-zinc-950/50">
                        <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Рейтинг</div>
                        <div className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">
                          {publicProfile?.rating.avg ? publicProfile.rating.avg.toFixed(1) : '—'}
                          <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">/5</span>
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {publicProfile?.rating.count ?? 0} отзывов
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tasks */}
                  {actionItems.length > 0 ? (
                    <div className="rounded-lg bg-[#f0fdf9] p-4 dark:bg-emerald-950/30">
                      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#1a1a1a] dark:text-zinc-100">
                        <Sparkles size={20} strokeWidth={s} className="text-[#FF6F00]" aria-hidden />
                        Рекомендуем сделать
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {actionItems.map((item) => (
                          <Link
                            key={item.key}
                            href={item.href}
                            className="group rounded-lg bg-white p-3 transition hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] dark:bg-zinc-900/80"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</div>
                              <BarChart3 size={18} strokeWidth={s} className="opacity-70 group-hover:opacity-100" aria-hidden />
                            </div>
                            <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{item.hint}</div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm font-medium text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
                      Все основные задачи выполнены — отличная работа.
                    </div>
                  )}

                  {/* Trust badges */}
                  <div className="rounded-lg bg-white p-4 dark:bg-zinc-900/80">
                    <div className="mb-3 text-xs font-bold uppercase tracking-wide text-[#6b7280] dark:text-zinc-500">Доверие покупателей</div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                          hasActiveSeller
                            ? 'bg-[#f0f9ff] text-[#007AFF] border border-[#007AFF]'
                            : 'bg-[#f0f0f0] text-[#6b7280]'
                        }`}
                      >
                        <CheckCircle size={16} strokeWidth={s} aria-hidden />
                        Активный продавец
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                          hasResponsive
                            ? 'bg-[#f0f9ff] text-[#007AFF] border border-[#007AFF]'
                            : 'bg-[#f0f0f0] text-[#6b7280]'
                        }`}
                      >
                        <Clock size={16} strokeWidth={s} aria-hidden />
                        Ответы в чате
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                          hasTopRated
                            ? 'bg-[#FFD166] text-[#1a1a1a]'
                            : 'bg-[#f0f0f0] text-[#6b7280]'
                        }`}
                      >
                        <Star size={16} strokeWidth={s} fill="currentColor" aria-hidden />
                        Top Rated
                      </span>
                    </div>
                  </div>

                  {/* Reputation — collapsible */}
                  {publicProfile ? (
                    <details className="group rounded-2xl border border-zinc-200 bg-white shadow-sm open:shadow-md dark:border-zinc-700 dark:bg-zinc-900/80">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
                        <span className="inline-flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          <Eye size={20} strokeWidth={s} aria-hidden />
                          Репутация и отзывы
                        </span>
                        <ChevronDown
                          size={18}
                          strokeWidth={s}
                          className="text-zinc-400 transition group-open:rotate-180"
                          aria-hidden
                        />
                      </summary>
                      <div className="border-t border-zinc-100 px-4 py-4 dark:border-zinc-700">
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">Отзывы</div>
                            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{publicProfile.rating.count}</div>
                          </div>
                          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">Активные на витрине</div>
                            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{publicProfile.activeListings.length}</div>
                          </div>
                          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800 md:col-span-1 col-span-2">
                            <div className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                              <Calendar size={14} strokeWidth={s} aria-hidden />
                              На площадке с
                            </div>
                            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                              {new Date(publicProfile.user.createdAt).toLocaleDateString('ru-RU')}
                            </div>
                          </div>
                        </div>
                        <div className="mt-4">
                          <div className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-zinc-600 dark:text-zinc-400">
                            <FileText size={14} strokeWidth={s} aria-hidden />
                            Последние отзывы
                          </div>
                          {publicProfile.reviews.length === 0 ? (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">Пока нет отзывов от покупателей.</p>
                          ) : (
                            <ul className="space-y-2">
                              {publicProfile.reviews.slice(0, 5).map((r) => (
                                <li key={r.id} className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-800">
                                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                                    <span className="font-medium text-zinc-700 dark:text-zinc-300">{r.author.name ?? 'Покупатель'}</span>
                                    <span>{new Date(r.createdAt).toLocaleDateString('ru-RU')}</span>
                                  </div>
                                  <div className="mt-1 font-semibold text-amber-700 dark:text-amber-400">★ {r.rating}/5</div>
                                  {r.text ? <p className="mt-1 text-zinc-700 dark:text-zinc-300">{r.text}</p> : null}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </details>
                  ) : null}

                  {/* Quick links row */}
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="/profile/settings"
                      className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      <Settings size={18} strokeWidth={s} aria-hidden />
                      Настройки профиля
                    </Link>
                    <Link
                      href={`/seller/${me.id}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      Публичная витрина
                      <ChevronRight size={16} strokeWidth={s} className="opacity-60" aria-hidden />
                    </Link>
                    <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-sky-700 dark:text-zinc-400 dark:hover:text-sky-400">
                      На главную
                    </Link>
                  </div>

                  {/* Listings management */}
                  <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80 sm:p-5">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Управление объявлениями</h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Всего в кабинете: {listings.length}</p>
                      </div>
                    </div>

                    {/* Segmented tabs */}
                    <div className="mb-5 flex flex-wrap gap-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
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
                                ? 'bg-violet-900 text-white shadow-sm'
                                : 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100'
                              : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
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
                          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 py-12 text-center dark:border-zinc-600 dark:bg-zinc-800">
                            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">В этом разделе пока пусто</p>
                            <Link
                              href="/new"
                              className="mt-3 inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
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
                                className="rounded-2xl border border-zinc-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-zinc-800/90 dark:bg-zinc-950"
                              >
                                <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-stretch">
                                  <div
                                    className={`listing-thumb-wrap relative h-28 w-full shrink-0 overflow-hidden rounded-xl border border-zinc-200/90 dark:border-zinc-700 sm:h-32 lg:h-[100px] lg:w-[140px] ${listingThumbPromoExtraClass(x.activePromotion?.type ?? null)}`.trim()}
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
                                        className="line-clamp-2 text-base font-bold text-zinc-900 hover:text-sky-700 hover:underline dark:text-zinc-100"
                                      >
                                        {x.title}
                                      </Link>
                                      <span
                                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${st.className}`}
                                      >
                                        {st.text}
                                      </span>
                                    </div>
                                    <div className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">
                                      {x.priceRub != null ? `${x.priceRub.toLocaleString('ru-RU')} ₽` : 'Цена не указана'}
                                    </div>
                                    <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                      {x.city} · {x.category.title} ·{' '}
                                      {new Date(x.createdAt).toLocaleDateString('ru-RU')}
                                    </div>
                                    {x.activePromotion ? (
                                      <p className="mt-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                                        Продвижение активно до {formatPromoEndsAt(x.activePromotion.endsAt)}
                                      </p>
                                    ) : null}
                                  </div>

                                  <div className="flex flex-col gap-2 lg:w-56 lg:shrink-0">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
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
                                              <span className="block text-xs font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                                                {tier.title}
                                              </span>
                                              <span className="mt-0.5 block text-[10px] leading-snug text-zinc-600 dark:text-zinc-400">
                                                {tier.blurb}
                                              </span>
                                            </span>
                                          </button>
                                        );
                                        })
                                      ) : (
                                        <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
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
                                        className="w-full rounded-xl border border-emerald-200 bg-emerald-50 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
                                      >
                                        Подтвердить публикацию в ленте
                                      </button>
                                    ) : null}
                                    <button
                                      type="button"
                                      onClick={() => startEdit(x)}
                                      className="w-full rounded-xl border border-zinc-200 bg-white py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                    >
                                      Редактировать
                                    </button>
                                    <button
                                      type="button"
                                      disabled={x.status === 'BLOCKED'}
                                      onClick={() => void setListingStatus(x.id, x.status === 'SOLD' ? 'ACTIVE' : 'SOLD')}
                                      className="w-full rounded-xl border border-zinc-200 bg-white py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                    >
                                      {x.status === 'SOLD' ? 'Вернуть в активные' : 'Отметить проданным'}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={x.status === 'BLOCKED'}
                                      onClick={() =>
                                        void setListingStatus(x.id, x.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED')
                                      }
                                      className="w-full rounded-xl border border-zinc-200 bg-white py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                    >
                                      {x.status === 'ARCHIVED' ? 'Из архива' : 'В архив'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void removeListing(x.id)}
                                      className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-red-200 bg-red-50/50 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
                                    >
                                      <Trash2 size={16} strokeWidth={1.8} aria-hidden />
                                      Удалить
                                    </button>
                                  </div>
                                </div>

                                {editingId === x.id ? (
                                  <div className="border-t border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950">
                                    <div className="mx-auto max-w-3xl space-y-3">
                                      <input
                                        value={editForm.title}
                                        onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                                        className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/15 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                                        placeholder="Название"
                                      />
                                      <textarea
                                        value={editForm.description}
                                        onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                                        className="min-h-24 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/15 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                                        placeholder="Описание (необязательно, от 10 символов)"
                                      />
                                      <div className="grid gap-2 sm:grid-cols-3">
                                        <input
                                          value={editForm.city}
                                          onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))}
                                          className="h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none focus:border-sky-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                                          placeholder="Город"
                                        />
                                        <UiSelect
                                          value={editForm.categoryId}
                                          onChange={(v) => setEditForm((p) => ({ ...p, categoryId: v }))}
                                          options={categories.map((c) => ({ value: c.id, label: c.title }))}
                                          className="h-11 rounded-xl border-zinc-200 bg-zinc-50 px-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                                          menuClassName="text-sm"
                                        />
                                        <input
                                          value={editForm.priceRub}
                                          onChange={(e) =>
                                            setEditForm((p) => ({ ...p, priceRub: e.target.value.replace(/[^\d]/g, '') }))
                                          }
                                          className="h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none focus:border-sky-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                                          placeholder="Цена ₽"
                                        />
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        <button
                                          type="button"
                                          onClick={() => void saveEdit(x.id)}
                                          className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                                        >
                                          Сохранить
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingId(null)}
                                          className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
                </main>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Top-Up Modal */}
      {showTopUp ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowTopUp(false)} />
          <div className="relative w-full max-w-md rounded-t-3xl bg-white p-6 pb-8 shadow-xl dark:bg-zinc-900 md:rounded-3xl md:pb-6">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700 md:hidden" />
            <h2 className="text-lg font-bold text-[#1a1a1a] dark:text-zinc-100">Пополнить кошелёк</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Выберите сумму или введите свою</p>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {[100, 300, 500, 1000, 2000, 5000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTopUpAmount(amt)}
                  className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                    topUpAmount === amt
                      ? 'border-[#0088FF] bg-[#0088FF]/10 text-[#0088FF]'
                      : 'border-zinc-200 bg-zinc-50 text-[#1a1a1a] hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-zinc-600'
                  }`}
                >
                  {amt.toLocaleString('ru-RU')} ₽
                </button>
              ))}
            </div>

            <div className="mt-4">
              <input
                type="number"
                placeholder="Другая сумма"
                min={1}
                value={topUpAmount && ![100, 300, 500, 1000, 2000, 5000].includes(topUpAmount) ? topUpAmount : ''}
                onChange={(e) => setTopUpAmount(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-[#1a1a1a] placeholder-zinc-400 outline-none transition focus:border-[#0088FF] focus:ring-2 focus:ring-[#0088FF]/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
              />
            </div>

            <button
              type="button"
              disabled={!topUpAmount || topUpAmount <= 0}
              onClick={() => {
                /* TODO: integrate payment API */
                setShowTopUp(false);
                setTopUpAmount(null);
              }}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-[#0088FF] to-[#0066DD] py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-600/25 transition hover:from-sky-700 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {topUpAmount && topUpAmount > 0
                ? `Пополнить на ${topUpAmount.toLocaleString('ru-RU')} ₽`
                : 'Выберите сумму'}
            </button>

            <button
              type="button"
              onClick={() => { setShowTopUp(false); setTopUpAmount(null); }}
              className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Отмена
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
