'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Eye, Heart, MessageCircle, MousePointer2, ChevronRight, ChartNoAxesColumnIncreasing } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { apiFetchJson, resolveAssetUrl } from '@/lib/api';
import { AccountScreenHeader } from '@/components/account-screen-header';
import { Button } from '@/components/ui/button';
type Summary = { days: number; totals: { views: number; favorites: number; messages: number; clicks: number }; daily: {day: string; views: number}[]; listings: {id: string; title: string; status: string; image: string | null; views: number; favorites: number; chats: number}[] };
const metrics = [{key:'views',label:'Просмотры',Icon:Eye},{key:'favorites',label:'Сохранения',Icon:Heart},{key:'messages',label:'Сообщения',Icon:MessageCircle},{key:'clicks',label:'Переходы',Icon:MousePointer2}] as const;
export default function AnalyticsPage() {
  const { user, ready } = useAuth();
  const [tab,setTab] = useState<'overview'|'listings'|'audience'>('overview');
  const [days,setDays] = useState(30);
  const [summary,setSummary] = useState<Summary|null>(null);
  const [error,setError] = useState('');
  const [attempt,setAttempt] = useState(0);
  useEffect(() => {
    if (!ready || !user) return;
    const controller = new AbortController();
    setSummary(null);setError('');
    void apiFetchJson<Summary>(`/analytics/seller?days=${days}`, {signal:controller.signal}).then(result => {
      if(controller.signal.aborted) return;
      if(result.ok) setSummary(result.data);
      else setError(result.status === 401 ? 'Войдите снова, чтобы увидеть статистику.' : 'Не удалось загрузить статистику.');
    }).catch(() => {if(!controller.signal.aborted)setError('Не удалось загрузить статистику.');});
    return () => controller.abort();
  },[ready,user?.id,days,attempt]);
  const max = Math.max(1,...(summary?.daily.map(day=>day.views)??[]));
  return <div className="analytics-screen min-h-screen bg-background text-foreground">
    <AccountScreenHeader title="Аналитика" subtitle="Статистика ваших объявлений" showSettings={false} />
    <main className="analytics-main page-content-spacing mx-auto max-w-4xl px-4 pt-4">
      {ready && !user ? <div className="account-empty"><ChartNoAxesColumnIncreasing size={32}/><h2>Статистика ваших объявлений</h2><p>Войдите, чтобы увидеть просмотры, сохранения и обращения.</p><Button render={<Link href="/auth?next=%2Fprofile%2Fanalytics" />}>Войти</Button></div> : <>
      <nav aria-label="Разделы аналитики" className="analytics-tabs">{([{key:'overview',label:'Обзор'},{key:'listings',label:'Объявления'},{key:'audience',label:'Аудитория'}] as const).map(item=><button key={item.key} type="button" aria-pressed={tab===item.key} onClick={()=>setTab(item.key)}>{item.label}</button>)}</nav>
      <label className="analytics-period"><span className="sr-only">Период статистики</span><select value={days} onChange={e=>setDays(Number(e.target.value))}>{[7,30,90].map(n=><option key={n} value={n}>Последние {n} дней</option>)}</select></label>
      {error ? <div role="alert" className="account-empty"><p>{error}</p><Button onClick={()=>setAttempt(n=>n+1)}>Повторить</Button></div> : !summary ? <p role="status" className="py-12 text-center text-muted-foreground">Загрузка статистики…</p> : tab === 'audience' ? <section className="analytics-panel account-empty"><ChartNoAxesColumnIncreasing size={32}/><h2>Данные аудитории пока не собираются</h2><p>Города посетителей, устройства и время активности появятся после подключения этих измерений.</p></section> : tab === 'listings' ? <section className="analytics-list"><p className="mb-3 text-xs text-muted-foreground">Последние 100 объявлений. Просмотры за всё время; текущие сохранения и диалоги.</p>{summary.listings.length===0?<p className="account-empty">Пока нет объявлений.</p>:summary.listings.map(item=><Link className="analytics-list-row" key={item.id} href={`/listing/${item.id}`}>
        {item.image ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={resolveAssetUrl(item.image)??''} alt="" width={76} height={76}/> : <span className="analytics-no-photo">Нет фото</span>}
        <span className="min-w-0 flex-1"><strong className="line-clamp-2">{item.title}</strong><span className="analytics-list-state">{{ACTIVE:'Активно',PENDING:'На проверке',SOLD:'Завершено',ARCHIVED:'В архиве',BLOCKED:'Скрыто'}[item.status]??item.status}</span><span className="analytics-row-metrics"><span><Eye size={13}/>{item.views}</span><span><Heart size={13}/>{item.favorites}</span><span><MessageCircle size={13}/>{item.chats}</span></span></span><ChevronRight size={18}/></Link>)}</section> : <>
        <div className="analytics-metrics">{metrics.map(({key,label,Icon})=><section className="analytics-metric" data-kind={key} key={key}><span className="analytics-metric-icon"><Icon size={23}/></span><div><p>{label}</p><strong>{summary.totals[key].toLocaleString('ru-RU')}</strong></div></section>)}</div>
        <section className="analytics-panel"><h2>Динамика просмотров</h2><strong className="analytics-total">{summary.totals.views.toLocaleString('ru-RU')}</strong><div className="analytics-chart" role="img" aria-label={`Просмотры за ${days} дней: ${summary.totals.views}`}>{summary.daily.map(day=><span key={day.day} title={`${day.day}: ${day.views}`} style={{height:`${day.views/max*100}%`}} />)}</div><div className="flex justify-between text-xs text-muted-foreground"><span>{summary.daily[0]?.day}</span><span>{summary.daily.at(-1)?.day}</span></div><details className="mt-4 text-sm"><summary>Данные по дням</summary><table className="mt-2 w-full"><thead><tr><th className="text-left">Дата, UTC</th><th className="text-right">Просмотры</th></tr></thead><tbody>{summary.daily.map(day=><tr key={day.day}><td>{day.day}</td><td className="text-right">{day.views}</td></tr>)}</tbody></table></details></section>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">Учитываются записанные события, а не уникальные посетители. Дни рассчитаны по UTC. Проценты роста и предложения обмена пока не измеряются.</p>
      </>}
      </>}
    </main>
  </div>;
}
