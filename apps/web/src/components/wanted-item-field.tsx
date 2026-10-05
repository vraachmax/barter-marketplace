'use client';

import { useEffect, useId } from 'react';
import Link from 'next/link';
import type { Category } from '@/lib/api';
import type { WantedItem } from '@/lib/exchange-preferences';
import { canOfferBarter } from '@/lib/barter-category';
import { changeCatalogAttribute } from '@/lib/listing-attributes-config';
import { useListingAttributeCatalog } from '@/hooks/use-listing-attribute-catalog';
import ListingCategoryAttributesForm from '@/components/listing-category-attributes-form';
import { Button } from '@/components/ui/button';

export function wantedItemStatusKey(index: number, item: WantedItem) {
  return JSON.stringify([index, item.categoryId, item.attributes]);
}

export function WantedItemField({ item, index, categories, onChange, onRemove, onStatus }: {
  item: WantedItem; index: number; categories: Category[];
  onChange: (item: WantedItem) => void; onRemove: () => void;
  onStatus: (key: string, blocked: boolean) => void;
}) {
  const id = useId();
  const category = categories.find(c => c.id === item.categoryId);
  const catalog = useListingAttributeCatalog(item.categoryId, category?.rootSlug ?? category?.slug ?? '', item.attributes);
  // Wishes accept only fields explicitly managed by this category's API schema.
  const fields = catalog.schema?.fields.filter(field => field.fieldType === 'select') ?? [];
  const sections = catalog.sections.map(section => ({ ...section, fields: section.fields.filter(field => fields.some(f => f.key === field.key)) })).filter(section => section.fields.length);
  const invalid = Object.entries(item.attributes).some(([key, value]) =>
    !fields.some(field => field.key === key) || !catalog.choices.some(option => option.fieldKey === key && option.value === value &&
      (!option.parentFieldKey || item.attributes[option.parentFieldKey] === option.parentValue)));
  const blocked = Boolean(!category || catalog.loading || catalog.error || invalid || !fields.length);
  const statusKey = wantedItemStatusKey(index, item);
  useEffect(() => { onStatus(statusKey, blocked); }, [statusKey, blocked, onStatus]);
  return <fieldset aria-label={`Конкретное пожелание ${index + 1}`} className="space-y-4 rounded-2xl border border-border p-3 [color-scheme:light] dark:[color-scheme:dark]">
    <legend className="px-1 text-sm font-semibold">Вариант {index + 1}</legend>
    <label htmlFor={id} className="block text-sm font-medium">Категория желаемой вещи</label>
    <select id={id} value={item.categoryId} onChange={e => onChange({ categoryId: e.target.value, attributes: {} })} className="min-h-12 w-full rounded-2xl border border-border bg-muted/50 px-3 text-base text-foreground">
      <option value="">Выберите категорию</option>
      {item.categoryId && !category ? <option value={item.categoryId}>Категория недоступна</option> : null}
      {categories.filter(canOfferBarter).map(c => <option key={c.id} value={c.id}>{c.parentId ? `${categories.find(parent => parent.id === c.parentId)?.title ?? 'Категория'} · ` : ''}{c.title}</option>)}
    </select>
    {catalog.loading ? <p role="status" className="text-sm text-muted-foreground">Загружаем справочник пожелания…</p> : null}
    {catalog.error ? <div><p role="alert" className="text-sm text-destructive">{catalog.error}</p><Button type="button" variant="outline" onClick={catalog.retry}>Повторить загрузку пожелания</Button></div> : null}
    {category && !catalog.loading && !catalog.error && !fields.length ? <p className="text-sm text-muted-foreground">В этой категории пока нет справочника характеристик. Укажите её в интересующих категориях или опишите пожелание текстом.</p> : null}
    {invalid && !catalog.loading && !catalog.error ? <p role="alert" className="text-sm text-destructive">Сохранённый вариант недоступен. Выберите характеристики заново или удалите пожелание.</p> : null}
    <fieldset disabled={catalog.loading || Boolean(catalog.error)}>
      <ListingCategoryAttributesForm sections={sections} values={item.attributes} onFieldChange={(key, value) => {
        const attributes = changeCatalogAttribute(item.attributes, key, value, catalog.choices, catalog.schema);
        onChange({ ...item, attributes: Object.fromEntries(Object.entries(attributes).filter(([, val]) => val !== '')) });
      }} />
    </fieldset>
    {fields.some(field => field.key === 'auto_make') ? <p className="text-xs text-muted-foreground">Каталог авто неполный. <Link href="/vehicle-data" target="_blank" rel="noopener noreferrer" className="underline">Источник данных</Link></p> : null}
    <Button type="button" variant="outline" onClick={onRemove}>Удалить пожелание {index + 1}</Button>
  </fieldset>;
}
