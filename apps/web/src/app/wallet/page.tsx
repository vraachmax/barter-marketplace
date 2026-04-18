'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Crown,
  Gift,
  History,
  Loader2,
  RefreshCw,
  Rocket,
  Wallet as WalletIcon,
} from 'lucide-react';
import {
  apiFetchJson,
  type ProSubscription,
  type WalletBalance,
  type WalletTransaction,
  type WalletTxnType,
} from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

const TOPUP_PRESETS = [100, 300, 500, 1000, 2000, 5000];

function formatRub(v: number): string {
  return `${Math.round(v).toLocaleString('ru-RU')} ₽`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const txnIcon: Record<WalletTxnType, ReactNode> = {
  TOPUP: <ArrowDownLeft size={18} strokeWidth={1.8} />,
  PROMOTION: <Rocket size={18} strokeWidth={1.8} />,
  PRO_SUBSCRIPTION: <Crown size={18} strokeWidth={1.8} />,
  REFUND: <RefreshCw size={18} strokeWidth={1.8} />,
  BONUS: <Gift size={18} strokeWidth={1.8} />,
  ADJUSTMENT: <ArrowUpRight size={18} strokeWidth={1.8} />,
};

export default function WalletPage() {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [txns, setTxns] = useState<WalletTransaction[]>([]);
  const [subscription, setSubscription] = useState<ProSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [topupAmount, setTopupAmount] = useState<number>(500);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [topupBusy, setTopupBusy] = useState(false);
  const [topupOk, setTopupOk] = useState<string | null>(null);

  const effectiveAmount = useMemo(() => {
    const custom = Number(customAmount);
    if (custom > 0 && Number.isFinite(custom)) return Math.floor(custom);
    return topupAmount;
  }, [customAmount, topupAmount]);

  async function load() {
    setLoading(true);
    setError(null);
    const [bal, tx, sub] = await Promise.all([
      apiFetchJson<WalletBalance>('/wallet/balance'),
      apiFetchJson<WalletTransaction[]>('/wallet/transactions?limit=50'),
      apiFetchJson<ProSubscription | null>('/wallet/pro/subscription'),
    ]);
    setLoading(false);
    if (!bal.ok) {
      if (bal.status === 401) {
        setError('Войдите в аккаунт, чтобы открыть кошелёк.');
      } else {
        setError(bal.message);
      }
      return;
    }
    setBalance(bal.data);
    if (tx.ok) setTxns(tx.data);
    if (sub.ok) setSubscription(sub.data);
  }

  useEffect(() => {
    void load();
  }, []);

  async function topup() {
    if (effectiveAmount < 1) return;
    setTopupBusy(true);
    setTopupOk(null);
    const res = await apiFetchJson<{ ok: true; balanceRub: number }>(
      '/wallet/topup',
      {
        method: 'POST',
        body: JSON.stringify({ amountRub: effectiveAmount }),
      },
    );
    setTopupBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setTopupOk(`Зачислено ${formatRub(effectiveAmount)} на баланс.`);
    setCustomAmount('');
    await load();
  }

  if (error && !balance) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card className="gap-3 p-6">
          <div className="text-base font-semibold text-foreground">Кошелёк недоступен</div>
          <p className="text-sm text-muted-foreground">{error}</p>
          <div className="flex gap-2">
            <Button render={<Link href="/auth" />}>Войти</Button>
            <Button variant="outline" render={<Link href="/" />}>
              На главную
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-24 md:py-10">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Кошелёк
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Баланс для продвижения объявлений и подписки Barter Pro
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={16} strokeWidth={1.8} />
          Обновить
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        {/* Balance + topup */}
        <Card className="gap-5 p-5 md:p-6">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <WalletIcon size={24} strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Баланс
              </div>
              {loading && !balance ? (
                <Skeleton className="mt-2 h-9 w-40" />
              ) : (
                <div className="mt-1 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                  {formatRub(balance?.balanceRub ?? 0)}
                </div>
              )}
              {balance ? (
                <div className="mt-1 text-xs text-muted-foreground">
                  Обновлено {formatDate(balance.updatedAt)}
                </div>
              ) : null}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="text-sm font-semibold text-foreground">Пополнить</div>
            <div className="flex flex-wrap gap-2">
              {TOPUP_PRESETS.map((amt) => {
                const active = effectiveAmount === amt && !customAmount;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setTopupAmount(amt);
                      setCustomAmount('');
                    }}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-foreground hover:border-primary/40'
                    }`}
                  >
                    {amt.toLocaleString('ru-RU')} ₽
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value.replace(/\D+/g, ''))}
                inputMode="numeric"
                placeholder="Своя сумма, ₽"
                className="h-11 max-w-[220px] rounded-xl"
              />
              <Button
                size="lg"
                disabled={topupBusy || effectiveAmount < 1}
                onClick={() => void topup()}
                className="h-11 rounded-xl"
              >
                {topupBusy ? (
                  <Loader2 size={18} strokeWidth={1.8} className="animate-spin" />
                ) : (
                  `Пополнить на ${formatRub(effectiveAmount)}`
                )}
              </Button>
            </div>
            {topupOk ? (
              <div className="rounded-xl border border-secondary/30 bg-secondary/10 px-3 py-2 text-sm text-secondary">
                {topupOk}
              </div>
            ) : null}
            {error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Платежи в alpha-режиме мокаются — на баланс зачислится мгновенно. Реальная
              эквайринг-интеграция появится в Phase 10.
            </p>
          </div>
        </Card>

        {/* Pro / Promo summary */}
        <div className="grid gap-4">
          <Card className="gap-3 p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-accent/15 text-accent">
                <Crown size={20} strokeWidth={1.8} />
              </span>
              <div>
                <div className="text-sm font-semibold text-foreground">Barter Pro</div>
                <div className="text-xs text-muted-foreground">Подписка для активных продавцов</div>
              </div>
            </div>
            {subscription && subscription.status === 'ACTIVE' ? (
              <>
                <div className="text-sm text-foreground">
                  Тариф: <span className="font-semibold">{subscription.plan.title}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Активна до {formatDate(subscription.endsAt)}
                </div>
                <Button variant="outline" size="sm" render={<Link href="/pricing" />}>
                  Сменить тариф
                </Button>
              </>
            ) : (
              <>
                <div className="text-sm text-muted-foreground">Подписка не оформлена</div>
                <Button size="sm" render={<Link href="/pricing" />}>
                  Выбрать тариф
                </Button>
              </>
            )}
          </Card>

          <Card className="gap-3 p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Rocket size={20} strokeWidth={1.8} />
              </span>
              <div>
                <div className="text-sm font-semibold text-foreground">Продвижение</div>
                <div className="text-xs text-muted-foreground">
                  Поднятие, VIP, XL и Турбо для ваших объявлений
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" render={<Link href="/pricing" />}>
              Тарифы продвижения
            </Button>
          </Card>
        </div>
      </div>

      {/* History */}
      <div className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <History size={18} strokeWidth={1.8} className="text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">История операций</h2>
        </div>
        <Card className="overflow-hidden p-0">
          {loading && txns.length === 0 ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : txns.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              Операций пока нет. Пополните баланс, чтобы начать продвижение.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {txns.map((t) => {
                const positive = t.amountRub > 0;
                return (
                  <li
                    key={t.id}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-muted/40"
                  >
                    <span
                      className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                        positive
                          ? 'bg-secondary/15 text-secondary'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {txnIcon[t.type]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">
                        {t.description}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatDate(t.createdAt)}</span>
                        {t.promotion ? (
                          <Link
                            href={`/listing/${t.promotion.listing.id}`}
                            className="text-primary hover:text-primary/80"
                          >
                            {t.promotion.listing.title}
                          </Link>
                        ) : null}
                        {t.proSubscription ? (
                          <Badge variant="outline" className="rounded-full">
                            до {formatDate(t.proSubscription.endsAt)}
                          </Badge>
                        ) : null}
                        {t.status !== 'SUCCESS' ? (
                          <Badge variant="outline" className="rounded-full">
                            {t.status}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <div
                      className={`shrink-0 text-sm font-semibold tabular-nums ${
                        positive ? 'text-secondary' : 'text-foreground'
                      }`}
                    >
                      {positive ? '+' : ''}
                      {formatRub(t.amountRub)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
