'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Package } from 'lucide-react';
import { apiFetchJson, type MyListing } from '@/lib/api';
import { AccountScreenHeader } from '@/components/account-screen-header';
import { Button } from '@/components/ui/button';

export default function MyOrdersPage() {
  const [status, setStatus] = useState<'loading' | 'need_auth' | 'ready' | 'error'>('loading');
  const [listings, setListings] = useState<MyListing[]>([]);
  const [tab, setTab] = useState<'sales' | 'purchases'>('sales');
  async function load() {
    const result = await apiFetchJson<MyListing[]>('/listings/my', { signal: AbortSignal.timeout(15000) });
    if (!result.ok) { setStatus(result.status === 401 ? 'need_auth' : 'error'); return; }
    setListings(result.data);
    setStatus('ready');
  }
  useEffect(() => {
    // All updates happen after the API response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);
  const sold = listings.filter(item => item.status === 'SOLD');
  return <div className="min-h-screen bg-background text-foreground">
    <AccountScreenHeader title="Заказы" subtitle="Ваши покупки и завершённые продажи" />
    <main className="mx-auto max-w-3xl px-4 pt-6 pb-32 md:px-6">
      {status === 'loading' ? <div role="status" aria-label="Загружаем заказы" className="h-56 animate-pulse rounded-3xl bg-muted motion-reduce:animate-none" /> : null}
      {status === 'need_auth' ? <section className="rounded-3xl border border-border bg-card p-8 text-center"><Package size={36} className="mx-auto text-primary" aria-hidden /><h2 className="mt-4 text-xl font-semibold">Ваши сделки будут здесь</h2><p className="mt-2 text-sm text-muted-foreground">Войдите, чтобы посмотреть завершённые продажи.</p><Link href="/auth?next=%2Fprofile%2Forders" className="mt-6 inline-flex min-h-13 items-center justify-center rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground">Войти</Link></section> : null}
      {status === 'error' ? <section role="alert" className="rounded-3xl border border-border p-6"><p>Не удалось загрузить заказы.</p><Button className="mt-4" onClick={() => { setStatus('loading'); void load(); }}>Повторить</Button></section> : null}
      {status === 'ready' ? <>
        <div role="group" aria-label="Тип заказов" className="glass-panel grid grid-cols-2 gap-1 rounded-2xl border border-border p-1">
          {([{ id: 'sales', label: 'Продажи' }, { id: 'purchases', label: 'Покупки' }] as const).map(item => <button type="button" key={item.id} aria-pressed={tab === item.id} onClick={() => setTab(item.id)} className="min-h-12 rounded-xl px-3 text-sm font-semibold text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm">{item.label}{item.id === 'sales' ? ` · ${sold.length}` : ''}</button>)}
        </div>
        {tab === 'sales' && sold.length > 0 ? <ul className="mt-5 space-y-3">{sold.map(item => <li key={item.id}><Link href={`/listing/${item.id}`} className="flex min-h-24 items-center gap-4 rounded-3xl border border-border bg-card p-5"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-muted"><Package size={23} aria-hidden /></span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{item.title}</p><p className="mt-1 truncate text-sm text-muted-foreground">{item.city} · {item.category.title}</p><p className="mt-2 text-xs font-medium text-primary">Продано</p></div><ArrowUpRight size={19} className="shrink-0 text-muted-foreground" aria-hidden /></Link></li>)}</ul> :
          <section className="px-5 py-16 text-center"><span className="mx-auto grid size-16 place-items-center rounded-3xl bg-muted"><Package size={29} className="text-muted-foreground" aria-hidden /></span><h2 className="mt-5 text-xl font-semibold">{tab === 'sales' ? 'Пока нет завершённых продаж' : 'Договорённости о покупках в чатах'}</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{tab === 'sales' ? 'Объявления, которые вы отметите как проданные, появятся здесь.' : 'Автоматическая история покупок пока недоступна. Детали ваших договорённостей остаются в переписке.'}</p><Link href={tab === 'sales' ? '/listings' : '/messages'} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-muted px-6 font-semibold">{tab === 'sales' ? 'Мои объявления' : 'К сообщениям'}<ArrowUpRight size={17} aria-hidden /></Link></section>}
      </> : null}
    </main>
  </div>;
}
