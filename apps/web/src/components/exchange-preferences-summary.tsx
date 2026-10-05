import type { ExchangePreferences } from '@/lib/exchange-preferences';
import type { Category } from '@/lib/api';
import { WantedItemSummary } from '@/components/wanted-item-summary';
import Link from 'next/link';
export function ExchangePreferencesSummary({ value, categories }: { value: ExchangePreferences; categories: Category[] }) {
  const names = value.wantedCategoryIds.map(id => categories.find(c => c.id === id)?.title).filter(Boolean);
  return <section className="space-y-3 rounded-3xl border border-border bg-card p-4 sm:p-6" aria-label="Условия обмена">
    <h2 className="text-lg font-semibold">Что интересно взамен</h2>
    {value.anyOffer ? <p>Рассмотрю любые предложения</p> : null}
    {value.wantedItems?.length ? <div><p className="text-sm text-muted-foreground">Конкретные пожелания, любой из вариантов:</p><ul className="mt-2 space-y-3">{value.wantedItems.map((item, index) => <WantedItemSummary key={index} item={item} category={categories.find(c => c.id === item.categoryId)} />)}</ul></div> : null}
    {value.wantedItems?.some(item => item.attributes.auto_make) ? <p className="text-xs text-muted-foreground">Каталог авто неполный. <Link href="/vehicle-data" className="underline">Источник данных</Link></p> : null}
    {names.length ? <p className="text-sm">Категории: {names.join(', ')}</p> : value.wantedCategoryIds.length ? <p className="text-sm text-muted-foreground">Категории пожеланий временно недоступны.</p> : null}
    {value.wantedDescription ? <p className="whitespace-pre-wrap break-words text-sm">{value.wantedDescription}</p> : null}
    <p className="text-sm">{value.canAddCash ? value.maxCashRub !== null ? `Владелец может доплатить до ${value.maxCashRub.toLocaleString('ru-RU')} ₽` : 'Владелец может доплатить, сумма обсуждается' : 'Владелец не планирует доплачивать'}</p>
    <p className="text-sm">{value.acceptsCash ? 'Готов принять доплату' : 'Доплата от другой стороны не указана'}</p>
    <p className="text-sm text-muted-foreground">Пожелания не являются подтверждённой сделкой.</p>
  </section>;
}
