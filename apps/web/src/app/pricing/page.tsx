'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Camera,
  Check,
  Crown,
  Loader2,
  Palette,
  Rocket,
  Sparkles,
  Star,
  TrendingUp,
  User as UserIcon,
} from 'lucide-react';
import {
  apiFetchJson,
  apiGetJson,
  type ProPlan,
  type ProSubscription,
  type PromotionAudience,
  type PromotionPackage,
  type PromotionTypeCode,
} from '@/lib/api';
import { AccountScreenHeader } from '@/components/account-screen-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const PROMO_META: Record<
  PromotionTypeCode,
  { icon: typeof Star; label: string; toneBg: string; toneText: string }
> = {
  TOP: { icon: Star, label: 'Топ', toneBg: 'bg-primary/10', toneText: 'text-primary' },
  VIP: { icon: Crown, label: 'VIP', toneBg: 'bg-secondary/15', toneText: 'text-secondary' },
  XL: { icon: Camera, label: 'XL', toneBg: 'bg-accent/15', toneText: 'text-accent' },
  COLOR: {
    icon: Palette,
    label: 'Цветная',
    toneBg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30',
    toneText: 'text-fuchsia-600 dark:text-fuchsia-300',
  },
  LIFT: {
    icon: TrendingUp,
    label: 'Поднятие',
    toneBg: 'bg-sky-100 dark:bg-sky-900/30',
    toneText: 'text-sky-600 dark:text-sky-300',
  },
};

const PLAN_TONE: Record<string, { ring: string; badge: string; cta: string; popular: boolean }> = {
  start: {
    ring: 'ring-border',
    badge: 'bg-muted text-foreground',
    cta: 'bg-foreground text-background hover:bg-foreground/90',
    popular: false,
  },
  pro: {
    ring: 'ring-primary/40',
    badge: 'bg-primary/10 text-primary',
    cta: 'bg-primary text-white hover:bg-primary/90',
    popular: true,
  },
  business: {
    ring: 'ring-accent/40',
    badge: 'bg-accent/15 text-accent',
    cta: 'bg-accent text-white hover:bg-accent/90',
    popular: false,
  },
};

function formatRub(v: number): string {
  return `${Math.round(v).toLocaleString('ru-RU')} ₽`;
}

function formatDuration(seconds: number): string {
  const days = Math.round(seconds / 86400);
  if (days === 1) return '1 день';
  if (days >= 7 && days % 7 === 0) {
    const weeks = days / 7;
    return `${weeks} ${weeks === 1 ? 'неделя' : weeks < 5 ? 'недели' : 'недель'}`;
  }
  return `${days} ${days < 5 ? 'дня' : 'дней'}`;
}

export default function PricingPage() {
  const subscribing = useRef(false);
  const [audience, setAudience] = useState<PromotionAudience>('PERSONAL');
  const [personal, setPersonal] = useState<PromotionPackage[] | null>(null);
  const [business, setBusiness] = useState<PromotionPackage[] | null>(null);
  const [plans, setPlans] = useState<ProPlan[] | null>(null);
  const [activeSub, setActiveSub] = useState<ProSubscription | null>(null);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pers, biz, pl] = await Promise.all([
          apiGetJson<PromotionPackage[]>('/wallet/packages?audience=PERSONAL'),
          apiGetJson<PromotionPackage[]>('/wallet/packages?audience=BUSINESS'),
          apiGetJson<ProPlan[]>('/wallet/pro-plans'),
        ]);
        if (cancelled) return;
        setPersonal(pers);
        setBusiness(biz);
        setPlans(pl);
      } catch {
        if (!cancelled) setError('Не удалось загрузить тарифы');
      }
      // подписка — только если авторизован
      const subRes = await apiFetchJson<ProSubscription | null>('/wallet/pro/subscription');
      if (!cancelled && subRes.ok) setActiveSub(subRes.data ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pkgs = audience === 'PERSONAL' ? personal : business;

  async function subscribe(planCode: string) {
    if (subscribing.current) return;
    subscribing.current = true;
    setBusyPlan(planCode);
    setError(null);
    setInfo(null);
    const res = await apiFetchJson<ProSubscription>('/wallet/pro/subscribe', {
      method: 'POST',
      body: JSON.stringify({ planCode }),
      signal: AbortSignal.timeout(15000),
    });
    subscribing.current = false;
    setBusyPlan(null);
    if (res.ok) {
      setActiveSub(res.data);
      setInfo(`Подписка «${res.data.plan.title}» активирована до ${new Date(res.data.endsAt).toLocaleDateString('ru-RU')}`);
    } else {
      setError(res.message || 'Не удалось оформить подписку');
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground"><AccountScreenHeader title="Тарифы" subtitle="Продвижение и подписка" /><div className="mx-auto max-w-6xl px-4 pt-6 pb-32 sm:pt-8">
      {/* Hero */}
      <div className="mx-auto max-w-3xl text-center">
        <Badge variant="outline" className="mb-3 border-primary/30 text-primary">
          Возможности для продавцов
        </Badge>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Тарифы и продвижение Бартера
        </h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Выберите продвижение для объявления или подходящий лимит размещений.
          Стоимость и срок действия указаны в каждом предложении.
        </p>
      </div>

      {/* Promotion packages */}
      <section className="mt-12">
        <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Платное продвижение</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ускорьте продажу: больше показов, заметнее карточка, верх ленты.
            </p>
          </div>
          <Tabs value={audience} onValueChange={(v) => setAudience(v as PromotionAudience)}>
            <TabsList className="min-h-13 rounded-2xl p-1">
              <TabsTrigger value="PERSONAL" className="min-h-11 gap-2 rounded-xl">
                <UserIcon size={14} strokeWidth={1.8} />
                Частное лицо
              </TabsTrigger>
              <TabsTrigger value="BUSINESS" className="min-h-11 gap-2 rounded-xl">
                <Building2 size={14} strokeWidth={1.8} />
                Бизнес
              </TabsTrigger>
            </TabsList>
            <TabsContent value="PERSONAL" />
            <TabsContent value="BUSINESS" />
          </Tabs>
        </div>

        {pkgs === null ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[148px] w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pkgs.map((pkg) => {
              const meta = PROMO_META[pkg.promotionType] ?? PROMO_META.TOP;
              const Icon = meta.icon;
              return (
                <Card
                  key={pkg.id}
                  className={`group relative flex flex-col gap-3 rounded-3xl border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-md ${pkg.isBundle ? 'ring-1 ring-accent/40' : ''}`}
                >
                  {pkg.isBundle ? (
                    <Badge className="w-fit max-w-full self-start bg-accent/10 text-accent">Пакет</Badge>
                  ) : null}
                  <div className="flex items-center gap-3">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${meta.toneBg} ${meta.toneText}`}>
                      <Icon size={22} strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground">{pkg.title}</p>
                      <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.toneBg} ${meta.toneText}`}>
                          {meta.label}
                        </span>
                        {pkg.weightMultiplier !== 1 ? (
                          <span className="inline-flex items-center gap-1">
                            <Rocket size={11} strokeWidth={1.8} />×{pkg.weightMultiplier} вес
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  {pkg.description ? (
                    <p className="text-xs text-muted-foreground">{pkg.description}</p>
                  ) : null}
                  <div className="mt-auto flex items-end justify-between gap-2">
                    <div>
                      <p className="text-2xl font-extrabold tracking-tight text-foreground">
                        {formatRub(pkg.priceRub)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        за {formatDuration(pkg.durationSec)}
                      </p>
                    </div>
                    <Link
                      href="/listings"
                      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-primary hover:text-white"
                    >
                      Применить
                      <ArrowRight size={12} strokeWidth={2} />
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Pro subscription plans */}
      <section className="mt-16">
        <div className="mb-5 text-center">
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Подписка <span className="text-primary">Бартер Pro</span>
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
            Для тех, кто продаёт регулярно: расширенные лимиты, статистика, поддержка.
          </p>
        </div>

        {error ? (
          <p className="mx-auto mb-4 max-w-md rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}
        {info ? (
          <p className="mx-auto mb-4 max-w-md rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-center text-xs text-green-700 dark:border-green-900/40 dark:bg-green-950/40 dark:text-green-300">
            {info}
          </p>
        ) : null}

        {plans === null ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[360px] w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {plans.map((plan) => {
              const tone = PLAN_TONE[plan.code] ?? PLAN_TONE.start;
              const isCurrent = activeSub?.plan.code === plan.code;
              const features = featuresForPlan(plan);
              return (
                <Card
                  key={plan.id}
                  className={`relative flex flex-col gap-4 rounded-3xl border-border bg-card p-5 ring-1 ${tone.ring} ${tone.popular ? 'shadow-sm' : ''}`}
                >
                  {tone.popular ? (
                    <Badge className="w-fit max-w-full self-start whitespace-normal bg-primary text-primary-foreground">
                      <Sparkles size={12} strokeWidth={1.8} className="mr-1" />
                      Рекомендуем
                    </Badge>
                  ) : null}
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-lg font-bold text-foreground">{plan.title}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone.badge}`}>
                      {plan.listingsLimit == null ? 'Без лимита' : `До ${plan.listingsLimit}`}
                    </span>
                  </div>

                  <div>
                    <p className="text-3xl font-extrabold tracking-tight text-foreground">
                      {formatRub(plan.priceRubPerMonth)}
                    </p>
                    <p className="text-xs text-muted-foreground">за месяц подписки</p>
                  </div>

                  <ul className="space-y-2 text-sm text-foreground">
                    {features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check size={16} strokeWidth={2.2} className="mt-0.5 shrink-0 text-primary" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Button size="lg"
                    type="button"
                    disabled={busyPlan !== null}
                    onClick={() => void subscribe(plan.code)}
                    className="mt-auto w-full"
                  >
                    {busyPlan === plan.code ? (
                      <Loader2 size={16} strokeWidth={2} className="animate-spin" />
                    ) : isCurrent ? (
                      <BadgeCheck size={16} strokeWidth={2} />
                    ) : null}
                    {isCurrent ? 'Продлить подписку' : 'Подключить'}
                  </Button>

                  {isCurrent && activeSub ? (
                    <p className="text-center text-[11px] text-muted-foreground">
                      Активна до {new Date(activeSub.endsAt).toLocaleDateString('ru-RU')}
                    </p>
                  ) : null}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer note */}
      <section className="mt-14 rounded-2xl border border-border bg-muted/40 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Подписка оплачивается с баланса. Баланс и доступность пополнения смотрите в{' '}
          <Link href="/wallet" className="font-semibold text-primary underline-offset-2 hover:underline">
            кошельке
          </Link>
          . Возникли вопросы? Напишите в чат поддержки.
        </p>
      </section>
    </div></div>
  );
}

function featuresForPlan(plan: ProPlan): string[] {
  return [plan.listingsLimit == null ? 'Без лимита активных объявлений' : `До ${plan.listingsLimit} активных объявлений`];
}
