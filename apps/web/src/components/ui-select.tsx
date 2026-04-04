'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

type Option = {
  value: string;
  label: string;
};

type UiSelectProps = {
  options: Option[];
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  menuClassName?: string;
  disabled?: boolean;
};

export function UiSelect({
  options,
  name,
  value,
  defaultValue,
  onChange,
  placeholder = 'Выбрать',
  className = '',
  menuClassName = '',
  disabled = false,
}: UiSelectProps) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? options[0]?.value ?? '');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);

  const currentValue = controlled ? (value ?? '') : internalValue;

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (!root.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const currentLabel =
    options.find((o) => o.value === currentValue)?.label ?? options[0]?.label ?? placeholder;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  function selectValue(next: string) {
    if (!controlled) setInternalValue(next);
    onChange?.(next);
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={rootRef} className="relative">
      {name ? <input type="hidden" name={name} value={currentValue} /> : null}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex w-full items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white px-3 text-left text-sm text-zinc-900 ${className} dark:border-zinc-600 dark:bg-slate-900/95 dark:text-zinc-100`}
      >
        <span className="truncate">{currentLabel || placeholder}</span>
        <ChevronDown size={14} strokeWidth={1.8} className="shrink-0 text-zinc-500 opacity-70 dark:text-zinc-400" aria-hidden />
      </button>
      {open ? (
        <div
          className={`absolute left-0 top-full z-50 mt-1 w-full rounded-md border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-600 dark:bg-zinc-950 dark:shadow-black/50 ${menuClassName}`}
        >
          {options.length > 12 ? (
            <div className="mb-1 flex items-center gap-1 rounded-md border border-zinc-200 px-2 dark:border-zinc-600">
              <Search size={16} strokeWidth={1.8} className="shrink-0 text-zinc-500 opacity-80 dark:text-zinc-400" aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-7 w-full bg-transparent text-xs text-zinc-900 outline-none dark:text-zinc-100"
                placeholder="Поиск..."
              />
            </div>
          ) : null}
          <div className="max-h-64 overflow-auto">
            {filtered.map((o) => (
              <button
                key={`${o.value}-${o.label}`}
                type="button"
                onClick={() => selectValue(o.value)}
                className={`block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                  o.value === currentValue
                    ? 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-200'
                    : 'text-zinc-700 dark:text-zinc-200'
                }`}
              >
                {o.label}
              </button>
            ))}
            {filtered.length === 0 ? (
              <div className="px-2 py-2 text-xs text-zinc-500 dark:text-zinc-400">Ничего не найдено</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

