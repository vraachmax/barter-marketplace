'use client';

import { useId, useRef, useState, useSyncExternalStore } from 'react';
import { MapPin, SlidersHorizontal, X } from 'lucide-react';
import type { Category } from '@/lib/api';
import { ThemeQuickToggle } from '@/components/theme-quick-toggle';

function subscribeMode(listener: () => void) {
  window.addEventListener('barter:mode-change', listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener('barter:mode-change', listener);
    window.removeEventListener('storage', listener);
  };
}

export function CatalogControls({ categories, cities, values, categoryId, trigger }: {
  categories: Category[];
  cities: string[];
  values: Record<string, string>;
  categoryId: string;
  trigger: 'city' | 'filters';
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState('');
  const mode = useSyncExternalStore(subscribeMode,
    () => document.documentElement.dataset.mode ?? 'barter', () => 'barter');
  const isCity = trigger === 'city';
  const title = isCity ? 'Где искать' : 'Фильтры';
  const instanceId = useId();
  const id = `catalog-${trigger}-${instanceId}`;
  const inputClass = 'mt-2 h-12 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-primary';

  function changeMode(next: string) {
    try { localStorage.setItem('barter_mode', next); } catch { /* Current session still works. */ }
    document.documentElement.setAttribute('data-mode', next);
    window.dispatchEvent(new CustomEvent('barter:mode-change', { detail: next }));
  }

  return <>
    <button type="button" onClick={() => { setError(''); dialog.current?.showModal(); }}
      aria-label={isCity ? `Город: ${values.city || 'Вся Россия'}. Изменить` : 'Открыть фильтры'}
      className={isCity ? 'flex min-h-11 min-w-0 items-center gap-1.5 rounded-full px-2 text-sm text-foreground hover:bg-muted' : 'glass-panel grid size-12 shrink-0 place-items-center rounded-full text-foreground hover:bg-muted'}>
      {isCity ? <><MapPin size={18} className="shrink-0" aria-hidden /><span className="max-w-28 truncate md:max-w-40">{values.city || 'Вся Россия'}</span></> : <SlidersHorizontal size={22} strokeWidth={1.7} aria-hidden />}
    </button>
    <dialog ref={dialog} aria-labelledby={`${id}-title`} onClick={(e) => { if (e.target === e.currentTarget) dialog.current?.close(); }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border border-border bg-background p-0 text-foreground shadow-xl backdrop:bg-black/30 backdrop:backdrop-blur-sm md:inset-0 md:m-auto md:max-w-lg md:rounded-3xl">
      <div className="p-5 pb-[max(24px,env(safe-area-inset-bottom))] md:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 id={`${id}-title`} className="text-xl font-bold">{title}</h2>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Закрыть" className="grid size-11 place-items-center rounded-full bg-muted"><X size={21} aria-hidden /></button>
        </div>
        <form action="/" method="GET" onSubmit={(event) => {
          const data = new FormData(event.currentTarget);
          const min = String(data.get('priceMin') ?? '');
          const max = String(data.get('priceMax') ?? '');
          if (min && max && Number(min) > Number(max)) {
            event.preventDefault(); setError('Цена «от» не должна превышать цену «до».'); return;
          }
          setError('');
        }} className="space-y-4">
          {Object.entries(values).filter(([key]) => isCity ? key !== 'city' : !['city', 'priceMin', 'priceMax', 'sort'].includes(key)).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
          {isCity && categoryId ? <input type="hidden" name="categoryId" value={categoryId} /> : null}
          <label className="block text-sm font-medium">Город
            <input name="city" list={`${id}-cities`} defaultValue={values.city ?? ''} placeholder="Вся Россия" autoComplete="off" className={inputClass} />
            <datalist id={`${id}-cities`}>{cities.filter(Boolean).map((city) => <option key={city} value={city} />)}</datalist>
          </label>
          <p className="text-xs text-muted-foreground">Оставьте поле пустым, чтобы искать по всей России.</p>
          {!isCity ? <>
            <label className="block text-sm font-medium">Категория
              <select name="categoryId" defaultValue={categoryId} className={inputClass}>
                <option value="">Все категории</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}
              </select>
            </label>
            <fieldset><legend className="text-sm font-medium">Цена, ₽</legend>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm text-muted-foreground">От<input name="priceMin" type="number" min="0" step="1" defaultValue={values.priceMin} inputMode="numeric" className={inputClass} /></label>
                <label className="text-sm text-muted-foreground">До<input name="priceMax" type="number" min="0" step="1" defaultValue={values.priceMax} inputMode="numeric" className={inputClass} /></label>
              </div>
            </fieldset>
            <label className="block text-sm font-medium">Сортировка
              <select name="sort" defaultValue={values.sort ?? 'relevant'} className={inputClass}>
                <option value="relevant">По релевантности</option><option value="new">Сначала новые</option>
                <option value="cheap">Сначала дешёвые</option><option value="expensive">Сначала дорогие</option>
                {values.lat && values.lon ? <option value="nearby">По расстоянию</option> : null}
              </select>
            </label>
          </> : null}
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <button type="submit" className="h-12 w-full rounded-full bg-primary px-5 text-base font-semibold text-primary-foreground hover:bg-primary/90">Показать объявления</button>
        </form>
        {!isCity ? <div className="mt-6 space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between"><span className="text-sm font-medium">Светлая / тёмная тема</span><ThemeQuickToggle /></div>
          <fieldset><legend className="mb-2 text-sm font-medium">Цвет оформления</legend>
            <div className="glass-panel flex rounded-full p-1">
              {([['barter', 'Оранжевый'], ['market', 'Синий']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => changeMode(value)} className="min-h-11 flex-1 rounded-full text-sm text-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground">{label}</button>)}
            </div>
          </fieldset>
        </div> : null}
      </div>
    </dialog>
  </>;
}
