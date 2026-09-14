'use client';

import Link from 'next/link';
import { useListingActions } from '@/lib/use-listing-actions';
import { Card } from '@/components/ui/card';
import { AccountScreenHeader } from '@/components/account-screen-header';
import { useAuth } from '@/components/auth-provider';
import { ListingEditorDialog } from '@/components/listing-editor-dialog';
import { canOfferBarter } from '@/lib/barter-category';
import { Button } from '@/components/ui/button';
import { ListingManagementActions } from '@/components/listing-management-actions';
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
  LogOut,
  Settings,
  ShoppingBag,
  Sparkles,
  Star,
  Wallet,
} from 'lucide-react';

const s = 1.8;
import {
  type AuthMe,
  apiFetchJson,
  apiGetJson,
  resolveAssetUrl,
  type Category,
  type ChatSummary,
  type MyListing,
  type SellerProfileResponse,
} from '@/lib/api';
import ListingPlaceholder from '@/components/listing-placeholder';
import { ProfileArchivedSection } from '@/components/profile-archived-section';
import ProfileSidebar from '@/components/profile-sidebar';
import { listingThumbPromoExtraClass } from '@/lib/listing-card-visuals';
import { PromoteDialog } from '@/components/promote-dialog';
import { SupportSheet } from '@/components/support-sheet';

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
  const { logout: logoutAccount } = useAuth();
  const { busy: actionBusy, notice: actionNotice, error: actionError, needsLogin: actionNeedsLogin, performAction } = useListingActions(loadMe);
  const [supportSheetOpen, setSupportSheetOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [me, setMe] = useState<AuthMe | null>(null);
  const [status, setStatus] = useState<'loading' | 'need_auth' | 'ready' | 'error'>('loading');
  const [listings, setListings] = useState<MyListing[]>([]);
  const [publicProfile, setPublicProfile] = useState<SellerProfileResponse | null>(null);
  const [chatCount, setChatCount] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const tabParam = searchParams.get('tab');
  const activeTab: ListingTab = tabParam === 'ALL' || tabParam === 'SOLD' || tabParam === 'ARCHIVED' ? tabParam : 'ACTIVE';
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    description: string;
    city: string;
    categoryId: string;
    priceRub: string;
    isBarter: boolean;
  }>({
    title: '',
    description: '',
    city: '',
    categoryId: '',
    priceRub: '',
    isBarter: false,
  });
  const [promoteTarget, setPromoteTarget] = useState<{ id: string; title: string } | null>(null);

  function setListingTab(tab: ListingTab) {
    router.push(`/profile/listings?tab=${tab}`, { scroll: false });
  }

  async function loadMe(): Promise<boolean> {
    const signal = AbortSignal.timeout(20000);
    const [res, cats] = await Promise.all([
      apiFetchJson<AuthMe>('/auth/me', { signal }),
      apiGetJson<Category[]>('/categories', { signal }).catch(() => [] as Category[]),
    ]);
    if (!res.ok) {
      if (res.status === 401) {
        setStatus('need_auth');
        return false;
      }
      setStatus('error');
      return false;
    }
    setMe(res.data);
    setCategories(cats);
    const [myListings, profile, chats] = await Promise.all([
      apiFetchJson<MyListing[]>('/listings/my', { signal }),
      apiGetJson<SellerProfileResponse>(`/users/${res.data.id}/profile`, { signal }).catch(
        () => null as SellerProfileResponse | null,
      ),
      apiFetchJson<ChatSummary[]>('/chats', { signal }),
    ]);
    if (myListings.ok) setListings(myListings.data);
    else {
      setStatus(myListings.status === 401 ? 'need_auth' : 'error');
      return false;
    }
    if (chats.ok) setChatCount(chats.data.length);
    setPublicProfile(profile);
    setStatus('ready');
    return true;
  }

  async function setListingStatus(id: string, nextStatus: 'ACTIVE' | 'SOLD' | 'ARCHIVED') {
    await performAction(`/listings/${encodeURIComponent(id)}/status`, {
      method: 'PATCH', body: JSON.stringify({ status: nextStatus }),
    });
  }

  async function publishAfterImageReview(id: string) {
    await performAction(`/listings/${encodeURIComponent(id)}`, {
      method: 'PATCH', body: JSON.stringify({ publishFromModeration: true }),
    });
  }

  async function removeListing(id: string) {
    if (actionBusy || !window.confirm('Удалить объявление безвозвратно?')) return;
    await performAction(`/listings/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  function startEdit(x: MyListing) {
    setEditingId(x.id);
    setEditForm({
      title: x.title,
      description: '',
      city: x.city,
      categoryId: x.category.id,
      priceRub: x.priceRub == null ? '' : String(x.priceRub),
      isBarter: x.attributes?.isBarter === true,
    });
  }

  async function saveEdit(id: string) {
    const category = categories.find((item) => item.id === editForm.categoryId);
    if (!category) return false;
    const payload: Record<string, unknown> = {
      title: editForm.title.trim(),
      city: editForm.city.trim(),
      categoryId: editForm.categoryId,
      attributes: { ...listings.find((item) => item.id === id)?.attributes, isBarter: canOfferBarter(category) && editForm.isBarter },
    };
    if (editForm.description.trim().length >= 10) payload.description = editForm.description.trim();
    payload.priceRub = editForm.priceRub.trim() ? Number(editForm.priceRub) : null;

    return performAction(`/listings/${encodeURIComponent(id)}`, {
      method: 'PATCH', body: JSON.stringify(payload),
    }, () => setEditingId(null));
  }

  async function logout() {
    if (actionBusy) return;
    await logoutAccount();
    setMe(null);
    setStatus('need_auth');
  }

  useEffect(() => {
    // loadMe updates state only after awaiting the initial API requests.
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
  const avatarUrl = resolveAssetUrl(me?.avatarUrl);
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
    // Статус-чипы — семантика, но не палитра бренда:
    //  — ACTIVE → success (всегда зелёный, вне зависимости от режима)
    //  — PENDING / SOLD → mode-accent (синий в Маркете, оранжевый в Бартере)
    //  — BLOCKED → destructive (всегда красный)
    //  — ARCHIVED → muted (всегда нейтральный серый)
    if (s === 'ACTIVE') return { text: 'Активно', className: 'bg-success/10 text-success ring-success/30' };
    if (s === 'PENDING')
      return {
        text: 'Модерация',
        className: 'ring-1 [background-color:var(--mode-accent-soft)] [color:var(--mode-accent)] [--tw-ring-color:var(--mode-accent-ring)]',
      };
    if (s === 'BLOCKED')
      return { text: 'Скрыто', className: 'bg-destructive/10 text-destructive ring-destructive/30' };
    if (s === 'SOLD')
      return {
        text: 'Продано',
        className: 'ring-1 [background-color:var(--mode-accent-soft)] [color:var(--mode-accent)] [--tw-ring-color:var(--mode-accent-ring)]',
      };
    return { text: 'Архив', className: 'bg-muted text-muted-foreground ring-border' };
  }

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <AccountScreenHeader
        title={showListingsView ? 'Мои объявления' : 'Профиль'}
        subtitle={showListingsView ? 'Публикация и управление объявлениями' : 'Ваш аккаунт и активность'}
        backHref={showListingsView ? '/profile' : '/'}
        backLabel={showListingsView ? 'Назад в профиль' : 'Назад в ленту'}
        width="catalog"
      />


      <div className="mx-auto max-w-7xl px-4 pt-6 pb-32 md:px-6 lg:pt-8">
        {actionNotice ? (
          <div role={actionError ? 'alert' : 'status'} aria-live="polite" className="sticky top-16 z-30 mb-4 rounded-2xl border border-border bg-card p-4 text-sm text-foreground shadow-sm">
            <p>{actionNotice}</p>
            {actionNeedsLogin ? <Link href="/auth?next=%2Fprofile" className="mt-2 inline-flex min-h-11 items-center text-primary underline">Войти снова</Link> : null}
            {actionError && !actionNeedsLogin ? <Button variant="outline" className="mt-2 min-h-11" disabled={actionBusy} onClick={() => void loadMe()}>Обновить список</Button> : null}
          </div>
        ) : null}
        {status === 'loading' ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <span
              className="inline-block size-10 animate-spin rounded-full border-2 [border-color:var(--mode-accent-ring)] !border-t-transparent motion-reduce:animate-none"
              aria-hidden
            />
            <p className="text-sm text-muted-foreground">Загружаем кабинет…</p>
          </div>
        ) : null}

        {status === 'need_auth' ? (
          <div className="mx-auto max-w-md py-10">
            <div className="overflow-hidden rounded-3xl border border-border bg-card">
              <div className="[background-color:var(--mode-accent-soft)] px-6 py-10 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg bg-card">
                  <Sparkles size={32} strokeWidth={s} className="[color:var(--mode-accent)]" aria-hidden />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-foreground">Кабинет продавца</h2>
                <p className="mt-2 text-sm text-muted-foreground">Войдите, чтобы управлять объявлениями и заказами.</p>
              </div>
              <div className="p-6">
                <Link
                  href={`/auth?next=${encodeURIComponent(showListingsView ? `/profile/listings?tab=${activeTab}` : '/profile')}`}
                  className="flex min-h-13 w-full items-center justify-center rounded-full bg-primary px-4 text-center text-base font-semibold text-primary-foreground transition hover:bg-primary-hover"
                >
                  Войти или зарегистрироваться
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {status === 'error' ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
            <p>Не удалось загрузить данные.</p>
            <Button variant="outline" className="mt-3 min-h-11" onClick={() => void loadMe()}>Повторить</Button>
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
                  <div className="glass-panel flex flex-wrap gap-3 rounded-2xl border border-border px-4 pt-3">
                    {([
                      { tab: 'ACTIVE' as ListingTab, label: 'Активные', count: activeCount },
                      { tab: 'SOLD' as ListingTab, label: 'Продано', count: soldCount },
                      { tab: 'ARCHIVED' as ListingTab, label: 'Архив', count: archivedCount },
                    ] as const).map((t) => (
                      <Button variant="ghost"
                        key={t.tab}
                        type="button"
                        onClick={() => setListingTab(t.tab)}
                        aria-pressed={activeTab === t.tab}
                        className={`min-h-11 relative pb-3 text-base transition ${
 activeTab === t.tab
 ? 'font-bold text-foreground'
 : 'font-medium text-muted-foreground'
 }`}
                      >
                        {t.label}
                        {t.count > 0 ? (
                          <sup className="ml-0.5 text-[11px] font-semibold">{t.count}</sup>
                        ) : null}
                        {activeTab === t.tab ? (
                          <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full [background-color:var(--mode-accent)]" />
                        ) : null}
                      </Button>
                    ))}
                  </div>

                  {/* Listings list */}
                  <div className="mt-4 space-y-3">
                    {visibleListings.length === 0 ? (
                      <div className="px-4 py-16 text-center">
                        <p className="text-sm text-muted-foreground">
                          {activeTab === 'ACTIVE' ? 'Нет активных объявлений' : activeTab === 'SOLD' ? 'Нет проданных' : 'Архив пуст'}
                        </p>
                      </div>
                    ) : (
                      visibleListings.map((x) => {
                        const thumbImg = x.images?.[0];
                        const thumbUrl = resolveAssetUrl(thumbImg?.url);
                        return (
                          <div key={x.id} className="flex flex-wrap gap-3 rounded-3xl border border-border bg-card p-4 shadow-sm">
                            {/* Thumbnail */}
                            <Link href={`/listing/${x.id}`} className="flex-shrink-0">
                              <div className="h-24 w-24 overflow-hidden rounded-2xl bg-muted">
                                {thumbUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={thumbUrl} alt={x.title} className="h-full w-full object-cover" />
                                ) : (
                                  <ListingPlaceholder title={x.title} categoryTitle={x.category.title} className="h-full w-full rounded-none border-0" />
                                )}
                              </div>
                            </Link>

                            {/* Info */}
                            <div className="flex min-w-0 flex-1 flex-col justify-between">
                              <div>
                                <Link href={`/listing/${x.id}`} className="text-sm font-medium text-foreground line-clamp-2 hover:underline">
                                  {x.title}
                                </Link>
                                <div className="mt-0.5 text-sm font-bold text-foreground">
                                  {x.priceRub != null ? `${x.priceRub.toLocaleString('ru-RU')} \u20BD` : 'Цена не указана'}
                                </div>
                              </div>
                              <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                                <span>{x.city}</span>
                                <span>{statusLabel(x.status).text}</span>
                              </div>
                              {x.activePromotion ? (
                                <div className="mt-1 text-[11px] font-medium [color:var(--mode-accent)]">
                                  {x.activePromotion.type} до {formatPromoEndsAt(x.activePromotion.endsAt)}
                                </div>
                              ) : null}
                            </div>

                            {/* Edit button */}
                            <Button variant="ghost" size="icon"
                              type="button"
                              onClick={() => startEdit(x)}
                              aria-label={`Редактировать: ${x.title}`}
                              className="inline-flex size-11 shrink-0 items-center justify-center self-start rounded-full bg-muted text-muted-foreground hover:text-foreground"
                            >
                              <FileText size={18} strokeWidth={1.5} aria-hidden />
                            </Button>
                            <details className="basis-full border-t border-border pt-2">
                              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-full px-3 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring">
                                Действия с объявлением<ChevronDown size={18} aria-hidden />
                              </summary>
                              <div className="pt-2">
                                <ListingManagementActions listing={x} busy={actionBusy} onEdit={() => startEdit(x)} onPromote={() => setPromoteTarget({ id: x.id, title: x.title })} onPublish={() => void publishAfterImageReview(x.id)} onStatus={(next) => void setListingStatus(x.id, next)} onRemove={() => void removeListing(x.id)} />
                              </div>
                            </details>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Create listing */}
                  <div className="mt-5">
                    <Link
                      href="/new"
                      className="flex min-h-13 w-full items-center justify-center rounded-full bg-primary px-5 text-base font-semibold text-primary-foreground transition hover:bg-primary-hover"
                    >
                      Разместить объявление
                    </Link>
                  </div>
                </div>
              ) : (
                /* ===== PROFILE MENU VIEW ===== */
                <>
              {/* Profile Card Section */}
              <Card className="gap-0 rounded-3xl p-6 text-center shadow-sm">
                {/* Avatar */}
                <div className="relative mx-auto mb-4 w-fit">
                  <div
                    className="h-20 w-20 overflow-hidden rounded-3xl border-2 border-border [background-color:var(--mode-accent-soft)]"
                  >
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt={me.name ?? 'Avatar'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center text-2xl font-bold [color:var(--mode-accent)]"
                      >
                        {me.name?.charAt(0)?.toUpperCase() ?? 'P'}
                      </div>
                    )}
                  </div>

                </div>

                {/* Name */}
                <h2 className="text-lg font-bold text-foreground">
                  {me.name ?? me.email ?? 'Профиль'}
                </h2>

                {/* Rating */}
                <div className="mt-2 flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1">
                    {publicProfile && publicProfile.rating.avg ? (
                      <>
                        <Star
                          size={16}
                          aria-hidden
                          className="text-amber-500 fill-current"
                        />
                        <span className="text-sm font-semibold text-foreground">
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
                  <Link href="/profile?tab=ACTIVE" className="rounded-2xl bg-muted/60 px-3 py-4 focus-visible:ring-2 focus-visible:ring-ring">
                    <div className="text-xs font-medium text-muted-foreground">Активные</div>
                    <div className="mt-1 text-xl font-bold text-foreground">{activeCount}</div>
                  </Link>
                  <Link href="/profile?tab=SOLD" className="rounded-2xl bg-muted/60 px-3 py-4 focus-visible:ring-2 focus-visible:ring-ring">
                    <div className="text-xs font-medium text-muted-foreground">Продано</div>
                    <div className="mt-1 text-xl font-bold text-foreground">{soldCount}</div>
                  </Link>
                </div>

                <Link
                  href="/wallet"
                  className="mt-4 flex min-h-11 items-center gap-3 rounded-2xl border border-border bg-background p-4 text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Wallet size={24} strokeWidth={s} aria-hidden />
                  <div className="flex-1">
                    <div className="text-sm font-semibold">Кошелёк</div>
                    <p className="mt-1 text-xs text-muted-foreground">Баланс и история операций</p>
                    <p className="mt-1 text-xs text-muted-foreground">Пополнение пока недоступно</p>
                  </div>
                  <ChevronRight size={20} aria-hidden />
                </Link>
              </Card>

              {/* Menu Items */}
              <div className="mt-5 space-y-2">
                <Link
                  href="/listings"
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring hover:bg-muted/50"
                >
                  <Grid3x3 size={24} strokeWidth={1.5} className="[color:var(--mode-accent)]" aria-hidden />
                  <span className="flex-1 text-sm font-semibold text-foreground">Мои объявления</span>
                  <ChevronRight size={20} strokeWidth={1.5} className="text-muted-foreground" aria-hidden />
                </Link>

                <Link
                  href="/profile/orders"
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring hover:bg-muted/50"
                >
                  <ShoppingBag size={24} strokeWidth={1.5} className="[color:var(--mode-accent)]" aria-hidden />
                  <span className="flex-1 text-sm font-semibold text-foreground">Заказы</span>
                  <ChevronRight size={20} strokeWidth={1.5} className="text-muted-foreground" aria-hidden />
                </Link>

                <Link
                  href="/profile/reviews"
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring hover:bg-muted/50"
                >
                  <Star size={24} strokeWidth={1.5} className="[color:var(--mode-accent)]" aria-hidden />
                  <span className="flex-1 text-sm font-semibold text-foreground">Отзывы</span>
                  <ChevronRight size={20} strokeWidth={1.5} className="text-muted-foreground" aria-hidden />
                </Link>

                <Link
                  href="/profile/settings"
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring hover:bg-muted/50"
                >
                  <Settings size={24} strokeWidth={1.5} className="[color:var(--mode-accent)]" aria-hidden />
                  <span className="flex-1 text-sm font-semibold text-foreground">Настройки</span>
                  <ChevronRight size={20} strokeWidth={1.5} className="text-muted-foreground" aria-hidden />
                </Link>

                <Button variant="ghost"
                  type="button"
                  onClick={() => setSupportSheetOpen(true)}
                  className="h-auto min-h-14 flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring hover:bg-muted/50"
                >
                  <Headphones size={24} strokeWidth={1.5} className="[color:var(--mode-accent)]" aria-hidden />
                  <span className="flex-1 text-sm font-semibold text-foreground">Поддержка</span>
                  <ChevronRight size={20} strokeWidth={1.5} className="text-muted-foreground" aria-hidden />
                </Button>

                <Button variant="ghost"
                  type="button"
                  onClick={() => void logout()}
                  className="h-auto min-h-14 flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring hover:bg-destructive/10"
                >
                  <LogOut size={24} strokeWidth={1.5} className="text-destructive" aria-hidden />
                  <span className="flex-1 text-sm font-semibold text-destructive">Выйти</span>
                  <ChevronRight size={20} strokeWidth={1.5} className="text-muted-foreground" aria-hidden />
                </Button>
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
                  {/* KPI strip — Seller Hub */}
                  <div className="overflow-hidden rounded-3xl border border-border bg-card">
                    <div className="[background-color:var(--mode-accent-soft)] px-5 py-5 text-foreground">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Сводка</p>
                      <p className="mt-1 text-lg font-bold">Здравствуйте, {me.name?.split(' ')[0] ?? 'продавец'}</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4">
                      <Button variant="ghost"
                        type="button"
                        onClick={() => setListingTab('ACTIVE')}
                        className={`h-auto min-h-20 flex flex-col items-start gap-1 px-4 py-4 text-left transition hover:[background-color:var(--mode-accent-soft)] ${
 activeTab === 'ACTIVE' ? '[background-color:var(--mode-accent-soft)]' : ''
 }`}
                      >
                        <span className="text-2xl font-bold text-foreground">{activeCount}</span>
                        <span className="text-xs font-medium text-muted-foreground">Активные</span>
                      </Button>
                      <Button variant="ghost"
                        type="button"
                        onClick={() => setListingTab('SOLD')}
                        className={`h-auto min-h-20 flex flex-col items-start gap-1 px-4 py-4 text-left transition hover:[background-color:var(--mode-accent-soft)] ${
 activeTab === 'SOLD' ? '[background-color:var(--mode-accent-soft)]' : ''
 }`}
                      >
                        <span className="text-2xl font-bold text-foreground">{soldCount}</span>
                        <span className="text-xs font-medium text-muted-foreground">Продано</span>
                      </Button>
                      <Button variant="ghost"
                        type="button"
                        onClick={() => setListingTab('ARCHIVED')}
                        className={`h-auto min-h-20 flex flex-col items-start gap-1 px-4 py-4 text-left transition hover:bg-muted ${
 activeTab === 'ARCHIVED' ? 'bg-muted' : ''
 }`}
                      >
                        <span className="text-2xl font-bold text-foreground">{archivedCount}</span>
                        <span className="text-xs font-medium text-muted-foreground">В архиве</span>
                      </Button>
                      <Link
                        href="/messages"
                        className="flex flex-col items-start gap-1 px-4 py-4 transition hover:[background-color:var(--mode-accent-soft)]"
                      >
                        <span className="text-2xl font-bold text-foreground">{chatCount}</span>
                        <span className="inline-flex items-center gap-1 text-xs font-medium [color:var(--mode-accent)]">
                          Диалоги
                          <ChevronRight size={14} strokeWidth={s} aria-hidden />
                        </span>
                      </Link>
                    </div>
                    <div className="grid gap-3 p-4 sm:grid-cols-3">
                      <div className="rounded-lg bg-muted/60 px-4 py-3">
                        <div className="text-xs font-medium text-muted-foreground">Профиль заполнен</div>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-xl font-bold text-foreground">{profileCompletion}%</span>
                          <Link href="/profile/settings" className="text-xs font-semibold [color:var(--mode-accent)] hover:underline">
                            Улучшить
                          </Link>
                        </div>
                      </div>
                      <div className="rounded-lg bg-muted/60 px-4 py-3">
                        <div className="text-xs font-medium text-muted-foreground">Объявления с фото</div>
                        <div className="mt-1 text-xl font-bold text-foreground">{listingQuality}%</div>
                        <div className="text-[11px] text-muted-foreground">Доля объявлений с фото</div>
                      </div>
                      <div className="rounded-lg bg-muted/60 px-4 py-3">
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
                    <div className="rounded-lg [background-color:var(--mode-accent-soft)] p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                        <Sparkles size={20} strokeWidth={s} className="[color:var(--mode-accent)]" aria-hidden />
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
                    <div className="rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success">
                      Все основные задачи выполнены — отличная работа.
                    </div>
                  )}

                  {/* Trust badges */}
                  <div className="rounded-3xl border border-border bg-card p-5">
                    <div className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Доверие покупателей</div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
 hasActiveSeller
 ? '[background-color:var(--mode-accent-soft)] [color:var(--mode-accent)] border [border-color:var(--mode-accent-ring)]'
 : 'bg-muted text-muted-foreground'
 }`}
                      >
                        <CheckCircle size={16} strokeWidth={s} aria-hidden />
                        Активный продавец
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
 hasResponsive
 ? '[background-color:var(--mode-accent-soft)] [color:var(--mode-accent)] border [border-color:var(--mode-accent-ring)]'
 : 'bg-muted text-muted-foreground'
 }`}
                      >
                        <Clock size={16} strokeWidth={s} aria-hidden />
                        Есть диалоги
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
 hasTopRated
 ? 'bg-[#FFD166] text-foreground'
 : 'bg-muted text-muted-foreground'
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
                                  <div className="mt-1 font-semibold" >★ {r.rating}/5</div>
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
                    <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:[color:var(--mode-accent)]">
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
                        <Button variant="ghost"
                          key={tab}
                          type="button"
                          onClick={() => setListingTab(tab)}
                          aria-pressed={activeTab === tab}
                          className={`min-h-11 flex-1 min-w-[100px] rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
 activeTab === tab
 ? tab === 'ARCHIVED'
 ? 'bg-muted text-foreground shadow-sm'
 : 'bg-card text-foreground shadow-sm'
 : 'text-muted-foreground hover:text-foreground'
 }`}
                        >
                          {label}
                          <span className="ml-1 opacity-70">({count})</span>
                        </Button>
                      ))}
                    </div>

                    {activeTab === 'ARCHIVED' ? (
                      <ProfileArchivedSection
                        busy={actionBusy}
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
                              className="mt-3 inline-flex items-center justify-center rounded-xl [background-color:var(--mode-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:[background-color:var(--mode-accent-hover)]"
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
                                        src={resolveAssetUrl(x.images[0].url) ?? ''}
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
                                        className="line-clamp-2 text-base font-bold text-foreground hover:underline hover:[color:var(--mode-accent)]"
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

                                  <div className="lg:w-56 lg:shrink-0">
                                    <ListingManagementActions listing={x} busy={actionBusy} onEdit={() => startEdit(x)} onPromote={() => setPromoteTarget({ id: x.id, title: x.title })} onPublish={() => void publishAfterImageReview(x.id)} onStatus={(next) => void setListingStatus(x.id, next)} onRemove={() => void removeListing(x.id)} />
                                  </div>
                                </div>


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

      {editingId ? <ListingEditorDialog key={editingId} values={editForm} onChange={setEditForm} categories={categories} onSave={() => saveEdit(editingId)} onClose={() => setEditingId(null)} saveError={actionError ? actionNotice : undefined} authHref={actionNeedsLogin ? '/auth?next=%2Fprofile' : undefined} /> : null}
      <SupportSheet open={supportSheetOpen} onClose={() => setSupportSheetOpen(false)} />

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
