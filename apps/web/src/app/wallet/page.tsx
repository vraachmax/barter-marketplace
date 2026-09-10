'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Crown,
  Gift,
  History,
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
import { AccountScreenHeader } from '@/components/account-screen-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';


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

  const [needsLogin, setNeedsLogin] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState(false);

  async function load() {
    const [bal, tx, sub] = await Promise.all([
      apiFetchJson<WalletBalance>('/wallet/balance'),
      apiFetchJson<WalletTransaction[]>('/wallet/transactions?limit=50'),
      apiFetchJson<ProSubscription | null>('/wallet/pro/subscription'),
    ]);
    setLoading(false);
    setError(null);
    setNeedsLogin(false);
    setHistoryError(!tx.ok);
    setSubscriptionError(!sub.ok);
    if (!bal.ok) {
      if (bal.status === 401) {
        setNeedsLogin(true);
        setBalance(null);
        setTxns([]);
        setSubscription(null);
        setError('Войдите в аккаунт, чтобы открыть кошелёк.');
      } else {
        setError('Не удалось обновить баланс. Попробуйте ещё раз.');
      }
      return;
    }
    setBalance(bal.data);
    if (tx.ok) setTxns(tx.data);
    if (sub.ok) setSubscription(sub.data);
  }

  useEffect(() => {
    // load updates state only after awaiting the API responses.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  function refresh() {
    setLoading(true);
    setError(null);
    void load();
  }

  if (error && !balance) {
    return (
      <div className="min-h-screen bg-background text-foreground"><AccountScreenHeader title="Кошелёк" subtitle="Баланс и история операций" /><div className="mx-auto max-w-3xl px-4 pt-6 pb-32">
        <Card className="gap-3 p-6">
          <div className="text-base font-semibold text-foreground">Кошелёк недоступен</div>
          <p className="text-sm text-muted-foreground">{error}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            {needsLogin ? <Button render={<Link href="/auth?next=%2Fwallet" />}>Войти</Button> : <Button onClick={refresh} disabled={loading}>Попробовать снова</Button>}
            <Button variant="outline" render={<Link href="/" />}>
              На главную
            </Button>
          </div>
        </Card>
      </div></div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground"><AccountScreenHeader title="Кошелёк" subtitle="Баланс и история операций" /><div className="mx-auto max-w-5xl px-4 pt-6 pb-32 md:pt-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Кошелёк
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Баланс для продвижения объявлений и подписки Barter Pro
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
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
            <h2 className="text-sm font-semibold">Пополнение пока недоступно</h2>
            <p className="text-sm text-muted-foreground">
              Платёжная система ещё не подключена. Сейчас здесь можно посмотреть баланс и историю операций.
            </p>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
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
            {subscriptionError ? <p role="alert" className="text-sm text-destructive">Не удалось загрузить подписку. Нажмите «Обновить».</p> : loading ? <Skeleton className="h-6 w-40" /> : subscription && subscription.status === 'ACTIVE' ? (
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
          ) : historyError ? (
            <p role="alert" className="p-5 text-sm text-destructive">Не удалось загрузить историю. Нажмите «Обновить».</p>
          ) : txns.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              Операций пока нет.
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
    </div></div>
  );
}
