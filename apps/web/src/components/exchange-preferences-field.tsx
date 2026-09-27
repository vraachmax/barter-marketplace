'use client';
import type { Category } from '@/lib/api';
import type { ExchangePreferences } from '@/lib/exchange-preferences';
import { canOfferBarter } from '@/lib/barter-category';
import { useId } from 'react';

export function ExchangePreferencesField({ value, onChange, categories }: {
  value: ExchangePreferences; onChange: (value: ExchangePreferences) => void; categories: Category[];
}) {
  const wishesId = useId();
  const field = 'mt-2 min-h-12 w-full rounded-2xl border border-border bg-muted/50 px-4 py-3 text-base text-foreground';
  return <fieldset className="space-y-4 rounded-3xl border border-border p-4">
    <legend className="px-2 text-base font-semibold">Что хотите взамен?</legend>
    <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={value.anyOffer} onChange={e => onChange({ ...value, anyOffer: e.target.checked })} className="size-5 accent-primary" />Рассмотрю любые предложения</label>
    <p className="text-sm text-muted-foreground">Можно выбрать другие категории. Стоимость вещей не ограничивает возможность обмена.</p>
    <details><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">Интересующие категории ({value.wantedCategoryIds.length}/10)</summary>
      <div className="grid gap-2 sm:grid-cols-2">{categories.filter(canOfferBarter).map(c => <label key={c.id} className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" checked={value.wantedCategoryIds.includes(c.id)} disabled={!value.wantedCategoryIds.includes(c.id) && value.wantedCategoryIds.length >= 10}
          onChange={e => onChange({ ...value, wantedCategoryIds: e.target.checked ? [...value.wantedCategoryIds, c.id] : value.wantedCategoryIds.filter(id => id !== c.id) })} className="size-5 accent-primary" />{c.title}
      </label>)}</div>
    </details>
    <div><label htmlFor={wishesId} className="block text-sm font-medium">Пожелания к обмену</label><textarea id={wishesId} maxLength={500} required={!value.anyOffer && value.wantedCategoryIds.length === 0} value={value.wantedDescription} onChange={e => onChange({ ...value, wantedDescription: e.target.value })} className={field + ' min-h-28'} placeholder="Например, фотоаппарат или велосипед. Уточните важные условия." /></div>
    <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={value.canAddCash} onChange={e => onChange({ ...value, canAddCash: e.target.checked, maxCashRub: e.target.checked ? value.maxCashRub : null })} className="size-5 accent-primary" />Могу доплатить</label>
    {value.canAddCash ? <div><label className="block text-sm font-medium">Моя доплата до, ₽<input type="number" min="0" max="2147483647" step="1" value={value.maxCashRub ?? ''} onChange={e => onChange({ ...value, maxCashRub: e.target.value === '' ? null : Number(e.target.value) })} className={field} /></label><p className="mt-2 block text-sm text-muted-foreground">Необязательно. Пустое поле означает, что сумма обсуждается.</p></div> : null}
    <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={value.acceptsCash} onChange={e => onChange({ ...value, acceptsCash: e.target.checked })} className="size-5 accent-primary" />Готов принять доплату</label>
    <p className="text-sm text-muted-foreground">Это пожелания владельца. Окончательные условия согласуются с участником обмена.</p>
  </fieldset>;
}
