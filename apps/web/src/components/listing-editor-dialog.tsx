'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { Category } from '@/lib/api';

type Fields = { title: string; description: string; city: string; categoryId: string; priceRub: string; isBarter: boolean };

/** Shared editor outside the desktop/mobile wrappers, with native modal focus. */
export function ListingEditorDialog({ values, onChange, categories, onSave, onClose }: {
  values: Fields;
  onChange: (values: Fields) => void;
  categories: Category[];
  onSave: () => Promise<boolean>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { dialog.current?.showModal(); }, []);
  const inputClass = 'mt-1 min-h-11 w-full rounded-xl border border-border bg-muted/50 px-3 py-2 text-base text-foreground focus-visible:outline-2 focus-visible:outline-primary';
  function change<K extends keyof Fields>(key: K, value: Fields[K]) { onChange({ ...values, [key]: value }); }

  return <dialog ref={dialog} aria-labelledby={id} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
    className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-24px)] max-w-lg overflow-y-auto rounded-3xl border border-border bg-background p-5 text-foreground shadow-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm">
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 id={id} className="text-xl font-bold">Редактировать объявление</h2>
      <button type="button" disabled={busy} onClick={onClose} aria-label="Закрыть" className="grid size-11 shrink-0 place-items-center rounded-full bg-muted disabled:opacity-50"><X size={20} aria-hidden /></button>
    </div>
    <form className="space-y-3" onSubmit={async (event) => {
      event.preventDefault();
      if (busy) return;
      setBusy(true); setError('');
      try { if (!await onSave()) setError('Не удалось сохранить изменения. Проверьте поля и повторите.'); }
      catch { setError('Ошибка соединения. Изменения не сохранены, попробуйте снова.'); }
      finally { setBusy(false); }
    }}>
      <fieldset disabled={busy} className="space-y-3 disabled:opacity-60">
        <label className="block text-sm font-medium">Название<input required minLength={3} maxLength={120} value={values.title} onChange={(e) => change('title', e.target.value)} className={inputClass} /></label>
        <label className="block text-sm font-medium">Новое описание<textarea minLength={10} maxLength={5000} value={values.description} onChange={(e) => change('description', e.target.value)} placeholder="Оставьте пустым, чтобы сохранить прежнее" className={`${inputClass} min-h-24`} /></label>
        <label className="block text-sm font-medium">Город<input required minLength={2} maxLength={80} value={values.city} onChange={(e) => change('city', e.target.value)} className={inputClass} /></label>
        <label className="block text-sm font-medium">Категория<select required value={values.categoryId} onChange={(e) => change('categoryId', e.target.value)} className={inputClass}>
          {!categories.some((category) => category.id === values.categoryId) ? <option value={values.categoryId}>Текущая категория</option> : null}
          {categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}
        </select></label>
        <label className="block text-sm font-medium">Цена, ₽<input type="number" min="0" max="2147483647" step="1" value={values.priceRub} onChange={(e) => change('priceRub', e.target.value)} className={inputClass} /></label>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={values.isBarter} onChange={(e) => change('isBarter', e.target.checked)} className="size-5 accent-primary" />Рассматриваю обмен</label>
      </fieldset>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <button type="submit" disabled={busy} className="min-h-12 w-full rounded-full bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-60">{busy ? 'Сохраняем…' : 'Сохранить'}</button>
    </form>
  </dialog>;
}
