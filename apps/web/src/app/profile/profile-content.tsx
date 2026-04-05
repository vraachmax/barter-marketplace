'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Home,
  Settings,
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
    title: 'Ð¢Ð¾Ð¿',
    blurb: 'ÐÑÑÐµ Ð² Ð¾Ð±ÑÐµÐ¹ Ð»ÐµÐ½ÑÐµ',
    icon: Star,
    shell:
      'bg-white hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] dark:bg-zinc-900',
  },
  {
    type: 'VIP',
    title: 'VIP',
    blurb: 'ÐÐ¾Ð»ÑÑÐµ Ð¿Ð¾ÐºÐ°Ð·Ð¾Ð² Ð¸ Ð´Ð¾Ð²ÐµÑÐ¸Ñ',
    icon: Sparkles,
    shell:
      'bg-white hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] dark:bg-zinc-900',
  },
  {
    type: 'XL',
    title: 'XL',
    blurb: 'ÐÑÑÐ¿Ð½Ð¾Ðµ ÑÐ¾ÑÐ¾ Ð² ÑÐµÐºÐ¾Ð¼ÐµÐ½Ð´Ð°ÑÐ¸ÑÑ',
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
    const ok = window.confirm('Ð£Ð´Ð°Ð»Ð¸ÑÑ Ð¾Ð±ÑÑÐ²Ð»ÐµÐ½Ð¸Ðµ Ð±ÐµÐ·Ð²Ð¾Ð·Ð²ÑÐ°ÑÐ½Ð¾?');
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
  /** ÐÐºÑÐ¸Ð²Ð½ÑÐµ + Ð½Ð° Ð¼Ð¾Ð´ÐµÑÐ°ÑÐ¸Ð¸ (Ð²Ð¸Ð´Ð½Ñ Ð²Ð¾ Ð²ÐºÐ»Ð°Ð´ÐºÐµ Â«ÐÐºÑÐ¸Ð²Ð½ÑÐµÂ»). */
  const activeCount = listings.filter((x) => x.status === 'ACTIVE' || x.status === 'PENDING').length;
  const archivedCount = listings.filter((x) => x.status === 'ARCHIVED').length;
  const soldCount = listings.filter((x) => x.status === 'SOLD').length;
  const visibleListings = listings.filter((x) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'ACTIVE') return x.status === 'ACTIVE' || x.status === 'PENDING';
    return x.status === activeTab;
  });
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
          title: 'ÐÐ°Ð¿Ð¾Ð»Ð½Ð¸ÑÐµ Ð¿ÑÐ¾ÑÐ¸Ð»Ñ',
          hint: `Ð¡ÐµÐ¹ÑÐ°Ñ ${profileCompletion}% â Ð´Ð¾Ð±Ð°Ð²ÑÑÐµ Ð´Ð°Ð½Ð½ÑÐµ Ð´Ð»Ñ Ð´Ð¾Ð²ÐµÑÐ¸Ñ`,
          href: '/profile/settings',
        }
      : null,
    strictActiveCount === 0 && !listings.some((x) => x.status === 'PENDING')
      ? { key: 'listing', title: 'ÐÐµÑÐ²Ð¾Ðµ Ð¾Ð±ÑÑÐ²Ð»ÐµÐ½Ð¸Ðµ', hint: 'Ð Ð°Ð·Ð¼ÐµÑÑÐ¸ÑÐµ ÑÐ¾Ð²Ð°Ñ Ð¸Ð»Ð¸ ÑÑÐ»ÑÐ³Ñ', href: '/new' }
      : null,
    listings.some((x) => !x.activePromotion)
      ? { key: 'promo', title: 'ÐÑÐ¾Ð´Ð²Ð¸Ð¶ÐµÐ½Ð¸Ðµ', hint: 'TOP / VIP / XL ÑÐ²ÐµÐ»Ð¸ÑÐ¸Ð²Ð°ÑÑ Ð¾ÑÐ²Ð°Ñ', href: '/profile?tab=ACTIVE' }
      : null,
  ].filter(Boolean) as Array<{ key: string; title: string; hint: string; href: string }>;

  function statusLabel(s: MyListing['status']) {
    if (s === 'ACTIVE') return { text: 'ÐÐºÑÐ¸Ð²Ð½Ð¾', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200' };
    if (s === 'PENDING')
      return { text: 'ÐÐ¾Ð´ÐµÑÐ°ÑÐ¸Ñ', className: 'bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-800' };
    if (s === 'BLOCKED')
      return { text: 'Ð¡ÐºÑÑÑÐ¾', className: 'bg-red-50 text-red-800 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900' };
    if (s === 'SOLD') return { text: 'ÐÑÐ¾Ð´Ð°Ð½Ð¾', className: 'bg-sky-50 text-sky-800 ring-sky-200' };
    return { text: 'ÐÑÑÐ¸Ð²', className: 'bg-violet-50 text-violet-800 ring-violet-200' };
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] text-[#1a1a1a] antialiased dark:bg-zinc-950 dark:text-zinc-100">
      {/* Mobile header */}
      <header className="sticky top-0 z-20 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)] backdrop-blur-md dark:bg-zinc-950/95 md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-[#1a1a1a] dark:text-zinc-100">ÐÐ°Ð±Ð¸Ð½ÐµÑ Ð¿ÑÐ¾Ð´Ð°Ð²ÑÐ°</div>
            <div className="text-xs text-[#6b7280] dark:text-zinc-400">ÐÐ°ÑÑÐµÑ</div>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#007AFF] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0066DD]"
          >
            <Home size={18} strokeWidth={s} className="text-white" aria-hidden />
            ÐÐ° Ð³Ð»Ð°Ð²Ð½ÑÑ
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
        {status === 'loading' ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <span className="inline-block size-10 animate-spin rounded-full border-2 border-sky-500 border-t-transparent dark:border-cyan-400 dark:border-t-transparent" aria-hidden />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">ÐÐ°Ð³ÑÑÐ¶Ð°ÐµÐ¼ ÐºÐ°Ð±Ð¸Ð½ÐµÑâ¦</p>
          </div>
        ) : null}

        {status === 'need_auth' ? (
          <div className="mx-auto max-w-md py-10">
            <div className="overflow-hidden rounded-lg bg-white dark:bg-zinc-900/80">
              <div className="bg-[#E8F2FF] px-6 py-10 text-center dark:bg-sky-950/40">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg bg-white dark:bg-zinc-900">
                  <Sparkles size={32} strokeWidth={s} className="text-[#007AFF]" aria-hidden />
                </div>
                <h1 className="mt-4 text-xl font-bold text-[#1a1a1a] dark:text-zinc-100">ÐÐ°Ð±Ð¸Ð½ÐµÑ Ð¿ÑÐ¾Ð´Ð°Ð²ÑÐ°</h1>
                <p className="mt-2 text-sm text-[#6b7280] dark:text-zinc-400">ÐÐ¾Ð¹Ð´Ð¸ÑÐµ, ÑÑÐ¾Ð±Ñ ÑÐ¿ÑÐ°Ð²Ð»ÑÑÑ Ð¾Ð±ÑÑÐ²Ð»ÐµÐ½Ð¸ÑÐ¼Ð¸ Ð¸ Ð·Ð°ÐºÐ°Ð·Ð°Ð¼Ð¸.</p>
              </div>
              <div className="p-6">
                <Link
                  href="/auth"
                  className="flex h-12 w-full items-center justify-center rounded-lg bg-[#007AFF] text-sm font-semibold text-white transition hover:bg-[#0066DD]"
                >
                  ÐÐ¾Ð¹ÑÐ¸ Ð¸Ð»Ð¸ Ð·Ð°ÑÐµÐ³Ð¸ÑÑÑÐ¸ÑÐ¾Ð²Ð°ÑÑÑÑ
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {status === 'error' ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            ÐÐµ ÑÐ´Ð°Ð»Ð¾ÑÑ Ð·Ð°Ð³ÑÑÐ·Ð¸ÑÑ Ð´Ð°Ð½Ð½ÑÐµ. ÐÐ¾Ð¿ÑÐ¾Ð±ÑÐ¹ÑÐµ Ð¾Ð±Ð½Ð¾Ð²Ð¸ÑÑ ÑÑÑÐ°Ð½Ð¸ÑÑ.
          </div>
        ) : null}

        {status === 'ready' && me ? (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:items-start">
            <ProfileSidebar
              active="profile"
              activeCount={activeCount}
              archivedCount={archivedCount}
              profileName={me.name ?? me.email ?? 'ÐÑÐ¾ÑÐ¸Ð»Ñ'}
              profileAvatarUrl={avatarUrl}
              ratingAvg={publicProfile?.rating.avg ?? null}
              ratingCount={publicProfile?.rating.count ?? 0}
              sellerUserId={me.id}
              onLogout={() => void logout()}
            />

            <main className="min-w-0 space-y-6">
              {/* Desktop title */}
              <div className="hidden items-start justify-between gap-4 md:flex">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 lg:text-3xl">ÐÐ°Ð±Ð¸Ð½ÐµÑ Ð¿ÑÐ¾Ð´Ð°Ð²ÑÐ°</h1>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    ÐÐµÑÑÐ¸ÐºÐ¸, Ð·Ð°Ð´Ð°ÑÐ¸ Ð¸ ÑÐ¿ÑÐ°Ð²Ð»ÐµÐ½Ð¸Ðµ Ð»Ð¾ÑÐ°Ð¼Ð¸ Ð² Ð¾Ð´Ð½Ð¾Ð¼ Ð¼ÐµÑÑÐµ.
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#007AFF] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0066DD]"
                  >
                    <Home size={20} strokeWidth={s} className="text-white" aria-hidden />
                    ÐÐ° Ð³Ð»Ð°Ð²Ð½ÑÑ
                  </Link>
                </div>
              </div>

              {/* KPI strip â Seller Hub */}
              <div className="overflow-hidden rounded-lg bg-white dark:bg-zinc-900/80">
                <div className="bg-[#007AFF] px-5 py-4 text-white">
                  <p className="text-xs font-medium uppercase tracking-wide text-white/80">Ð¡Ð²Ð¾Ð´ÐºÐ°</p>
                  <p className="mt-1 text-lg font-bold">ÐÐ´ÑÐ°Ð²ÑÑÐ²ÑÐ¹ÑÐµ, {me.name?.split(' ')[0] ?? 'Ð¿ÑÐ¾Ð´Ð°Ð²ÐµÑ'}</p>
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
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">ÐÐºÑÐ¸Ð²Ð½ÑÐµ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setListingTab('SOLD')}
                    className={`flex flex-col items-start gap-1 px-4 py-4 text-left transition hover:bg-[#f0f9ff] dark:hover:bg-sky-950/40 ${
                      activeTab === 'SOLD' ? 'bg-[#E8F2FF] dark:bg-sky-950/50' : ''
                    }`}
                  >
                    <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{soldCount}</span>
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">ÐÑÐ¾Ð´Ð°Ð½Ð¾</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setListingTab('ARCHIVED')}
                    className={`flex flex-col items-start gap-1 px-4 py-4 text-left transition hover:bg-violet-50/50 dark:hover:bg-violet-950/40 ${
                      activeTab === 'ARCHIVED' ? 'bg-violet-50/80 dark:bg-violet-950/50' : ''
                    }`}
                  >
                    <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{archivedCount}</span>
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Ð Ð°ÑÑÐ¸Ð²Ðµ</span>
                  </button>
                  <Link
                    href="/messages"
                    className="flex flex-col items-start gap-1 px-4 py-4 transition hover:bg-[#f0f9ff] dark:hover:bg-sky-950/40"
                  >
                    <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{chatCount}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 dark:text-sky-400">
                      ÐÐ¸Ð°Ð»Ð¾Ð³Ð¸
                      <ChevronRight size={14} strokeWidth={s} aria-hidden />
                    </span>
                  </Link>
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-[#f7f7f7] px-4 py-3 dark:bg-zinc-950/50">
                    <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">ÐÑÐ¾ÑÐ¸Ð»Ñ Ð·Ð°Ð¿Ð¾Ð»Ð½ÐµÐ½</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{profileCompletion}%</span>
                      <Link href="/profile/settings" className="text-xs font-semibold text-[#007AFF] hover:underline">
                        Ð£Ð»ÑÑÑÐ¸ÑÑ
                      </Link>
                    </div>
                  </div>
                  <div className="rounded-lg bg-[#f7f7f7] px-4 py-3 dark:bg-zinc-950/50">
                    <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">ÐÐ°ÑÐµÑÑÐ²Ð¾ ÐºÐ°ÑÑÐ¾ÑÐµÐº</div>
                    <div className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">{listingQuality}%</div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">ÐÐ¾Ð»Ñ Ð¾Ð±ÑÑÐ²Ð»ÐµÐ½Ð¸Ð¹ Ñ ÑÐ¾ÑÐ¾</div>
                  </div>
                  <div className="rounded-lg bg-[#f7f7f7] px-4 py-3 dark:bg-zinc-950/50">
                    <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Ð ÐµÐ¹ÑÐ¸Ð½Ð³</div>
                    <div className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">
                      {publicProfile?.rating.avg ? publicProfile.rating.avg.toFixed(1) : 'â'}
                      <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">/5</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {publicProfile?.rating.count ?? 0} Ð¾ÑÐ·ÑÐ²Ð¾Ð²
                    </div>
                  </div>
                </div>
              </div>

              {/* Tasks */}
              {actionItems.length > 0 ? (
                <div className="rounded-lg bg-[#f0fdf9] p-4 dark:bg-emerald-950/30">
                  <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#1a1a1a] dark:text-zinc-100">
                    <Sparkles size={20} strokeWidth={s} className="text-[#FF6F00]" aria-hidden />
                    Ð ÐµÐºÐ¾Ð¼ÐµÐ½Ð´ÑÐµÐ¼ ÑÐ´ÐµÐ»Ð°ÑÑ
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
                  ÐÑÐµ Ð¾ÑÐ½Ð¾Ð²Ð½ÑÐµ Ð·Ð°Ð´Ð°ÑÐ¸ Ð²ÑÐ¿Ð¾Ð»Ð½ÐµÐ½Ñ â Ð¾ÑÐ»Ð¸ÑÐ½Ð°Ñ ÑÐ°Ð±Ð¾ÑÐ°.
                </div>
              )}

              {/* Trust badges */}
              <div className="rounded-lg bg-white p-4 dark:bg-zinc-900/80">
                <div className="mb-3 text-xs font-bold uppercase tracking-wide text-[#6b7280] dark:text-zinc-500">ÐÐ¾Ð²ÐµÑÐ¸Ðµ Ð¿Ð¾ÐºÑÐ¿Ð°ÑÐµÐ»ÐµÐ¹</div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                      hasActiveSeller
                        ? 'bg-[#f0f9ff] text-[#007AFF] border border-[#007AFF]'
                        : 'bg-[#f0f0f0] text-[#6b7280]'
                    }`}
                  >
                    <CheckCircle size={16} strokeWidth={s} aria-hidden />
                    ÐÐºÑÐ¸Ð²Ð½ÑÐ¹ Ð¿ÑÐ¾Ð´Ð°Ð²ÐµÑ
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                      hasResponsive
                        ? 'bg-[#f0f9ff] text-[#007AFF] border border-[#007AFF]'
                        : 'bg-[#f0f0f0] text-[#6b7280]'
                    }`}
                  >
                    <Clock size={16} strokeWidth={s} aria-hidden />
                    ÐÑÐ²ÐµÑÑ Ð² ÑÐ°ÑÐµ
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

              {/* Reputation â collapsible */}
              {publicProfile ? (
                <details className="group rounded-2xl border border-zinc-200 bg-white shadow-sm open:shadow-md">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-zinc-900">
                      <Eye size={20} strokeWidth={s} aria-hidden />
                      Ð ÐµÐ¿ÑÑÐ°ÑÐ¸Ñ Ð¸ Ð¾ÑÐ·ÑÐ²Ñ
                    </span>
                    <ChevronDown
                      size={18}
                      strokeWidth={s}
                      className="text-zinc-400 transition group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <div className="border-t border-zinc-100 px-4 py-4">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                        <div className="text-xs text-zinc-500">ÐÑÐ·ÑÐ²Ñ</div>
                        <div className="text-lg font-bold">{publicProfile.rating.count}</div>
                      </div>
                      <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                        <div className="text-xs text-zinc-500">ÐÐºÑÐ¸Ð²Ð½ÑÐµ Ð½Ð° Ð²Ð¸ÑÑÐ¸Ð½Ðµ</div>
                        <div className="text-lg font-bold">{publicProfile.activeListings.length}</div>
                      </div>
                      <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 md:col-span-1 col-span-2">
                        <div className="inline-flex items-center gap-1 text-xs text-zinc-500">
                          <Calendar size={14} strokeWidth={s} aria-hidden />
                          ÐÐ° Ð¿Ð»Ð¾ÑÐ°Ð´ÐºÐµ Ñ
                        </div>
                        <div className="text-lg font-bold">
                          {new Date(publicProfile.user.createdAt).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-zinc-600">
                        <FileText size={14} strokeWidth={s} aria-hidden />
                        ÐÐ¾ÑÐ»ÐµÐ´Ð½Ð¸Ðµ Ð¾ÑÐ·ÑÐ²Ñ
                      </div>
                      {publicProfile.reviews.length === 0 ? (
                        <p className="text-sm text-zinc-500">ÐÐ¾ÐºÐ° Ð½ÐµÑ Ð¾ÑÐ·ÑÐ²Ð¾Ð² Ð¾Ñ Ð¿Ð¾ÐºÑÐ¿Ð°ÑÐµÐ»ÐµÐ¹.</p>
                      ) : (
                        <ul className="space-y-2">
                          {publicProfile.reviews.slice(0, 5).map((r) => (
                            <li key={r.id} className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 text-sm">
                              <div className="flex items-center justify-between text-xs text-zinc-500">
                                <span className="font-medium text-zinc-700">{r.author.name ?? 'ÐÐ¾ÐºÑÐ¿Ð°ÑÐµÐ»Ñ'}</span>
                                <span>{new Date(r.createdAt).toLocaleDateString('ru-RU')}</span>
                              </div>
                              <div className="mt-1 font-semibold text-amber-700">â {r.rating}/5</div>
                              {r.text ? <p className="mt-1 text-zinc-700">{r.text}</p> : null}
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
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50"
                >
                  <Settings size={18} strokeWidth={s} aria-hidden />
                  ÐÐ°ÑÑÑÐ¾Ð¹ÐºÐ¸ Ð¿ÑÐ¾ÑÐ¸Ð»Ñ
                </Link>
                <Link
                  href={`/seller/${me.id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50"
                >
                  ÐÑÐ±Ð»Ð¸ÑÐ½Ð°Ñ Ð²Ð¸ÑÑÐ¸Ð½Ð°
                  <ChevronRight size={16} strokeWidth={s} className="opacity-60" aria-hidden />
                </Link>
                <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-sky-700">
                  ÐÐ° Ð³Ð»Ð°Ð²Ð½ÑÑ
                </Link>
              </div>

              {/* Listings management */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900">Ð£Ð¿ÑÐ°Ð²Ð»ÐµÐ½Ð¸Ðµ Ð¾Ð±ÑÑÐ²Ð»ÐµÐ½Ð¸ÑÐ¼Ð¸</h2>
                    <p className="text-xs text-zinc-500">ÐÑÐµÐ³Ð¾ Ð² ÐºÐ°Ð±Ð¸Ð½ÐµÑÐµ: {listings.length}</p>
                  </div>
                </div>

                {/* Segmented tabs */}
                <div className="mb-5 flex flex-wrap gap-2 rounded-xl bg-zinc-100 p-1">
                  {(
                    [
                      ['ACTIVE', 'ÐÐºÑÐ¸Ð²Ð½ÑÐµ', activeCount],
                      ['SOLD', 'ÐÑÐ¾Ð´Ð°Ð½Ð¾', soldCount],
                      ['ARCHIVED', 'ÐÑÑÐ¸Ð²', archivedCount],
                      ['ALL', 'ÐÑÐµ', listings.length],
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
                            : 'bg-white text-zinc-900 shadow-sm'
                          : 'text-zinc-600 hover:text-zinc-900'
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
                      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 py-12 text-center">
                        <p className="text-sm font-medium text-zinc-600">Ð ÑÑÐ¾Ð¼ ÑÐ°Ð·Ð´ÐµÐ»Ðµ Ð¿Ð¾ÐºÐ° Ð¿ÑÑÑÐ¾</p>
                        <Link
                          href="/new"
                          className="mt-3 inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                        >
                          Ð¡Ð¾Ð·Ð´Ð°ÑÑ Ð¾Ð±ÑÑÐ²Ð»ÐµÐ½Ð¸Ðµ
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
                                    className="line-clamp-2 text-base font-bold text-zinc-900 hover:text-sky-700 hover:underline"
                                  >
                                    {x.title}
                                  </Link>
                                  <span
                                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${st.className}`}
                                  >
                                    {st.text}
                                  </span>
                                </div>
                                <div className="mt-1 text-xl font-bold text-zinc-900">
                                  {x.priceRub != null ? `${x.priceRub.toLocaleString('ru-RU')} â½` : 'Ð¦ÐµÐ½Ð° Ð½Ðµ ÑÐºÐ°Ð·Ð°Ð½Ð°'}
                                </div>
                                <div className="mt-1 text-xs text-zinc-500">
                                  {x.city} Â· {x.category.title} Â·{' '}
                                  {new Date(x.createdAt).toLocaleDateString('ru-RU')}
                                </div>
                                {x.activePromotion ? (
                                  <p className="mt-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                                    ÐÑÐ¾Ð´Ð²Ð¸Ð¶ÐµÐ½Ð¸Ðµ Ð°ÐºÑÐ¸Ð²Ð½Ð¾ Ð´Ð¾ {formatPromoEndsAt(x.activePromotion.endsAt)}
                                  </p>
                                ) : null}
                              </div>

                              <div className="flex flex-col gap-2 lg:w-56 lg:shrink-0">
                                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
                                  ÐÑÐ¾Ð´Ð²Ð¸Ð¶ÐµÐ½Ð¸Ðµ Â· 3 Ð´Ð½Ñ
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
                                        ? 'ÐÑÐ¾Ð´Ð²Ð¸Ð¶ÐµÐ½Ð¸Ðµ Ð´Ð¾ÑÑÑÐ¿Ð½Ð¾ Ð¿Ð¾ÑÐ»Ðµ Ð¿ÑÐ±Ð»Ð¸ÐºÐ°ÑÐ¸Ð¸ Ð² Ð»ÐµÐ½ÑÐµ.'
                                        : x.status === 'BLOCKED'
                                          ? 'ÐÐ±ÑÑÐ²Ð»ÐµÐ½Ð¸Ðµ ÑÐºÑÑÑÐ¾ â Ð¿ÑÐ¾Ð´Ð²Ð¸Ð¶ÐµÐ½Ð¸Ðµ Ð½ÐµÐ´Ð¾ÑÑÑÐ¿Ð½Ð¾.'
                                          : 'ÐÑÐ¾Ð´Ð²Ð¸Ð¶ÐµÐ½Ð¸Ðµ ÑÐ¾Ð»ÑÐºÐ¾ Ð´Ð»Ñ Ð°ÐºÑÐ¸Ð²Ð½ÑÑ Ð»Ð¾ÑÐ¾Ð².'}
                                    </p>
                                  )}
                                </div>
                                {x.status === 'PENDING' ? (
                                  <button
                                    type="button"
                                    onClick={() => void publishAfterImageReview(x.id)}
                                    className="w-full rounded-xl border border-emerald-200 bg-emerald-50 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
                                  >
                                    ÐÐ¾Ð´ÑÐ²ÐµÑÐ´Ð¸ÑÑ Ð¿ÑÐ±Ð»Ð¸ÐºÐ°ÑÐ¸Ñ Ð² Ð»ÐµÐ½ÑÐµ
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => startEdit(x)}
                                  className="w-full rounded-xl border border-zinc-200 bg-white py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                                >
                                  Ð ÐµÐ´Ð°ÐºÑÐ¸ÑÐ¾Ð²Ð°ÑÑ
                                </button>
                                <button
                                  type="button"
                                  disabled={x.status === 'BLOCKED'}
                                  onClick={() => void setListingStatus(x.id, x.status === 'SOLD' ? 'ACTIVE' : 'SOLD')}
                                  className="w-full rounded-xl border border-zinc-200 bg-white py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {x.status === 'SOLD' ? 'ÐÐµÑÐ½ÑÑÑ Ð² Ð°ÐºÑÐ¸Ð²Ð½ÑÐµ' : 'ÐÑÐ¼ÐµÑÐ¸ÑÑ Ð¿ÑÐ¾Ð´Ð°Ð½Ð½ÑÐ¼'}
                                </button>
                                <button
                                  type="button"
                                  disabled={x.status === 'BLOCKED'}
                                  onClick={() =>
                                    void setListingStatus(x.id, x.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED')
                                  }
                                  className="w-full rounded-xl border border-zinc-200 bg-white py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {x.status === 'ARCHIVED' ? 'ÐÐ· Ð°ÑÑÐ¸Ð²Ð°' : 'Ð Ð°ÑÑÐ¸Ð²'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void removeListing(x.id)}
                                  className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-red-200 bg-red-50/50 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 size={16} strokeWidth={1.8} aria-hidden />
                                  Ð£Ð´Ð°Ð»Ð¸ÑÑ
                                </button>
                              </div>
                            </div>

                            {editingId === x.id ? (
                              <div className="border-t border-zinc-200 bg-white p-4">
                                <div className="mx-auto max-w-3xl space-y-3">
                                  <input
                                    value={editForm.title}
                                    onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                                    className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/15"
                                    placeholder="ÐÐ°Ð·Ð²Ð°Ð½Ð¸Ðµ"
                                  />
                                  <textarea
                                    value={editForm.description}
                                    onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                                    className="min-h-24 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/15"
                                    placeholder="ÐÐ¿Ð¸ÑÐ°Ð½Ð¸Ðµ (Ð½ÐµÐ¾Ð±ÑÐ·Ð°ÑÐµÐ»ÑÐ½Ð¾, Ð¾Ñ 10 ÑÐ¸Ð¼Ð²Ð¾Ð»Ð¾Ð²)"
                                  />
                                  <div className="grid gap-2 sm:grid-cols-3">
                                    <input
                                      value={editForm.city}
                                      onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))}
                                      className="h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none focus:border-sky-400"
                                      placeholder="ÐÐ¾ÑÐ¾Ð´"
                                    />
                                    <UiSelect
                                      value={editForm.categoryId}
                                      onChange={(v) => setEditForm((p) => ({ ...p, categoryId: v }))}
                                      options={categories.map((c) => ({ value: c.id, label: c.title }))}
                                      className="h-11 rounded-xl border-zinc-200 bg-zinc-50 px-2 text-sm"
                                      menuClassName="text-sm"
                                    />
                                    <input
                                      value={editForm.priceRub}
                                      onChange={(e) =>
                                        setEditForm((p) => ({ ...p, priceRub: e.target.value.replace(/[^\d]/g, '') }))
                                      }
                                      className="h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none focus:border-sky-400"
                                      placeholder="Ð¦ÐµÐ½Ð° â½"
                                    />
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => void saveEdit(x.id)}
                                      className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                                    >
                                      Ð¡Ð¾ÑÑÐ°Ð½Ð¸ÑÑ
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingId(null)}
                                      className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                                    >
                                      ÐÑÐ¼ÐµÐ½Ð°
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
        ) : null}
      </div>
    </div>
  );
}
