'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight, MessageSquare, Star } from 'lucide-react';
import { AccountScreenHeader } from '@/components/account-screen-header';
import { apiFetchJson, type MyReviewsResponse } from '@/lib/api';

export default function MyReviewsPage() {
  const [status, setStatus] = useState<'loading' | 'need_auth' | 'ready' | 'error'>('loading');
  const [data, setData] = useState<MyReviewsResponse>({ given: [], received: [] });
  const [tab, setTab] = useState<'received' | 'given'>('received');
  async function load() {
    const res = await apiFetchJson<MyReviewsResponse>('/reviews/my', { signal: AbortSignal.timeout(15000) });
    if (!res.ok) { setStatus(res.status === 401 ? 'need_auth' : 'error'); return; }
    setData(res.data);
    setStatus('ready');
  }
  useEffect(() => {
    // load updates state only after awaiting the API response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);
  const average = data.received.length ? data.received.reduce((sum, r) => sum + r.rating, 0) / data.received.length : null;
  const reviews = tab === 'received' ? data.received : data.given;

  return <div className="min-h-screen bg-background text-foreground">
    <AccountScreenHeader title="Отзывы" subtitle="Репутация складывается из сделок" />

    <main className="mx-auto max-w-3xl px-4 pb-32 pt-6 md:px-6 md:pt-8">
      {status === 'loading' ? <div role="status" aria-label="Загружаем отзывы" className="space-y-4 animate-pulse motion-reduce:animate-none"><div className="h-44 rounded-3xl bg-muted" /><div className="h-14 rounded-2xl bg-muted" /><div className="h-36 rounded-3xl bg-muted" /></div> : null}
      {status === 'need_auth' ? <div className="rounded-3xl border border-border bg-card p-8 text-center"><MessageSquare className="mx-auto mb-4 text-primary" size={36} /><h2 className="text-xl font-bold">Ваши отзывы будут здесь</h2><p className="mt-2 text-sm text-muted-foreground">Войдите, чтобы увидеть оценки и отзывы о сделках.</p><Link href="/auth?next=%2Fprofile%2Freviews" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-primary px-7 font-semibold text-primary-foreground">Войти</Link></div> : null}
      {status === 'error' ? <div role="alert" className="rounded-3xl border border-border bg-card p-6"><p>Не удалось загрузить отзывы.</p><button onClick={() => { setStatus('loading'); void load(); }} className="mt-4 min-h-11 rounded-full bg-primary px-5 font-semibold text-primary-foreground">Повторить</button></div> : null}
      {status === 'ready' ? <>
        <section aria-label="Ваш рейтинг" className="relative overflow-hidden rounded-[28px] border border-border/70 bg-card p-6 shadow-sm md:p-8">
          <div className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full bg-primary/5" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ваша репутация</p>
          <div className="mt-5 flex items-end gap-4">
            <span className="text-6xl font-semibold tracking-tighter">{average === null ? '—' : average.toFixed(1)}</span>
            <div className="pb-1"><div aria-label={average === null ? 'Пока нет оценок' : `Оценка ${average.toFixed(1)} из 5`} className="flex gap-1">{[1, 2, 3, 4, 5].map(value => <Star key={value} size={20} aria-hidden className={average !== null && value <= Math.round(average) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/25'} />)}</div><p className="mt-2 text-sm text-muted-foreground">{data.received.length ? `Получено отзывов: ${data.received.length}` : 'Первая оценка ещё впереди'}</p></div>
          </div>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">Договаривайтесь о деталях, будьте на связи и оставляйте честные отзывы после сделки.</p>
        </section>
        <div role="group" aria-label="Какие отзывы показать" className="glass-panel mt-6 grid grid-cols-2 gap-1 rounded-2xl border border-border p-1">
          {([{ id: 'received', label: 'Обо мне' }, { id: 'given', label: 'Мои отзывы' }] as const).map(item => <button key={item.id} type="button" aria-pressed={tab === item.id} onClick={() => setTab(item.id)} className={`min-h-12 min-w-0 rounded-xl px-3 text-sm font-semibold transition ${tab === item.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{item.label}<span className="ml-2 text-xs text-muted-foreground">{data[item.id].length}</span></button>)}
        </div>
        {reviews.length === 0 ? <div className="px-6 py-16 text-center"><div className="mx-auto grid size-16 place-items-center rounded-3xl bg-muted"><MessageSquare size={29} strokeWidth={1.5} className="text-muted-foreground" /></div><h2 className="mt-5 text-lg font-bold">{tab === 'received' ? 'Здесь будут отзывы о вас' : 'Вы ещё не оставляли отзывы'}</h2><p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{tab === 'received' ? 'После сделки покупатель сможет поделиться впечатлениями.' : 'Отзыв можно оставить на странице продавца после покупки.'}</p><Link href={tab === 'received' ? '/listings' : '/messages'} className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold text-primary">{tab === 'received' ? 'К моим объявлениям' : 'К сообщениям'}<ArrowUpRight size={17} /></Link></div> : <ul className="mt-5 space-y-3">{reviews.map(review => {
          const person = 'author' in review ? review.author : review.seller;
          return <li key={review.id} className="rounded-3xl border border-border/70 bg-card p-5">
            <div className="flex items-center gap-3"><div className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-sm font-bold">{person.name?.[0]?.toUpperCase() ?? 'П'}</div><div className="min-w-0 flex-1"><Link href={`/seller/${person.id}`} className="block truncate font-semibold hover:text-primary">{person.name ?? 'Пользователь'}</Link><time dateTime={review.createdAt} className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</time></div><span aria-label={`Оценка ${review.rating} из 5`} className="flex items-center gap-1 text-sm font-semibold"><Star size={15} className="fill-amber-400 text-amber-400" />{review.rating}</span></div>
            {review.text ? <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere]">{review.text}</p> : null}
            <Link href={`/listing/${review.listing.id}`} className="mt-4 flex min-h-11 items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground"><span className="truncate">{review.listing.title}</span><ArrowUpRight size={16} className="shrink-0" /></Link>
          </li>;
        })}</ul>}
      </> : null}
    </main>
  </div>;
}
