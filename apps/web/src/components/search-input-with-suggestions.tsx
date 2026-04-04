'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Clock, LayoutGrid, Search } from 'lucide-react';

const HISTORY_KEY = 'barter_search_history';
const MAX_HISTORY = 10;

function getHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function addToHistory(q: string) {
  const trimmed = q.trim();
  if (!trimmed || trimmed.length < 2) return;
  const prev = getHistory().filter((h) => h.toLowerCase() !== trimmed.toLowerCase());
  const next = [trimmed, ...prev].slice(0, MAX_HISTORY);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
}

function clearHistory() {
  try { localStorage.removeItem(HISTORY_KEY); } catch {}
}

type Suggestion = {
  text: string;
  type: 'api' | 'category' | 'history';
};

type Props = {
  name?: string;
  formKey?: string;
  defaultValue?: string;
  className?: string;
  placeholder?: string;
  categories?: Array<{ id: string; title: string }>;
};

export function SearchInputWithSuggestions({
  name = 'q',
  formKey = '',
  defaultValue = '',
  className,
  placeholder,
  categories,
}: Props) {
  const [value, setValue] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setValue(defaultValue); }, [defaultValue, formKey]);

  const buildSuggestions = useCallback(async (q: string) => {
    const trimmed = q.trim();
    const result: Suggestion[] = [];

    if (trimmed.length < 2) {
      const history = getHistory();
      if (history.length > 0) {
        for (const h of history.slice(0, 5)) result.push({ text: h, type: 'history' });
      }
      if (categories) {
        const lower = trimmed.toLowerCase();
        for (const c of categories) {
          if (!lower || c.title.toLowerCase().includes(lower)) {
            result.push({ text: c.title, type: 'category' });
            if (result.length >= 8) break;
          }
        }
      }
      setItems(result);
      return;
    }

    const history = getHistory()
      .filter((h) => h.toLowerCase().includes(trimmed.toLowerCase()))
      .slice(0, 3);
    for (const h of history) result.push({ text: h, type: 'history' });

    if (categories) {
      const lower = trimmed.toLowerCase();
      for (const c of categories) {
        if (c.title.toLowerCase().includes(lower) && !result.some((r) => r.text.toLowerCase() === c.title.toLowerCase())) {
          result.push({ text: c.title, type: 'category' });
          if (result.length >= 10) break;
        }
      }
    }

    try {
      const res = await fetch(`/search/suggestions?q=${encodeURIComponent(trimmed)}&limit=6`);
      const data = await res.json();
      if (Array.isArray(data.suggestions)) {
        for (const s of data.suggestions) {
          if (!result.some((r) => r.text.toLowerCase() === s.toLowerCase())) {
            result.push({ text: s, type: 'api' });
          }
        }
      }
    } catch {}

    setItems(result.slice(0, 10));
  }, [categories]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void buildSuggestions(value), 180);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [value, buildSuggestions]);

  const select = useCallback((text: string) => {
    setValue(text);
    addToHistory(text);
    setOpen(false);
    setActiveIdx(-1);
    const form = inputRef.current?.closest('form');
    if (form) setTimeout(() => form.requestSubmit(), 30);
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open || items.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      select(items[activeIdx].text);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }, [open, items, activeIdx, select]);

  const showDropdown = open && items.length > 0;
  const hasHistory = items.some((i) => i.type === 'history') && value.trim().length < 2;

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        name={name}
        value={value}
        onChange={(e) => { setValue(e.target.value); setOpen(true); setActiveIdx(-1); }}
        onFocus={() => { setOpen(true); void buildSuggestions(value); }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onKeyDown={onKeyDown}
        className={className}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
      />
      {showDropdown ? (
        <div className="absolute left-0 right-0 top-full z-[60] mt-1.5 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-xl shadow-zinc-200/50 dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/40">
          {hasHistory ? (
            <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-1.5 dark:border-zinc-800">
              <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Недавние</span>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); clearHistory(); setItems([]); }}
                className="text-[10px] font-semibold text-zinc-400 hover:text-red-500"
              >
                Очистить
              </button>
            </div>
          ) : null}
          <ul role="listbox" className="max-h-72 overflow-auto py-1">
            {items.map((item, i) => (
              <li key={`${item.type}-${item.text}`} role="option" aria-selected={i === activeIdx}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition ${
                    i === activeIdx
                      ? 'bg-sky-50 text-sky-900 dark:bg-sky-950/50 dark:text-sky-100'
                      : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                  onMouseDown={(e) => { e.preventDefault(); select(item.text); }}
                  onMouseEnter={() => setActiveIdx(i)}
                >
                  {item.type === 'history' ? (
                    <Clock size={16} strokeWidth={1.8} className="shrink-0 text-zinc-500 opacity-80 dark:text-zinc-400" aria-hidden />
                  ) : item.type === 'category' ? (
                    <LayoutGrid size={16} strokeWidth={1.8} className="shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
                  ) : (
                    <Search size={16} strokeWidth={1.8} className="shrink-0 text-zinc-500 opacity-80 dark:text-zinc-400" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1 truncate">{item.text}</span>
                  {item.type === 'category' ? (
                    <span className="shrink-0 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
                      категория
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
