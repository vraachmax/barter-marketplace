'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Check, Crown, Loader2, Palette, Star, TrendingUp } from 'lucide-react';
import {
  apiFetchJson,
  type PromotionAudience,
  type PromotionPackage,
  type PromotionTypeCode,
  type WalletBalance,
} from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  listingTitle: string;
  audience?: PromotionAudience;
  /** Вызовется после успешного применения продвижения */
  onSuccess?: () => void;
};

const PROMO_META: Record<
  PromotionTypeCode,
  { icon: typeof Star; label: string; tone: string; ring: string }
> = {
  TOP: {
    icon: Star,
    label: 'Топ',
    tone: 'bg-primary/10 text-primary',
    ring: 'data-[active=true]:ring-primary',
  },
  VIP: {
    icon: Crown,
    label: 'VIP',
    tone: 'bg-secondary/15 text-secondary',
    ring: 'data-[active=true]:ring-secondary',
  },
  XL: {
    icon: Camera,
    label: 'XL',
    tone: 'bg-accent/15 text-accent',
    ring: 'data-[active=true]:ring-accent',
  },
  COLOR: {
    icon: Palette,
    label: 'Цветная карточка',
    tone: 'bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/30 dark:text-fuchsia-300',
    ring: 'data-[active=true]:ring-fuchsia-400',
  },
  LIFT: {
    icon: TrendingUp,
    label: 'Поднятие',
    tone: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300',
    ring: 'data-[active=true]:ring-sky-400',
  },
};

function formatRub(v: number): string {
  return `${Math.round(v).toLocaleString('ru-RU')} ₽`;
}

function formatDuration(seconds: number): string {
  const days = Math.round(seconds / 86400);
  if (days >= 7 && days % 7 === 0) {
    const weeks = days / 7;
    return `${weeks} ${weeks === 1 ? 'неделя' : weeks < 5 ? 'недели' : 'недель'}`;
  }
  return `${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}`;
}

export function PromoteDialog({
  open,
  onOpenChange,
  listingId,
  listingTitle,
  audience = 'PERSONAL',
  onSuccess,
}: Props) {
  const submitting = useRef(false);
  const [packages, setPackages] = useState<PromotionPackage[] | null>(null);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    (async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setPackages(null);
      setBalance(null);
      setSelected(null);
      const [pkgRes, balRes] = await Promise.all([
        apiFetchJson<PromotionPackage[]>(`/wallet/packages?audience=${audience}`, { signal: controller.signal }),
        apiFetchJson<WalletBalance>('/wallet/balance', { signal: controller.signal }),
      ]);
      clearTimeout(timeout);
      if (cancelled) return;
      if (pkgRes.ok) {
        setPackages(pkgRes.data);
        // авто-выбор первого по умолчанию
        setSelected(pkgRes.data[0]?.code ?? null);
      } else {
        setError(pkgRes.message);
      }
      if (balRes.ok) setBalance(balRes.data);
      else if (pkgRes.ok) setError(balRes.message || 'Не удалось загрузить баланс');
      setLoading(false);
    })();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [open, audience, attempt]);

  const selectedPkg = useMemo(
    () => packages?.find((p) => p.code === selected) ?? null,
    [packages, selected],
  );

  const enoughMoney = useMemo(() => {
    if (!selectedPkg || !balance) return false;
    return balance.balanceKopecks >= selectedPkg.priceKopecks;
  }, [selectedPkg, balance]);

  async function applyPromotion() {
    if (!selectedPkg || !enoughMoney || submitting.current || success) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    setSuccess(null);
    const res = await apiFetchJson<{ ok: true }>('/wallet/promote', {
      method: 'POST',
      body: JSON.stringify({ packageCode: selectedPkg.code, listingId }),
      signal: AbortSignal.timeout(15000),
    });
    submitting.current = false;
    setBusy(false);
    if (res.ok) {
      setSuccess(`Продвижение «${selectedPkg.title}» активировано`);
      // обновим баланс
      const balRes = await apiFetchJson<WalletBalance>('/wallet/balance', { signal: AbortSignal.timeout(15000) });
      if (balRes.ok) setBalance(balRes.data);
      onSuccess?.();
    } else {
      setError(res.message || 'Не удалось применить продвижение');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!submitting.current) onOpenChange(nextOpen); }}>
      <DialogContent showCloseButton={!busy} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Продвинуть объявление</DialogTitle>
          <DialogDescription>
            «{listingTitle}» — выберите пакет, оплата с кошелька.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2">
          <span className="text-xs text-muted-foreground">Баланс кошелька</span>
          <span className="text-sm font-bold text-foreground">
            {balance ? formatRub(balance.balanceRub) : '—'}
          </span>
        </div>

        <div className="space-y-2" role="group" aria-label="Пакеты продвижения" aria-busy={loading}>
          {loading ? (
            <>
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </>
          ) : packages && packages.length > 0 ? (
            packages.map((pkg) => {
              const meta = PROMO_META[pkg.promotionType] ?? PROMO_META.TOP;
              const Icon = meta.icon;
              const isActive = selected === pkg.code;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  data-active={isActive}
                  aria-pressed={isActive}
                  disabled={busy || Boolean(success)}
                  onClick={() => setSelected(pkg.code)}
                  className="flex min-h-16 w-full items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left transition data-[active=true]:border-primary data-[active=true]:bg-primary/5 data-[active=true]:ring-1 data-[active=true]:ring-primary hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                    <Icon size={20} strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-bold text-foreground">{pkg.title}</span>
                      <span className="shrink-0 text-sm font-bold text-foreground">
                        {formatRub(pkg.priceRub)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                      <Badge variant="outline" className="border-border text-[10px] font-bold uppercase tracking-wide">
                        {meta.label}
                      </Badge>
                      <span>{formatDuration(pkg.durationSec)}</span>
                      {pkg.isBundle ? <Badge variant="secondary" className="text-[10px]">Пакет</Badge> : null}
                    </div>
                    {pkg.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{pkg.description}</p>
                    ) : null}
                  </div>
                  {isActive ? (
                    <Check size={18} strokeWidth={2} className="mt-1 shrink-0 text-primary" />
                  ) : null}
                </button>
              );
            })
          ) : (
            <p className="rounded-xl border border-dashed border-border bg-muted/40 py-8 text-center text-xs text-muted-foreground">
              Нет доступных пакетов
            </p>
          )}
        </div>

        {error ? (
          <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {error && !busy && !loading && (!packages || !balance) ? <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>Повторить загрузку</Button> : null}
        {success ? (
          <p role="status" className="rounded-2xl border border-border bg-muted px-4 py-3 text-sm text-foreground">
            {success}
          </p>
        ) : null}

        <div className="glass-panel sticky -bottom-4 -mx-4 -mb-4 flex flex-col gap-3 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="text-xs text-muted-foreground">
            {selectedPkg ? (
              <>
                К оплате: <span className="font-bold text-foreground">{formatRub(selectedPkg.priceRub)}</span>
              </>
            ) : (
              <>Выберите пакет</>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {success ? <Button variant="secondary" size="lg" onClick={() => onOpenChange(false)}>Готово</Button> : null}
            {!enoughMoney && selectedPkg && balance ? (
              <Link
                href="/wallet"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-background px-5 text-base font-medium text-foreground transition hover:bg-muted"
              >
                Открыть кошелёк
              </Link>
            ) : null}
            <Button
              type="button"
              size="lg"
              onClick={applyPromotion}
              disabled={loading || !selectedPkg || !enoughMoney || busy || Boolean(success)}
              aria-busy={busy}
              className="w-full"
            >
              {busy ? (
                <>
                  <Loader2 size={14} strokeWidth={2} className="animate-spin" />
                  Активируем…
                </>
              ) : (
                <>
                  {success ? 'Продвижение включено' : 'Продвинуть'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
