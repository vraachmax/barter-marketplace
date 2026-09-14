'use client';

import Link from 'next/link';
import { Share2, Flag, Check } from 'lucide-react';
import { useRef, useState } from 'react';
import { apiFetchJson } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';
import { listingLoginHref } from '@/lib/listing-presentation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export function ListingShareButton({ title }: { title: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'fallback'>('idle');
  const [url, setUrl] = useState('');
  const lock = useRef(false);
  async function share() {
    if (lock.current) return;
    lock.current = true;
    const href = window.location.href;
    setUrl(href);
    try {
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ title, url: href });
          return;
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') return;
        }
      }
      try {
        await navigator.clipboard.writeText(href);
        setState('copied');
      } catch {
        setState('fallback');
      }
    } finally { lock.current = false; }
  }
  return (
    <Dialog open={state === 'fallback'} onOpenChange={(open) => { if (!open) setState('idle'); }}>
      <Button type="button" variant="ghost" size="sm" aria-label={state === 'copied' ? 'Ссылка скопирована' : 'Поделиться'} onClick={() => void share()}>
        {state === 'copied' ? <Check size={18} aria-hidden /> : <Share2 size={18} aria-hidden />}
        <span role="status">{state === 'copied' ? 'Ссылка скопирована' : 'Поделиться'}</span>
      </Button>
      <DialogContent>
        <DialogHeader><DialogTitle>Ссылка на объявление</DialogTitle><DialogDescription>Не удалось скопировать автоматически. Выделите и скопируйте ссылку.</DialogDescription></DialogHeader>
        <Input readOnly value={url} aria-label="Ссылка на объявление" onFocus={(event) => event.currentTarget.select()} />
      </DialogContent>
    </Dialog>
  );
}

export function ListingReportButton({ listingId, title }: { listingId: string; title: string }) {
  const { user, ready } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('Недостоверная информация');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error' | 'unauthorized'>('idle');
  const lock = useRef(false);
  async function send() {
    if (lock.current) return;
    lock.current = true;
    setState('sending');
    try {
      const result = await apiFetchJson(`/listings/${listingId}/report`, {
        method: 'POST', body: JSON.stringify({ reason }), signal: AbortSignal.timeout(15000),
      });
      setState(result.ok ? 'done' : result.status === 401 ? 'unauthorized' : 'error');
    } finally { lock.current = false; }
  }
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!lock.current) setOpen(next); }}>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}><Flag size={18} aria-hidden />Пожаловаться</DialogTrigger>
      <DialogContent showCloseButton={state !== 'sending'}>
        <DialogHeader><DialogTitle>Жалоба на объявление</DialogTitle><DialogDescription>{title}</DialogDescription></DialogHeader>
        {state === 'done' ? <p role="status" className="text-base">Жалоба отправлена на рассмотрение.</p> : !ready ? <p role="status">Проверяем вход…</p> : !user || state === 'unauthorized' ? <p className="text-base">Войдите, чтобы отправить жалобу.</p> : <>
          <label htmlFor={`report-reason-${listingId}`} className="text-sm font-medium">Причина</label>
          <select id={`report-reason-${listingId}`} value={reason} disabled={state === 'sending'} onChange={(e) => setReason(e.target.value)} className="min-h-12 w-full rounded-2xl border border-border bg-background px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-primary">
            {['Недостоверная информация', 'Запрещённый товар или услуга', 'Подозрение на мошенничество', 'Другое нарушение'].map((value) => <option key={value}>{value}</option>)}
          </select>
          {state === 'error' ? <p role="alert" className="text-sm text-destructive">Не удалось отправить жалобу. Попробуйте ещё раз.</p> : null}
        </>}
        <DialogFooter>
          <Button variant="secondary" size="lg" onClick={() => setOpen(false)} disabled={state === 'sending'}>{state === 'done' ? 'Готово' : 'Отмена'}</Button>
          {state !== 'done' && ready ? !user || state === 'unauthorized'
            ? <Button size="lg" render={<Link href={listingLoginHref(listingId)} />}>Войти</Button>
            : <Button size="lg" onClick={() => void send()} disabled={state === 'sending'} aria-busy={state === 'sending'}>{state === 'sending' ? 'Отправляем…' : 'Отправить жалобу'}</Button>
            : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
