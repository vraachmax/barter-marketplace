'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Camera, Check, Crown, Loader2, Palette, Rocket, Sparkles, Star, TrendingUp } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';

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
  const [packages, setPackages] = useState<PromotionPackage[] | null>(null);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const [pkgRes, balRes] = await Promise.all([
        apiFetchJson<PromotionPackage[]>(`/wallet/packages?audience=${audience}`),
        apiFetchJson<WalletBalance>('/wallet/balance'),
      ]);
      if (cancelled) return;
      if (pkgRes.ok) {
        setPackages(pkgRes.data);
        // авто-выбор первого по умолчанию
        if (pkgRes.data.length > 0 && !selected) setSelected(pkgRes.data[0].code);
      } else {
        setError(pkgRes.message);
      }
      if (balRes.ok) setBalance(balRes.data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, audience]);

  const selectedPkg = useMemo(
    () => packages?.find((p) => p.code === selected) ?? null,
    [packages, selected],
  );

  const enoughMoney = useMemo(() => {
    if (!selectedPkg || !balance) return false;
    return balance.balanceKopecks >= selectedPkg.priceKopecks;
  }, [selectedPkg, balance]);

  async function applyPromotion() {
    if (!selectedPkg) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    const res = await apiFetchJson<{ ok: true }>('/wallet/promote', {
      method: 'POST',
      body: JSON.stringify({ packageCode: selectedPkg.code, listingId }),
    });
    setBusy(false);
    if (res.ok) {
      setSuccess(`Продвижение «${selectedPkg.title}» активировано`);
      // обновим баланс
      const balRes = await apiFetchJson<WalletBalance>('/wallet/balance');
      if (balRes.ok) setBalance(balRes.data);
      onSuccess?.();
      // закроем через короткую паузу
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(null);
      }, 1100);
    } else {
      setError(res.message || 'Не удалось применить продвижение');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-lg">
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

        <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
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
                  onClick={() => setSelected(pkg.code)}
                  className={`flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3 text-left transition data-[active=true]:ring-2 ${meta.ring} hover:border-primary/40`}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${meta.tone}`}>
                    <Icon size={20} strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
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
                      {pkg.weightMultiplier !== 1 ? (
                        <span className="inline-flex items-center gap-1">
                          <Rocket size={11} strokeWidth={1.8} />
                          ×{pkg.weightMultiplier} вес
                        </span>
                      ) : null}
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
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700 dark:border-green-900/40 dark:bg-green-950/40 dark:text-green-300">
            {success}
          </p>
        ) : null}

        <Separator />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {selectedPkg ? (
              <>
                К оплате: <span className="font-bold text-foreground">{formatRub(selectedPkg.priceRub)}</span>
              </>
            ) : (
              <>Выберите пакет</>
            )}
          </div>
          <div className="flex gap-2">
            {!enoughMoney && selectedPkg && balance ? (
              <Link
                href="/wallet"
                className="inline-flex h-7 items-center rounded-[12px] border border-border bg-background px-2.5 text-[0.8rem] font-medium text-foreground transition hover:bg-muted"
              >
                Пополнить
              </Link>
            ) : null}
            <Button
              type="button"
              size="sm"
              onClick={applyPromotion}
              disabled={!selectedPkg || !enoughMoney || busy}
              className="bg-primary hover:bg-primary/90"
            >
              {busy ? (
                <>
                  <Loader2 size={14} strokeWidth={2} className="animate-spin" />
                  Активируем…
                </>
              ) : (
                <>
                  <Sparkles size={14} strokeWidth={1.8} />
                  Продвинуть
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
