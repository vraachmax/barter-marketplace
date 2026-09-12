'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import Link from 'next/link';
import type { Category } from '@/lib/api';
import { canOfferBarter } from '@/lib/barter-category';

type Fields = { title: string; description: string; city: string; categoryId: string; priceRub: string; isBarter: boolean };

/** Shared editor outside the desktop/mobile wrappers, with native modal focus. */
export function ListingEditorDialog({ values, onChange, categories, onSave, onClose, saveError, authHref }: {
  values: Fields;
  onChange: (values: Fields) => void;
  categories: Category[];
  onSave: () => Promise<boolean>;
  onClose: () => void;
  saveError?: string;
  authHref?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { dialog.current?.showModal(); }, []);
  const inputClass = 'mt-1 min-h-12 w-full rounded-2xl border border-border bg-muted/50 px-4 py-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-primary';
  function change<K extends keyof Fields>(key: K, value: Fields[K]) { onChange({ ...values, [key]: value }); }

  return <dialog ref={dialog} aria-labelledby={id} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
    className="fixed inset-0 m-auto max-h-[calc(100dvh-24px)] w-[calc(100%-24px)] max-w-lg overflow-y-auto overscroll-contain rounded-3xl border border-border bg-background p-0 text-foreground shadow-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm">
    <div className="glass-panel sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
      <h2 id={id} className="text-lg font-semibold">Редактировать объявление</h2>
      <Button variant="ghost" size="icon" type="button" disabled={busy} onClick={onClose} aria-label="Закрыть"><X size={20} aria-hidden /></Button>
    </div>
    <form onSubmit={async (event) => {
      event.preventDefault();
      if (submitting.current) return;
      submitting.current = true;
      setBusy(true); setError('');
      try { if (!await onSave()) setError('Не удалось сохранить изменения. Проверьте поля и повторите.'); }
      catch { setError('Не удалось подтвердить сохранение. Обновите список перед повторной попыткой.'); }
      finally { submitting.current = false; setBusy(false); }
    }}>
      <fieldset disabled={busy} className="space-y-4 px-4 py-5 disabled:opacity-60 sm:px-6">
        <label className="block text-sm font-medium">Название<input required minLength={3} maxLength={120} value={values.title} onChange={(e) => change('title', e.target.value)} className={inputClass} /></label>
        <label className="block text-sm font-medium">Новое описание<textarea minLength={10} maxLength={5000} value={values.description} onChange={(e) => change('description', e.target.value)} placeholder="Оставьте пустым, чтобы сохранить прежнее" className={`${inputClass} min-h-28`} /></label>
        <label className="block text-sm font-medium">Город<input required minLength={2} maxLength={80} value={values.city} onChange={(e) => change('city', e.target.value)} className={inputClass} /></label>
        <label className="block text-sm font-medium">Категория<select required value={values.categoryId} onChange={(e) => onChange({ ...values, categoryId: e.target.value, isBarter: canOfferBarter(categories.find((category) => category.id === e.target.value)) && values.isBarter })} className={inputClass}>
          {!categories.some((category) => category.id === values.categoryId) ? <option value={values.categoryId}>Текущая категория</option> : null}
          {categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}
        </select></label>
        <label className="block text-sm font-medium">Цена, ₽<input type="number" min="0" max="2147483647" step="1" value={values.priceRub} onChange={(e) => change('priceRub', e.target.value)} className={inputClass} /></label>
        {canOfferBarter(categories.find((category) => category.id === values.categoryId)) ? <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={values.isBarter} onChange={(e) => change('isBarter', e.target.checked)} className="size-5 accent-primary" />Рассматриваю обмен</label> : <p className="text-sm text-muted-foreground">Для этой категории обмен недоступен.</p>}
      </fieldset>
      <div className="glass-panel sticky bottom-0 space-y-3 border-t border-border px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
      {saveError || error ? <p role="alert" className="text-sm text-destructive">{saveError || error}</p> : null}
      {authHref ? <Link href={authHref} className="inline-flex min-h-11 items-center text-primary underline">Войти снова</Link> : null}
      <Button type="submit" size="lg" disabled={busy} aria-busy={busy} className="w-full">{busy ? 'Сохраняем…' : 'Сохранить'}</Button>
      </div>
    </form>
  </dialog>;
}
