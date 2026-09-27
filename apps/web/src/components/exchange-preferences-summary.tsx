import type { ExchangePreferences } from '@/lib/exchange-preferences';
import type { Category } from '@/lib/api';
export function ExchangePreferencesSummary({ value, categories }: { value: ExchangePreferences; categories: Category[] }) {
  const names = value.wantedCategoryIds.map(id => categories.find(c => c.id === id)?.title).filter(Boolean);
  return <section className="space-y-3 rounded-3xl border border-border bg-card p-4 sm:p-6" aria-label="Условия обмена">
    <h2 className="text-lg font-semibold">Что интересно взамен</h2>
    {value.anyOffer ? <p>Рассмотрю любые предложения</p> : null}
    {names.length ? <p className="text-sm">Категории: {names.join(', ')}</p> : value.wantedCategoryIds.length ? <p className="text-sm text-muted-foreground">Категории пожеланий временно недоступны.</p> : null}
    {value.wantedDescription ? <p className="whitespace-pre-wrap break-words text-sm">{value.wantedDescription}</p> : null}
    <p className="text-sm">{value.canAddCash ? value.maxCashRub !== null ? `Владелец может доплатить до ${value.maxCashRub.toLocaleString('ru-RU')} ₽` : 'Владелец может доплатить, сумма обсуждается' : 'Владелец не планирует доплачивать'}</p>
    <p className="text-sm">{value.acceptsCash ? 'Готов принять доплату' : 'Доплата от другой стороны не указана'}</p>
    <p className="text-sm text-muted-foreground">Пожелания не являются подтверждённой сделкой.</p>
  </section>;
}
