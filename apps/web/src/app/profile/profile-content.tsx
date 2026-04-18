'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  BarChart3,
  Calendar,
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
import { PromoteDialog } from '@/components/promote-dialog';

type ListingTab = 'ALL' | 'ACTIVE' | 'ARCHIVED' | 'SOLD';

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
  const [promoteTarget, setPromoteTarget] = useState<{ id: string; title: string } | null>(null);

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
      ? { key: 'promo', title: 'Продвижение', hint: 'TOP / VIP / XL увеличивают охват', href: '/listings?tab=ACTIVE' }
      : null,
  ].filter(Boolean) as Array<{ key: string; title: string; hint: string; href: string }>;

  function statusLabel(s: MyListing['status']) {
    if (s === 'ACTIVE') return { text: 'Активно', className: 'bg-secondary/10 text-secondary ring-secondary/30' };
    if (s === 'PENDING')
      return { text: 'Модерация', className: 'bg-accent/10 text-accent ring-accent/30' };
    if (s === 'BLOCKED')
      return { text: 'Скрыто', className: 'bg-destructive/10 text-destructive ring-destructive/30' };
    if (s === 'SOLD') return { text: 'Продано', className: 'bg-primary/10 text-primary ring-primary/30' };
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
          <h1 className="text-base font-bold text-[#1a1a1a]">Профиль</h1>
          <button
            type="button"
            onClick={() => router.push('/search')}
            className="inline-flex items-center justify-center rounded-lg p-2 transition hover:bg-[#f4f4f4]"
          >
            <Search size={24} strokeWidth={s} className="text-[#1a1a1a]" aria-hidden />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
        {status === 'loading' ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <span className="inline-block size-10 animate-spin rounded-full border-2 border-primary/30 border-t-transparent" aria-hidden />
            <p className="text-sm text-muted-foreground">Загружаем кабинет…</p>
          </div>
        ) : null}

        {status === 'need_auth' ? (
          <div className="mx-auto max-w-md py-10">
            <div className="overflow-hidden rounded-lg bg-card">
              <div className="bg-[#E8F2FF] px-6 py-10 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg bg-card">
                  <Sparkles size={32} strokeWidth={s} className="text-[#007AFF]" aria-hidden />
                </div>
                <h1 className="mt-4 text-xl font-bold text-[#1a1a1a]">Кабинет продавца</h1>
                <p className="mt-2 text-sm text-[#6b7280]">Войдите, чтобы управлять объявлениями и заказами.</p>
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
            {/* MOBILE SECTION (md:hidden) */}
            <div className="md:hidden">
              {showListingsView ? (
                /* ===== AVITO-STYLE LISTINGS VIEW ===== */
                <div className="pb-28">
                  {/* Tabs: Активные / Продано / Архив */}
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
                        {t.count > 0 ? (
                          <sup className="ml-0.5 text-[11px] font-semibold">{t.count}</sup>
                        ) : null}
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
                            {/* Thumbnail */}
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

                            {/* Info */}
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

                            {/* Edit button */}
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

                  {/* Sticky bottom: Разместить объявление */}
                  <div className="fixed bottom-[72px] left-0 right-0 z-50 border-t border-[#E8E8E8] bg-card px-4 py-3">
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
              <div className="rounded-2xl bg-card p-6 text-center">
                {/* Avatar with verified badge */}
                <div className="relative mb-4 inline-block">
                  <div className="h-20 w-20 rounded-full border-2 border-[#f4f4f4] overflow-hidden bg-primary">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt={me.name ?? 'Avatar'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-primary">
                        {me.name?.charAt(0)?.toUpperCase() ?? 'P'}
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 right-0 h-6 w-6 rounded-full border-2 border-white bg-secondary/10">
                    <CheckCircle size={20} strokeWidth={2} className="text-white" aria-hidden />
                  </div>
                </div>

                {/* Name */}
                <h2 className="text-lg font-bold text-[#1a1a1a]">
                  {me.name ?? me.email ?? 'Профиль'}
                </h2>

                {/* Rating */}
                <div className="mt-2 flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1">
                    {publicProfile && publicProfile.rating.avg ? (
                      <>
                        <Star size={16} className="fill-accent text-accent" aria-hidden />
                        <span className="text-sm font-semibold text-[#1a1a1a]">
                          {publicProfile.rating.avg.toFixed(1)}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm font-semibold text-muted-foreground">—</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    ({publicProfile?.rating.count ?? 0} отзывов)
                  </span>
                </div>

                {/* Stats boxes */}
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#f4f4f4] px-3 py-3">
                    <div className="text-xs font-medium text-muted-foreground">Активные</div>
                    <div className="mt-1 text-xl font-bold text-[#1a1a1a]">{activeCount}</div>
                  </div>
                  <div className="rounded-xl bg-[#f4f4f4] px-3 py-3">
                    <div className="text-xs font-medium text-muted-foreground">Продано</div>
                    <div className="mt-1 text-xl font-bold text-[#1a1a1a]">{soldCount}</div>
                  </div>
                </div>

                {/* Wallet Balance Card */}
                <div className="mt-4 rounded-xl bg-primary p-4 text-white">
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
                    className="mt-3 w-full rounded-lg bg-card px-3 py-2 text-xs font-semibold text-[#0088FF] transition hover:bg-muted"
                  >
                    Пополнить
                  </button>
                </div>
              </div>

              {/* Menu Items */}
              <div className="mt-5 space-y-2">
                <Link
                  href="/listings"
                  className="flex items-center gap-3 rounded-2xl bg-card p-4 transition hover:bg-muted/50"
                >
                  <Grid3x3 size={24} strokeWidth={1.5} className="text-[#0088FF]" aria-hidden />
                  <span className="flex-1 text-sm font-semibold text-[#1a1a1a]">Мои объявления</span>
                  <ChevronRight size={20} strokeWidth={1.5} className="text-muted-foreground" aria-hidden />
                </Link>

                <Link
                  href="/messages"
                  className="flex items-center gap-3 rounded-2xl bg-card p-4 transition hover:bg-muted/50"
                >
                  <ShoppingBag size={24} strokeWidth={1.5} className="text-[#0088FF]" aria-hidden />
                  <span className="flex-1 text-sm font-semibold text-[#1a1a1a]">Заказы</span>
                  <ChevronRight size={20} strokeWidth={1.5} className="text-muted-foreground" aria-hidden />
                </Link>

                <Link
                  href={`/seller/${me.id}?section=reviews`}
                  className="flex items-center gap-3 rounded-2xl bg-card p-4 transition hover:bg-muted/50"
                >
                  <Star size={24} strokeWidth={1.5} className="text-[#0088FF]" aria-hidden />
                  <span className="flex-1 text-sm font-semibold text-[#1a1a1a]">Отзывы</span>
                  <ChevronRight size={20} strokeWidth={1.5} className="text-muted-foreground" aria-hidden />
                </Link>

                <Link
                  href="/profile/settings"
                  className="flex items-center gap-3 rounded-2xl bg-card p-4 transition hover:bg-muted/50"
                >
                  <Settings size={24} strokeWidth={1.5} className="text-[#0088FF]" aria-hidden />
                  <span className="flex-1 text-sm font-semibold text-[#1a1a1a]">Настройки</span>
                  <ChevronRight size={20} strokeWidth={1.5} className="text-muted-foreground" aria-hidden />
                </Link>

                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 transition hover:bg-muted/50"
                >
                  <Headphones size={24} strokeWidth={1.5} className="text-[#0088FF]" aria-hidden />
                  <span className="flex-1 text-sm font-semibold text-[#1a1a1a]">Поддержка</span>
                  <ChevronRight size={20} strokeWidth={1.5} className="text-muted-foreground" aria-hidden />
                </button>

                <button
                  type="button"
                  onClick={() => void logout()}
                  className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 transition hover:bg-destructive/10"
                >
                  <LogOut size={24} strokeWidth={1.5} className="text-destructive" aria-hidden />
                  <span className="flex-1 text-sm font-semibold text-destructive">Выйти</span>
                  <ChevronRight size={20} strokeWidth={1.5} className="text-muted-foreground" aria-hidden />
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
                      <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">Кабинет продавца</h1>
                      <p className="mt-1 text-sm text-muted-foreground">
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
                  <div className="overflow-hidden rounded-lg bg-card">
                    <div className="bg-[#007AFF] px-5 py-4 text-white">
                      <p className="text-xs font-medium uppercase tracking-wide text-white/80">Сводка</p>
                      <p className="mt-1 text-lg font-bold">Здравствуйте, {me.name?.split(' ')[0] ?? 'продавец'}</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4">
                      <button
                        type="button"
                        onClick={() => setListingTab('ACTIVE')}
                        className={`flex flex-col items-start gap-1 px-4 py-4 text-left transition hover:bg-[#f0f9ff] ${
 activeTab === 'ACTIVE' ? 'bg-[#E8F2FF]' : ''
 }`}
                      >
                        <span className="text-2xl font-bold text-foreground">{activeCount}</span>
                        <span className="text-xs font-medium text-muted-foreground">Активные</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setListingTab('SOLD')}
                        className={`flex flex-col items-start gap-1 px-4 py-4 text-left transition hover:bg-[#f0f9ff] ${
 activeTab === 'SOLD' ? 'bg-[#E8F2FF]' : ''
 }`}
                      >
                        <span className="text-2xl font-bold text-foreground">{soldCount}</span>
                        <span className="text-xs font-medium text-muted-foreground">Продано</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setListingTab('ARCHIVED')}
                        className={`flex flex-col items-start gap-1 px-4 py-4 text-left transition hover:bg-accent/10 ${
 activeTab === 'ARCHIVED' ? 'bg-accent/10' : ''
 }`}
                      >
                        <span className="text-2xl font-bold text-foreground">{archivedCount}</span>
                        <span className="text-xs font-medium text-muted-foreground">В архиве</span>
                      </button>
                      <Link
                        href="/messages"
                        className="flex flex-col items-start gap-1 px-4 py-4 transition hover:bg-[#f0f9ff]"
                      >
                        <span className="text-2xl font-bold text-foreground">{chatCount}</span>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                          Диалоги
                          <ChevronRight size={14} strokeWidth={s} aria-hidden />
                        </span>
                      </Link>
                    </div>
                    <div className="grid gap-3 p-4 sm:grid-cols-3">
                      <div className="rounded-lg bg-[#f7f7f7] px-4 py-3">
                        <div className="text-xs font-medium text-muted-foreground">Профиль заполнен</div>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-xl font-bold text-foreground">{profileCompletion}%</span>
                          <Link href="/profile/settings" className="text-xs font-semibold text-[#007AFF] hover:underline">
                            Улучшить
                          </Link>
                        </div>
                      </div>
                      <div className="rounded-lg bg-[#f7f7f7] px-4 py-3">
                        <div className="text-xs font-medium text-muted-foreground">Качество карточек</div>
                        <div className="mt-1 text-xl font-bold text-foreground">{listingQuality}%</div>
                        <div className="text-[11px] text-muted-foreground">Доля объявлений с фото</div>
                      </div>
                      <div className="rounded-lg bg-[#f7f7f7] px-4 py-3">
                        <div className="text-xs font-medium text-muted-foreground">Рейтинг</div>
                        <div className="mt-1 text-xl font-bold text-foreground">
                          {publicProfile?.rating.avg ? publicProfile.rating.avg.toFixed(1) : '—'}
                          <span className="text-sm font-normal text-muted-foreground">/5</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {publicProfile?.rating.count ?? 0} отзывов
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tasks */}
                  {actionItems.length > 0 ? (
                    <div className="rounded-lg bg-[#f0fdf9] p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#1a1a1a]">
                        <Sparkles size={20} strokeWidth={s} className="text-[#FF6F00]" aria-hidden />
                        Рекомендуем сделать
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {actionItems.map((item) => (
                          <Link
                            key={item.key}
                            href={item.href}
                            className="group rounded-lg bg-card p-3 transition hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)]"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-semibold text-foreground">{item.title}</div>
                              <BarChart3 size={18} strokeWidth={s} className="opacity-70 group-hover:opacity-100" aria-hidden />
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">{item.hint}</div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm font-medium text-secondary">
                      Все основные задачи выполнены — отличная работа.
                    </div>
                  )}

                  {/* Trust badges */}
                  <div className="rounded-lg bg-card p-4">
                    <div className="mb-3 text-xs font-bold uppercase tracking-wide text-[#6b7280]">Доверие покупателей</div>
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
                    <details className="group rounded-2xl border border-border bg-card shadow-sm open:shadow-md">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
                        <span className="inline-flex items-center gap-2 text-sm font-bold text-foreground">
                          <Eye size={20} strokeWidth={s} aria-hidden />
                          Репутация и отзывы
                        </span>
                        <ChevronDown
                          size={18}
                          strokeWidth={s}
                          className="text-muted-foreground transition group-open:rotate-180"
                          aria-hidden
                        />
                      </summary>
                      <div className="border-t border-border px-4 py-4">
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                          <div className="rounded-xl border border-border bg-muted/50 p-3">
                            <div className="text-xs text-muted-foreground">Отзывы</div>
                            <div className="text-lg font-bold text-foreground">{publicProfile.rating.count}</div>
                          </div>
                          <div className="rounded-xl border border-border bg-muted/50 p-3">
                            <div className="text-xs text-muted-foreground">Активные на витрине</div>
                            <div className="text-lg font-bold text-foreground">{publicProfile.activeListings.length}</div>
                          </div>
                          <div className="rounded-xl border border-border bg-muted/50 p-3 md:col-span-1 col-span-2">
                            <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar size={14} strokeWidth={s} aria-hidden />
                              На площадке с
                            </div>
                            <div className="text-lg font-bold text-foreground">
                              {new Date(publicProfile.user.createdAt).toLocaleDateString('ru-RU')}
                            </div>
                          </div>
                        </div>
                        <div className="mt-4">
                          <div className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-muted-foreground">
                            <FileText size={14} strokeWidth={s} aria-hidden />
                            Последние отзывы
                          </div>
                          {publicProfile.reviews.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Пока нет отзывов от покупателей.</p>
                          ) : (
                            <ul className="space-y-2">
                              {publicProfile.reviews.slice(0, 5).map((r) => (
                                <li key={r.id} className="rounded-xl border border-border bg-muted/50 p-3 text-sm">
                                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground">{r.author.name ?? 'Покупатель'}</span>
                                    <span>{new Date(r.createdAt).toLocaleDateString('ru-RU')}</span>
                                  </div>
                                  <div className="mt-1 font-semibold text-accent">★ {r.rating}/5</div>
                                  {r.text ? <p className="mt-1 text-foreground">{r.text}</p> : null}
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
                      className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-muted/50"
                    >
                      <Settings size={18} strokeWidth={s} aria-hidden />
                      Настройки профиля
                    </Link>
                    <Link
                      href={`/seller/${me.id}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-muted/50"
                    >
                      Публичная витрина
                      <ChevronRight size={16} strokeWidth={s} className="opacity-60" aria-hidden />
                    </Link>
                    <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary">
                      На главную
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
                                      Продвижение
                                    </p>
                                    <div className="flex flex-col gap-2">
                                      {x.status === 'ACTIVE' ? (
                                        <button
                                          type="button"
                                          onClick={() => setPromoteTarget({ id: x.id, title: x.title })}
                                          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary/90"
                                        >
                                          <Sparkles size={16} strokeWidth={1.8} className="shrink-0" aria-hidden />
                                          <span>{x.activePromotion ? 'Продлить продвижение' : 'Продвинуть'}</span>
                                        </button>
                                      ) : (
                                        <p className="rounded-xl border border-border bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
                                          {x.status === 'PENDING'
                                            ? 'Продвижение доступно после публикации в ленте.'
                                            : x.status === 'BLOCKED'
                                              ? 'Объявление скрыто — продвижение недоступно.'
                                              : 'Продвижение только для активных лотов.'}
                                        </p>
                                      )}
                                      <Link
                                        href="/pricing"
                                        className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-[11px] font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                                      >
                                        Все пакеты и подписка
                                      </Link>
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
          <div className="relative w-full max-w-md rounded-t-3xl bg-card p-6 pb-8 shadow-xl md:rounded-3xl md:pb-6">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/30 md:hidden" />
            <h2 className="text-lg font-bold text-[#1a1a1a]">Пополнить кошелёк</h2>
            <p className="mt-1 text-sm text-muted-foreground">Выберите сумму или введите свою</p>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {[100, 300, 500, 1000, 2000, 5000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTopUpAmount(amt)}
                  className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
 topUpAmount === amt
 ? 'border-[#0088FF] bg-[#0088FF]/10 text-[#0088FF]'
 : 'border-border bg-muted/50 text-[#1a1a1a] hover:border-border'
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
                className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-[#1a1a1a] placeholder:text-muted-foreground outline-none transition focus:border-[#0088FF] focus:ring-2 focus:ring-[#0088FF]/20"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                if (topUpAmount && topUpAmount > 0) {
                  // Handle top-up logic here
                  setShowTopUp(false);
                }
              }}
              disabled={!topUpAmount || topUpAmount <= 0}
              className="mt-6 w-full rounded-lg bg-[#0088FF] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0077DD] disabled:bg-muted-foreground/30 disabled:text-muted-foreground"
            >
              Пополнить на {topUpAmount?.toLocaleString('ru-RU') ?? '—'} ₽
            </button>
          </div>
        </div>
      ) : null}

      {promoteTarget ? (
        <PromoteDialog
          open={!!promoteTarget}
          onOpenChange={(o) => {
            if (!o) setPromoteTarget(null);
          }}
          listingId={promoteTarget.id}
          listingTitle={promoteTarget.title}
          audience="PERSONAL"
          onSuccess={() => void loadMe()}
        />
      ) : null}
    </div>
  );
}