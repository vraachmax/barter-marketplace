'use client';
import { ExchangePreferencesField } from '@/components/exchange-preferences-field';
import { exchangePreferencesError, type ExchangePreferences } from '@/lib/exchange-preferences';
import { ListingTradeModeField } from '@/components/listing-trade-mode-field';
import { type ListingTradeMode } from '@/lib/listing-trade-mode';


import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import Link from 'next/link';
import type { Category } from '@/lib/api';
import { canOfferBarter } from '@/lib/barter-category';
import ListingCategoryAttributesForm from '@/components/listing-category-attributes-form';
import { useListingAttributeCatalog } from '@/hooks/use-listing-attribute-catalog';
import { changeCatalogAttribute, validateListingAttributes } from '@/lib/listing-attributes-config';
import { attributeFormValues, editedListingAttributes, withUnchangedAttributeValues } from '@/lib/listing-attributes-config';

type Fields = { title: string; description: string; city: string; categoryId: string; priceRub: string; tradeMode: ListingTradeMode; exchangePreferences: ExchangePreferences; attributeValues: Record<string, string> };

/** Shared editor outside the desktop/mobile wrappers, with native modal focus. */
export function ListingEditorDialog({ values, onChange, categories, onSave, onClose, saveError, authHref, originalAttributes, originalCategoryId }: {
  values: Fields;
  onChange: (values: Fields) => void;
  categories: Category[];
  onSave: (attributes: Record<string, unknown>) => Promise<boolean>;
  onClose: () => void;
  saveError?: string;
  authHref?: string;
  originalAttributes: Record<string, unknown>;
  originalCategoryId: string;
}) {
  const category = categories.find(item => item.id === values.categoryId);
  const catalog = useListingAttributeCatalog(values.categoryId, category?.rootSlug ?? category?.slug ?? '', values.attributeValues);
  const retainedAttributes = values.categoryId === originalCategoryId ? originalAttributes : {};
  const sections = withUnchangedAttributeValues(catalog.sections, values.attributeValues, attributeFormValues(retainedAttributes));
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
      if (submitting.current || catalog.loading || catalog.error) return;
      const attributeError = validateListingAttributes(sections, values.attributeValues, values.priceRub);
      if (attributeError) { setError(attributeError); return; }
      const preferencesError = values.tradeMode === 'sale' ? null : exchangePreferencesError(values.exchangePreferences);
      if (preferencesError) { setError(preferencesError); return; }
      submitting.current = true;
      setBusy(true); setError('');
      try { if (!await onSave(editedListingAttributes(sections, values.attributeValues, retainedAttributes))) setError('Не удалось сохранить изменения. Проверьте поля и повторите.'); }
      catch { setError('Не удалось подтвердить сохранение. Обновите список перед повторной попыткой.'); }
      finally { submitting.current = false; setBusy(false); }
    }}>
      <fieldset disabled={busy} className="space-y-4 px-4 py-5 disabled:opacity-60 sm:px-6">
        <label className="block text-sm font-medium">Название<input required minLength={3} maxLength={120} value={values.title} onChange={(e) => change('title', e.target.value)} className={inputClass} /></label>
        <label className="block text-sm font-medium">Новое описание<textarea minLength={10} maxLength={5000} value={values.description} onChange={(e) => change('description', e.target.value)} placeholder="Оставьте пустым, чтобы сохранить прежнее" className={`${inputClass} min-h-28`} /></label>
        <label className="block text-sm font-medium">Город<input required minLength={2} maxLength={80} value={values.city} onChange={(e) => change('city', e.target.value)} className={inputClass} /></label>
        <label className="block text-sm font-medium">Категория<select required value={values.categoryId} onChange={(e) => onChange({ ...values, categoryId: e.target.value, attributeValues: {}, tradeMode: canOfferBarter(categories.find((category) => category.id === e.target.value)) ? values.tradeMode : 'sale' })} className={inputClass}>
          {!categories.some((category) => category.id === values.categoryId) ? <option value={values.categoryId}>Текущая категория</option> : null}
          {categories.map((category) => <option key={category.id} value={category.id}>{category.parentId ? `${categories.find((parent) => parent.id === category.parentId)?.title ?? 'Категория'} · ` : ''}{category.title}</option>)}
        </select></label>
        {values.categoryId !== originalCategoryId ? <p className="text-sm text-muted-foreground">Категория изменена. Заполните характеристики заново.</p> : null}
        <label className="block text-sm font-medium">{values.tradeMode === 'barter' ? 'Оценочная стоимость, ₽' : 'Цена, ₽'}<input type="number" min="0" max="2147483647" step="1" value={values.priceRub} onChange={(e) => change('priceRub', e.target.value)} className={inputClass} /></label>
        <ListingTradeModeField value={values.tradeMode} onChange={(mode) => change('tradeMode', mode)} barterAllowed={canOfferBarter(categories.find((category) => category.id === values.categoryId))} />
        {values.tradeMode !== 'sale' ? <ExchangePreferencesField value={values.exchangePreferences} onChange={v => change('exchangePreferences', v)} categories={categories} /> : null}
        {catalog.loading ? <p role="status" className="text-sm text-muted-foreground">Загружаем характеристики…</p> : null}
        {catalog.error ? <div><p role="alert" className="text-sm text-destructive">{catalog.error}</p><Button type="button" variant="outline" onClick={catalog.retry}>Повторить загрузку характеристик</Button></div> : null}
        <fieldset disabled={catalog.loading || Boolean(catalog.error)}>
          <ListingCategoryAttributesForm sections={sections} values={values.attributeValues} onFieldChange={(key, value) => change('attributeValues', changeCatalogAttribute(values.attributeValues, key, value, catalog.choices, catalog.schema))} />
        </fieldset>
        {catalog.schema?.fields.some(field => field.key === 'auto_make') ? <p className="text-xs text-muted-foreground">Справочник марок и моделей неполный. <Link href="/vehicle-data" target="_blank" rel="noopener noreferrer" className="underline">Источник данных</Link></p> : null}
      </fieldset>
      <div className="glass-panel sticky bottom-0 space-y-3 border-t border-border px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
      {saveError || error ? <p role="alert" className="text-sm text-destructive">{saveError || error}</p> : null}
      {authHref ? <Link href={authHref} className="inline-flex min-h-11 items-center text-primary underline">Войти снова</Link> : null}
      <Button type="submit" size="lg" disabled={busy || catalog.loading || Boolean(catalog.error)} aria-busy={busy} className="w-full">{busy ? 'Сохраняем…' : 'Сохранить'}</Button>
      </div>
    </form>
  </dialog>;
}
