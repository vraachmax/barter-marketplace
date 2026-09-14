'use client';
import { canOfferBarter } from '@/lib/barter-category';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, ChevronDown, ClipboardList } from 'lucide-react';
import { AccountScreenHeader } from '@/components/account-screen-header';
import { Card } from '@/components/ui/card';
import { ListingManagementActions } from '@/components/listing-management-actions';
import { PromoteDialog } from '@/components/promote-dialog';

const s = 1.8;
import {
  type AuthMe,
  apiFetchJson,
  apiGetJson,
  resolveAssetUrl,
  type Category,
  type MyListing,
} from '@/lib/api';
import ListingPlaceholder from '@/components/listing-placeholder';
import { ListingEditorDialog } from '@/components/listing-editor-dialog';
import { useListingActions } from '@/lib/use-listing-actions';

type ListingTab = 'ACTIVE' | 'NEEDS_ACTION' | 'COMPLETED';

/** Explain what needs attention without turning an informational notice into an edit action. */
function needsAction(x: MyListing): { is: boolean; reason: string } {
  if (x.status === 'SOLD' || x.status === 'ARCHIVED') return { is: false, reason: '' };
  if (x.status === 'PENDING') return { is: true, reason: 'Ожидает модерации — подтвердите публикацию' };
  if (x.status === 'BLOCKED') return { is: true, reason: 'Объявление скрыто модерацией' };
  if (x.duplicateImageFlag) return { is: true, reason: 'Фото совпало с другим объявлением — замените' };
  if (x.status === 'ACTIVE' && x.priceRub == null) return { is: true, reason: 'Не указана цена' };
  if (x.status === 'ACTIVE' && (!x.images || x.images.length === 0)) return { is: true, reason: 'Нет ни одного фото' };
  return { is: false, reason: '' };
}

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
  const { busy: actionBusy, notice: actionNotice, error: actionError, needsLogin: actionNeedsLogin, performAction } = useListingActions(loadData);
  const tabParam = searchParams.get('tab');
  const activeTab: ListingTab = tabParam === 'NEEDS_ACTION' ? 'NEEDS_ACTION' : tabParam === 'COMPLETED' || tabParam === 'ARCHIVED' || tabParam === 'SOLD' ? 'COMPLETED' : 'ACTIVE';
  const [editingId, setEditingId] = useState<string | null>(null);
  const [promoteTarget, setPromoteTarget] = useState<{ id: string; title: string } | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    city: '',
    categoryId: '',
    priceRub: '',
    isBarter: false,
  });

  function setListingTab(tab: ListingTab) {
    router.push(`/listings?tab=${tab}`, { scroll: false });
  }

  async function loadData(): Promise<boolean> {
    const signal = AbortSignal.timeout(20000);
    const [res, cats] = await Promise.all([
      apiFetchJson<AuthMe>('/auth/me', { signal }),
      apiGetJson<Category[]>('/categories', { signal }).catch(() => [] as Category[]),
    ]);
    if (!res.ok) {
      if (res.status === 401) { setStatus('need_auth'); return false; }
      setStatus('error');
      return false;
    }
    setMe(res.data);
    setCategories(cats);
    const myListings = await apiFetchJson<MyListing[]>('/listings/my', { signal });
    if (!myListings.ok) {
      setStatus(myListings.status === 401 ? 'need_auth' : 'error');
      return false;
    }
    setListings(myListings.data);
    setStatus('ready');
    return true;
  }

  async function setListingStatus(id: string, nextStatus: 'ACTIVE' | 'SOLD' | 'ARCHIVED') {
    await performAction(`/listings/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus }),
    });
  }

  async function publishAfterImageReview(id: string) {
    await performAction(`/listings/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ publishFromModeration: true }),
    });
  }

  async function removeListing(id: string) {
    if (actionBusy) return;
    const ok = window.confirm('Удалить объявление безвозвратно?');
    if (!ok) return;
    await performAction(`/listings/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  function startEdit(x: MyListing) {
    if (actionBusy) return;
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
      method: 'PATCH',
      body: JSON.stringify(payload),
    }, () => setEditingId(null));
  }

  useEffect(() => {
    // loadData updates state only after awaiting the API responses.
    void loadData();
  }, []);

  const activeCount = useMemo(
    () => listings.filter((x) => x.status === 'ACTIVE' && !needsAction(x).is).length,
    [listings],
  );
  const needsActionCount = useMemo(
    () => listings.filter((x) => needsAction(x).is).length,
    [listings],
  );
  const completedCount = useMemo(
    () => listings.filter((x) => x.status === 'SOLD' || x.status === 'ARCHIVED').length,
    [listings],
  );

  const visibleListings = useMemo(
    () =>
      listings.filter((x) => {
        if (activeTab === 'ACTIVE') return x.status === 'ACTIVE' && !needsAction(x).is;
        if (activeTab === 'NEEDS_ACTION') return needsAction(x).is;
        if (activeTab === 'COMPLETED') return x.status === 'SOLD' || x.status === 'ARCHIVED';
        return false;
      }),
    [listings, activeTab],
  );

  /**
   * Семантика статус-чипа (как в Hotfix #10 на /profile).
   * ACTIVE → success (зелёный). PENDING/SOLD → mode-accent.
   * BLOCKED → destructive. ARCHIVED → muted.
   */
  function statusLabel(st: MyListing['status']) {
    if (st === 'ACTIVE')
      return { text: 'Активно', className: 'bg-success/10 text-success ring-success/30' };
    if (st === 'PENDING')
      return {
        text: 'Модерация',
        className:
          'ring-1 [background-color:var(--mode-accent-soft)] [color:var(--mode-accent)] [--tw-ring-color:var(--mode-accent-ring)]',
      };
    if (st === 'BLOCKED')
      return { text: 'Скрыто', className: 'bg-destructive/10 text-destructive ring-destructive/30' };
    if (st === 'SOLD')
      return {
        text: 'Продано',
        className:
          'ring-1 [background-color:var(--mode-accent-soft)] [color:var(--mode-accent)] [--tw-ring-color:var(--mode-accent-ring)]',
      };
    return { text: 'Архив', className: 'bg-muted text-muted-foreground ring-border' };
  }

  const tabs = [
    { value: 'ACTIVE', label: 'Активные', count: activeCount },
    { value: 'NEEDS_ACTION', label: 'Внимание', count: needsActionCount },
    { value: 'COMPLETED', label: 'Завершены', count: completedCount },
  ] as const;
  const sectionLabel = activeTab === 'ACTIVE' ? 'Активные объявления'
    : activeTab === 'NEEDS_ACTION' ? 'Требуют внимания' : 'Завершённые объявления';
  const sectionHint = activeTab === 'ACTIVE' ? 'Опубликованы и доступны покупателям.'
    : activeTab === 'NEEDS_ACTION' ? 'Проверьте публикацию и заполнение объявлений.'
      : 'Проданные и архивные объявления можно вернуть в активные.';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AccountScreenHeader title="Мои объявления" subtitle="Публикация и управление" backHref="/" backLabel="Назад в ленту" width="wide" />
      {editingId ? <ListingEditorDialog key={editingId} values={editForm} onChange={setEditForm} categories={categories} onSave={() => saveEdit(editingId)} onClose={() => setEditingId(null)} saveError={actionError ? actionNotice : undefined} authHref={actionNeedsLogin ? '/auth?next=%2Flistings' : undefined} /> : null}
      {promoteTarget ? <PromoteDialog open onOpenChange={(open) => { if (!open) setPromoteTarget(null); }} listingId={promoteTarget.id} listingTitle={promoteTarget.title} onSuccess={() => void loadData()} /> : null}

      <main className="mx-auto max-w-6xl px-4 pt-6 pb-32 md:px-6">
        {actionNotice ? (
          <div role={actionError ? 'alert' : 'status'} className="mb-4 rounded-2xl border border-border bg-card p-4 text-sm text-foreground">
            <p>{actionNotice}</p>
            {actionNeedsLogin ? <Link href={`/auth?next=${encodeURIComponent('/listings?tab=' + activeTab)}`} className="mt-2 inline-flex min-h-11 items-center text-primary underline">Войти снова</Link> : null}
            {actionError && !actionNeedsLogin ? <Button variant="outline" className="mt-2" disabled={actionBusy} onClick={() => void loadData()}>Обновить список</Button> : null}
          </div>
        ) : null}
        {status === 'loading' ? <ListingsLoading /> : null}
        {status === 'need_auth' ? (
          <Card className="mx-auto max-w-md gap-4 p-6 text-center">
            <ClipboardList className="mx-auto size-10 text-muted-foreground" strokeWidth={s} aria-hidden />
            <h2 className="text-xl font-semibold">Ваши объявления в одном месте</h2>
            <p className="text-sm text-muted-foreground">Войдите, чтобы редактировать публикации и управлять ими.</p>
            <Button render={<Link href={`/auth?next=${encodeURIComponent('/listings?tab=' + activeTab)}`} />} size="lg" className="w-full whitespace-normal">Войти или зарегистрироваться</Button>
          </Card>
        ) : null}
        {status === 'error' ? (
          <div role="alert" className="rounded-3xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Не удалось загрузить объявления</h2>
            <p className="mt-2 text-sm text-muted-foreground">Попробуйте обновить список.</p>
            <Button variant="outline" className="mt-4" onClick={() => void loadData()}>Повторить</Button>
          </div>
        ) : null}

        {status === 'ready' && me ? (
          <>
            <nav aria-label="Статусы объявлений" className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1">
              {tabs.map((tab) => (
                <Button key={tab.value} variant="ghost" type="button"
                  aria-pressed={activeTab === tab.value}
                  onClick={() => setListingTab(tab.value)}
                  className={`min-h-16 min-w-0 flex-col gap-1 rounded-xl px-2 py-2 text-xs sm:text-sm ${activeTab === tab.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                  <span>{tab.label}</span>
                  <span className="text-sm font-semibold tabular-nums">{tab.count}</span>
                </Button>
              ))}
            </nav>
            <section aria-labelledby="listing-section-title" className="mt-6">
              <div className="mb-4">
                <h2 id="listing-section-title" className="text-xl font-semibold">{sectionLabel}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{sectionHint}</p>
              </div>
              {visibleListings.length === 0 ? (
                <Card className="items-center gap-3 p-8 text-center">
                  <ClipboardList className="size-10 text-muted-foreground" strokeWidth={s} aria-hidden />
                  <h3 className="text-base font-semibold">{activeTab === 'NEEDS_ACTION' ? 'Всё в порядке' : 'Здесь пока пусто'}</h3>
                  <p className="max-w-sm text-sm text-muted-foreground">{activeTab === 'NEEDS_ACTION'
                    ? 'Нет объявлений, которым нужно внимание.'
                    : activeTab === 'COMPLETED' ? 'Здесь появятся проданные и архивные объявления.' : 'Ваши опубликованные объявления появятся здесь.'}</p>
                </Card>
              ) : (
                <ul className="grid items-start gap-4 lg:grid-cols-2">
                  {visibleListings.map((x) => {
                    const action = needsAction(x);
                    const st = statusLabel(x.status);
                    const thumb = resolveAssetUrl(x.images?.[0]?.url);
                    return (
                      <li key={x.id} className="min-w-0">
                        <Card className="gap-4 p-4">
                          <div className="grid grid-cols-[80px_minmax(0,1fr)] items-start gap-4 sm:grid-cols-[96px_minmax(0,1fr)]">
                            <Link href={`/listing/${x.id}`} aria-label={`Открыть объявление: ${x.title}`} className="aspect-square overflow-hidden rounded-2xl bg-muted focus-visible:outline-2 focus-visible:outline-primary">
                              {thumb ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={thumb} alt="" className="size-full object-cover" />
                              ) : <ListingPlaceholder title={x.title} categoryTitle={x.category.title} className="size-full rounded-none border-0" />}
                            </Link>
                            <div className="min-w-0">
                              <Link href={`/listing/${x.id}`} className="line-clamp-2 break-words text-base font-semibold leading-snug hover:underline">{x.title}</Link>
                              <p className="mt-1 break-words text-lg font-semibold">{x.priceRub != null ? `${x.priceRub.toLocaleString('ru-RU')} ₽` : 'Цена не указана'}</p>
                              <p className="mt-1 break-words text-xs text-muted-foreground">{x.city}</p>
                              <span className={`mt-2 inline-flex max-w-full rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${st.className}`}>{st.text}</span>
                            </div>
                          </div>
                          {action.is ? (
                            <p className="flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                              <AlertTriangle size={18} strokeWidth={s} className="mt-0.5 shrink-0" aria-hidden />
                              <span className="min-w-0 break-words">{action.reason}</span>
                            </p>
                          ) : null}
                          {x.activePromotion ? <p className="text-xs text-muted-foreground">Продвижение {x.activePromotion.type} до {formatPromoEndsAt(x.activePromotion.endsAt)}</p> : null}
                          <details className="group border-t border-border pt-2">
                            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-full px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
                              Действия с объявлением
                              <ChevronDown size={18} strokeWidth={s} className="shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
                            </summary>
                            <div className="pt-3">
                              <ListingManagementActions listing={x} busy={actionBusy}
                                onEdit={() => startEdit(x)}
                                onPromote={() => setPromoteTarget({ id: x.id, title: x.title })}
                                onPublish={() => void publishAfterImageReview(x.id)}
                                onStatus={(next) => void setListingStatus(x.id, next)}
                                onRemove={() => void removeListing(x.id)} />
                            </div>
                          </details>
                        </Card>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
            <Button render={<Link href="/new" />} size="lg" className="mt-6 w-full sm:w-auto">Разместить объявление</Button>
          </>
        ) : null}
      </main>
    </div>
  );
}

function ListingsLoading() {
  return <div role="status" className="flex flex-col items-center justify-center gap-3 py-16">
    <span className="size-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary motion-reduce:animate-none" aria-hidden />
    <p className="text-sm text-muted-foreground">Загрузка объявлений…</p>
  </div>;
}

export default function ListingsPage() {
  return <Suspense fallback={<div className="min-h-screen bg-background text-foreground">
    <AccountScreenHeader title="Мои объявления" subtitle="Публикация и управление" backHref="/" backLabel="Назад в ленту" width="wide" />
    <ListingsLoading />
  </div>}><ListingsContent /></Suspense>;
}
