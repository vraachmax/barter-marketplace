'use client';
import type { Category } from '@/lib/api';
import type { WantedItem } from '@/lib/exchange-preferences';
import { useListingAttributeCatalog } from '@/hooks/use-listing-attribute-catalog';

export function WantedItemSummary({ item, category }: { item: WantedItem; category?: Category }) {
  const catalog = useListingAttributeCatalog(item.categoryId, category?.rootSlug ?? category?.slug ?? '', item.attributes);
  return <li className="space-y-1 text-sm">
    <p className="font-medium">{category?.title ?? 'Категория временно недоступна'}</p>
    <p>{Object.entries(item.attributes).map(([key, value]) => {
      const label = catalog.schema?.fields.find(field => field.key === key)?.label ?? key;
      const option = catalog.choices.find(option => option.fieldKey === key && option.value === value && (!option.parentFieldKey || item.attributes[option.parentFieldKey] === option.parentValue));
      return `${label}: ${option?.label ?? value}`;
    }).join(' · ')}</p>
    {catalog.error ? <p className="text-xs text-muted-foreground">Названия справочника недоступны, показаны сохранённые коды.</p> : null}
  </li>;
}
