'use client';

import { useId } from 'react';
import { tradeModeLabel, type ListingTradeMode } from '@/lib/listing-trade-mode';

const hints = {
  sale: 'Появится в Маркете.',
  barter: 'Появится в Бартере. Продажа за деньги не предлагается.',
  both: 'Одно объявление в обеих лентах, с общими фото и избранным.',
};

export function ListingTradeModeField({ value, onChange, barterAllowed }: {
  value: ListingTradeMode;
  onChange: (mode: ListingTradeMode) => void;
  barterAllowed: boolean;
}) {
  const name = useId();
  if (!barterAllowed) return <p className="text-sm text-muted-foreground">Объявление появится в Маркете. Для этой категории обмен недоступен.</p>;
  return <fieldset className="space-y-3">
    <legend className="mb-3 text-base font-semibold">Как хотите разместить?</legend>
    {(['sale', 'barter', 'both'] as const).map(mode => <label key={mode}
      className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl border p-4 ${value === mode ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
      <input type="radio" name={name} value={mode} checked={value === mode} onChange={() => onChange(mode)}
        className="mt-0.5 size-5 shrink-0 accent-primary" />
      <span><span className="block text-sm font-semibold">{tradeModeLabel(mode)}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{hints[mode]}</span></span>
    </label>)}
  </fieldset>;
}
