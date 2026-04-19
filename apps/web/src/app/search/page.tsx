'use client';

/**
 * /search — мобильный поиск в стиле Avito (Hotfix #14).
 *
 * Раньше /search не существовал — кнопка «Поиск» в шапке /listings и
 * bottom-nav вела в никуда (404). Теперь — полноценная страница:
 *
 *   1. Sticky-хедер с back-кнопкой и большим input (auto-focus).
 *   2. Пустой state: «Недавние» (localStorage) + «Популярные категории»
 *      (4-col grid), популярные запросы.
 *   3. При вводе ≥2 символов: live-подсказки (`/search/suggestions` от
 *      Meilisearch с fallback на Prisma) + категории-подсказки (тот же
 *      локальный fuzzy-match что и в /new).
 *   4. После Enter / выбора подсказки → query=q, открывает результаты
 *      (фильтры через chip-row + bottom sheet, грид 2-col mobile).
 *
 * Палитра: только `--mode-accent*` и `--mode-cta` (без brand-токенов).
 */

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  Filter,
  Search as SearchIcon,
  SlidersHorizontal,
  Tag,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  API_URL,
  apiGetJson,
  type Category,
  type ListingCard,
} from '@/lib/api';
import {
  ListingCardComponent,
  ListingCardSkeleton,
} from '@/components/listing-card';

const RECENT_KEY = 'barter:recentSearches';
const RECENT_MAX = 8;

const POPULAR_QUERIES = [
  'iPhone',
  'Велосипед',
  'Диван',
  'Коляска',
  'Кроссовки',
  'PlayStation',
  'Ноутбук',
  'Куртка зимняя',
];

type SortMode = 'relevant' | 'new' | 'cheap' | 'expensive';

const SORT_LABELS: Record<SortMode, string> = {
  relevant: 'По релевантности',
  new: 'Сначала новые',
  cheap: 'Сначала дешёвые',
  expensive: 'Сначала дорогие',
};

type ListingsResponse = {
  page: number;
  limit: number;
  total: number;
  vipStrip?: ListingCard[];
  items: ListingCard[];
};

type SuggestionsResponse = {
  enabled: boolean;
  suggestions: string[];
};

/* ============================================================================
 *  ЛОКАЛЬНЫЙ FUZZY MATCH ПО КАТЕГОРИЯМ
 *  Тот же подход что и в /new — substring match по title.
 * ========================================================================== */
function fuzzyMatchCategoriesByTitle(query: string, cats: Category[]): Category[] {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];
  return cats.filter((c) => c.title.toLowerCase().includes(q)).slice(0, 4);
}

/* ============================================================================
 *  RECENT SEARCHES (localStorage)
 * ========================================================================== */
function loadRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((x) => typeof x === 'string').slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

function saveRecent(query: string): string[] {
  if (typeof window === 'undefined') return [];
  const q = query.trim();
  if (q.length < 2) return loadRecent();
  try {
    const list = loadRecent().filter((x) => x.toLowerCase() !== q.toLowerCase());
    const next = [q, ...list].slice(0, RECENT_MAX);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    return next;
  } catch {
    return loadRecent();
  }
}

function clearRecent(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(RECENT_KEY);
  } catch {
    /* noop */
  }
}

/* ============================================================================
 *  PAGE
 * ========================================================================== */
function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQ = searchParams.get('q') ?? '';
  const initialSort = (searchParams.get('sort') as SortMode | null) ?? 'relevant';
  const initialPriceMin = searchParams.get('priceMin') ?? '';
  const initialPriceMax = searchParams.get('priceMax') ?? '';
  const initialCategoryId = searchParams.get('categoryId') ?? '';

  const [draftQuery, setDraftQuery] = useState(initialQ);
  const [activeQuery, setActiveQuery] = useState(initialQ);
  const [sort, setSort] = useState<SortMode>(initialSort);
  const [priceMin, setPriceMin] = useState(initialPriceMin);
  const [priceMax, setPriceMax] = useState(initialPriceMax);
  const [categoryId, setCategoryId] = useState(initialCategoryId);

  const [cats, setCats] = useState<Category[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [results, setResults] = useState<ListingCard[] | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  /* -------------------- инициализация -------------------- */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecent(loadRecent());
    void apiGetJson<Category[]>('/categories').then(setCats).catch(() => {});
    // Авто-фокус на input если запрос пустой
    if (!initialQ && inputRef.current) inputRef.current.focus();
  }, [initialQ]);

  /* -------------------- live suggestions (debounced) -------------------- */
  useEffect(() => {
    const q = draftQuery.trim();
    if (q.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void apiGetJson<SuggestionsResponse>(
        `/search/suggestions?q=${encodeURIComponent(q)}&limit=6`,
      )
        .then((res) => setSuggestions(res.suggestions ?? []))
        .catch(() => setSuggestions([]));
    }, 180);
    return () => window.clearTimeout(handle);
  }, [draftQuery]);

  /* -------------------- результаты -------------------- */
  useEffect(() => {
    if (!activeQuery && !categoryId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults(null);
      return;
    }
    setLoadingResults(true);
    const params = new URLSearchParams();
    if (activeQuery) params.set('q', activeQuery);
    if (categoryId) params.set('categoryId', categoryId);
    if (sort !== 'relevant') params.set('sort', sort);
    if (priceMin) params.set('priceMin', priceMin);
    if (priceMax) params.set('priceMax', priceMax);
    params.set('limit', '40');
    void apiGetJson<ListingsResponse>(`/listings?${params.toString()}`)
      .then((data) => setResults(data.items ?? []))
      .catch(() => setResults([]))
      .finally(() => setLoadingResults(false));
  }, [activeQuery, categoryId, sort, priceMin, priceMax]);

  /* -------------------- категории-подсказки локально -------------------- */
  const categorySuggestions = useMemo(
    () => fuzzyMatchCategoriesByTitle(draftQuery, cats),
    [draftQuery, cats],
  );

  /* -------------------- helpers -------------------- */
  function commitQuery(q: string) {
    const trimmed = q.trim();
    setDraftQuery(trimmed);
    setActiveQuery(trimmed);
    if (trimmed) setRecent(saveRecent(trimmed));
    const params = new URLSearchParams();
    if (trimmed) params.set('q', trimmed);
    if (categoryId) params.set('categoryId', categoryId);
    if (sort !== 'relevant') params.set('sort', sort);
    if (priceMin) params.set('priceMin', priceMin);
    if (priceMax) params.set('priceMax', priceMax);
    router.push(`/search${params.size > 0 ? `?${params.toString()}` : ''}`, { scroll: false });
  }

  function pickCategory(id: string) {
    setCategoryId(id);
    setActiveQuery(draftQuery.trim()); // commit-режим без перезагрузки query
  }

  const hasResults = activeQuery.length > 0 || categoryId.length > 0;
  const selectedCategory = useMemo(
    () => cats.find((c) => c.id === categoryId) ?? null,
    [cats, categoryId],
  );

  const activeFiltersCount =
    (priceMin ? 1 : 0) +
    (priceMax ? 1 : 0) +
    (sort !== 'relevant' ? 1 : 0) +
    (categoryId ? 1 : 0);

  return (
    <div className="min-h-screen bg-muted text-foreground antialiased">
      {/* ===== STICKY HEADER ===== */}
      <header className="sticky top-0 z-30 border-b border-border bg-background">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2.5">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl transition hover:bg-muted"
            aria-label="Назад"
          >
            <ArrowLeft size={22} strokeWidth={1.8} className="shrink-0" aria-hidden />
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              commitQuery(draftQuery);
              inputRef.current?.blur();
            }}
            className="relative min-w-0 flex-1"
          >
            <SearchIcon
              size={18}
              strokeWidth={1.8}
              className="absolute left-3 top-1/2 -translate-y-1/2 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <input
              ref={inputRef}
              value={draftQuery}
              onChange={(e) => setDraftQuery(e.target.value)}
              placeholder="Что ищем?"
              className="h-10 w-full rounded-xl bg-muted pl-10 pr-9 text-[15px] outline-none transition focus:[--tw-ring-color:var(--mode-accent-ring)] focus:bg-background focus:ring-2"
              type="search"
              autoComplete="off"
              enterKeyHint="search"
            />
            {draftQuery.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setDraftQuery('');
                  inputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:bg-background"
                aria-label="Очистить"
              >
                <X size={14} strokeWidth={2} className="shrink-0" aria-hidden />
              </button>
            ) : null}
          </form>
        </div>

        {/* Filter chip row — показываем только если есть результаты или фильтры */}
        {hasResults ? (
          <div className="flex items-center gap-2 overflow-x-auto px-3 pb-2.5 scrollbar-none">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
              style={
                activeFiltersCount > 0
                  ? {
                      borderColor: 'var(--mode-accent)',
                      backgroundColor: 'var(--mode-accent-soft)',
                      color: 'var(--mode-accent)',
                    }
                  : undefined
              }
            >
              <SlidersHorizontal size={13} strokeWidth={2} className="shrink-0" aria-hidden />
              Фильтры
              {activeFiltersCount > 0 ? <span>· {activeFiltersCount}</span> : null}
            </button>

            {selectedCategory ? (
              <FilterChip
                label={selectedCategory.title}
                onRemove={() => {
                  setCategoryId('');
                }}
              />
            ) : null}
            {sort !== 'relevant' ? (
              <FilterChip label={SORT_LABELS[sort]} onRemove={() => setSort('relevant')} />
            ) : null}
            {priceMin ? (
              <FilterChip label={`от ${priceMin} ₽`} onRemove={() => setPriceMin('')} />
            ) : null}
            {priceMax ? (
              <FilterChip label={`до ${priceMax} ₽`} onRemove={() => setPriceMax('')} />
            ) : null}
          </div>
        ) : null}
      </header>

      {/* ===== BODY ===== */}
      <main className="mx-auto max-w-3xl px-3 pb-24 pt-4 md:px-4">
        {/* Состояние «нет активного запроса» — empty state */}
        {!hasResults ? (
          <EmptyState
            draftQuery={draftQuery}
            recent={recent}
            suggestions={suggestions}
            categorySuggestions={categorySuggestions}
            cats={cats}
            onPickQuery={(q) => {
              setDraftQuery(q);
              commitQuery(q);
            }}
            onPickCategory={(id) => pickCategory(id)}
            onClearRecent={() => {
              clearRecent();
              setRecent([]);
            }}
          />
        ) : null}

        {/* Состояние «есть результаты» */}
        {hasResults ? (
          <ResultsBlock
            query={activeQuery}
            results={results}
            loading={loadingResults}
            categoryTitle={selectedCategory?.title}
          />
        ) : null}
      </main>

      {/* ===== FILTERS BOTTOM SHEET ===== */}
      {filtersOpen ? (
        <FiltersSheet
          cats={cats}
          categoryId={categoryId}
          sort={sort}
          priceMin={priceMin}
          priceMax={priceMax}
          onApply={(next) => {
            setCategoryId(next.categoryId);
            setSort(next.sort);
            setPriceMin(next.priceMin);
            setPriceMax(next.priceMax);
            setFiltersOpen(false);
          }}
          onReset={() => {
            setCategoryId('');
            setSort('relevant');
            setPriceMin('');
            setPriceMax('');
            setFiltersOpen(false);
          }}
          onClose={() => setFiltersOpen(false)}
        />
      ) : null}
    </div>
  );
}

/* ============================================================================
 *  EMPTY STATE
 * ========================================================================== */
function EmptyState(props: {
  draftQuery: string;
  recent: string[];
  suggestions: string[];
  categorySuggestions: Category[];
  cats: Category[];
  onPickQuery: (q: string) => void;
  onPickCategory: (id: string) => void;
  onClearRecent: () => void;
}) {
  const {
    draftQuery,
    recent,
    suggestions,
    categorySuggestions,
    cats,
    onPickQuery,
    onPickCategory,
    onClearRecent,
  } = props;
  const isTyping = draftQuery.trim().length >= 2;

  // Когда пользователь печатает — показываем live-подсказки + match по категориям.
  if (isTyping) {
    return (
      <section className="space-y-5">
        {suggestions.length > 0 ? (
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Подсказки
            </p>
            <ul className="overflow-hidden rounded-xl border border-border bg-card">
              {suggestions.map((s) => (
                <li key={s} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    onClick={() => onPickQuery(s)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-muted"
                  >
                    <SearchIcon
                      size={16}
                      strokeWidth={1.8}
                      className="shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <HighlightedText text={s} highlight={draftQuery} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {categorySuggestions.length > 0 ? (
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              В категориях
            </p>
            <ul className="grid gap-2">
              {categorySuggestions.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onPickCategory(c.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition hover:bg-muted"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="grid size-8 shrink-0 place-items-center rounded-lg text-white"
                        style={{ backgroundColor: 'var(--mode-accent)' }}
                      >
                        <Tag size={14} strokeWidth={2} className="shrink-0" aria-hidden />
                      </span>
                      <span className="text-sm font-semibold text-foreground">{c.title}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {suggestions.length === 0 && categorySuggestions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            Нет подсказок. Нажмите Enter, чтобы искать «{draftQuery}».
          </div>
        ) : null}
      </section>
    );
  }

  // Дефолтный пустой state: recent + popular + categories grid.
  return (
    <section className="space-y-6">
      {recent.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Недавние запросы
            </p>
            <button
              type="button"
              onClick={onClearRecent}
              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
            >
              Очистить
            </button>
          </div>
          <ul className="flex flex-wrap gap-2">
            {recent.map((q) => (
              <li key={q}>
                <button
                  type="button"
                  onClick={() => onPickQuery(q)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
                >
                  <Clock
                    size={12}
                    strokeWidth={1.8}
                    className="shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  {q}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          <TrendingUp size={12} strokeWidth={2} className="shrink-0" aria-hidden />
          Популярные запросы
        </p>
        <ul className="flex flex-wrap gap-2">
          {POPULAR_QUERIES.map((q) => (
            <li key={q}>
              <button
                type="button"
                onClick={() => onPickQuery(q)}
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-white transition active:scale-[0.98]"
                style={{ backgroundColor: 'var(--mode-accent)' }}
              >
                {q}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {cats.length > 0 ? (
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Категории
          </p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {cats.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onPickCategory(c.id)}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition hover:[border-color:var(--mode-accent-ring)]"
                >
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-xl text-white"
                    style={{ backgroundColor: 'var(--mode-accent)' }}
                  >
                    <Tag size={14} strokeWidth={2} className="shrink-0" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                    {c.title}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/* ============================================================================
 *  RESULTS BLOCK
 * ========================================================================== */
function ResultsBlock(props: {
  query: string;
  results: ListingCard[] | null;
  loading: boolean;
  categoryTitle?: string;
}) {
  const { query, results, loading, categoryTitle } = props;
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ListingCardSkeleton key={i} thumbHeight={160} />
        ))}
      </div>
    );
  }
  if (!results || results.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
        <div
          className="mx-auto grid size-14 place-items-center rounded-full text-white"
          style={{ backgroundColor: 'var(--mode-accent)' }}
        >
          <SearchIcon size={26} strokeWidth={1.8} className="shrink-0" aria-hidden />
        </div>
        <p className="mt-3 text-base font-bold text-foreground">Ничего не найдено</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Попробуйте изменить запрос
          {query ? <> «{query}»</> : null}
          {categoryTitle ? <> или сменить категорию «{categoryTitle}»</> : null}.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold text-white transition"
          style={{
            backgroundColor: 'var(--mode-accent)',
            boxShadow: '0 4px 14px var(--mode-accent-ring)',
          }}
        >
          На главную
        </Link>
      </div>
    );
  }
  return (
    <>
      <p className="mb-3 text-xs font-medium text-muted-foreground">
        Найдено: {results.length} {pluralizeFound(results.length)}
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {results.map((x) => (
          <ListingCardComponent
            key={x.id}
            data={x}
            apiBase={API_URL}
            thumbHeight={160}
          />
        ))}
      </div>
    </>
  );
}

/* ============================================================================
 *  FILTERS BOTTOM SHEET
 * ========================================================================== */
function FiltersSheet(props: {
  cats: Category[];
  categoryId: string;
  sort: SortMode;
  priceMin: string;
  priceMax: string;
  onApply: (next: { categoryId: string; sort: SortMode; priceMin: string; priceMax: string }) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const { cats, onApply, onReset, onClose } = props;
  const [draftCategory, setDraftCategory] = useState(props.categoryId);
  const [draftSort, setDraftSort] = useState<SortMode>(props.sort);
  const [draftPriceMin, setDraftPriceMin] = useState(props.priceMin);
  const [draftPriceMax, setDraftPriceMax] = useState(props.priceMax);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm md:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-background md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-3">
          <div className="inline-flex items-center gap-2">
            <Filter size={18} strokeWidth={1.8} className="shrink-0" aria-hidden />
            <h2 className="text-base font-bold text-foreground">Фильтры</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-xl transition hover:bg-muted"
            aria-label="Закрыть"
          >
            <X size={18} strokeWidth={1.8} className="shrink-0" aria-hidden />
          </button>
        </div>

        <div className="space-y-6 px-4 py-5">
          {/* Category */}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Категория
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setDraftCategory('')}
                className="rounded-xl border px-3 py-2 text-left text-sm font-semibold transition"
                style={
                  draftCategory === ''
                    ? {
                        backgroundColor: 'var(--mode-accent-soft)',
                        borderColor: 'var(--mode-accent)',
                        color: 'var(--mode-accent)',
                      }
                    : { borderColor: 'var(--border)', color: 'var(--foreground)' }
                }
              >
                Все категории
              </button>
              {cats.map((c) => {
                const isPicked = draftCategory === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setDraftCategory(c.id)}
                    className="rounded-xl border px-3 py-2 text-left text-sm font-semibold transition"
                    style={
                      isPicked
                        ? {
                            backgroundColor: 'var(--mode-accent-soft)',
                            borderColor: 'var(--mode-accent)',
                            color: 'var(--mode-accent)',
                          }
                        : { borderColor: 'var(--border)', color: 'var(--foreground)' }
                    }
                  >
                    {c.title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort */}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Сортировка
            </p>
            <div className="grid gap-2">
              {(Object.keys(SORT_LABELS) as SortMode[]).map((opt) => {
                const isPicked = draftSort === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setDraftSort(opt)}
                    className="flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold transition"
                    style={
                      isPicked
                        ? {
                            backgroundColor: 'var(--mode-accent-soft)',
                            borderColor: 'var(--mode-accent)',
                            color: 'var(--mode-accent)',
                          }
                        : { borderColor: 'var(--border)', color: 'var(--foreground)' }
                    }
                  >
                    <span>{SORT_LABELS[opt]}</span>
                    {isPicked ? (
                      <span
                        className="inline-block size-2.5 rounded-full"
                        style={{ backgroundColor: 'var(--mode-accent)' }}
                        aria-hidden
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price */}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Цена, ₽
            </p>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={draftPriceMin}
                onChange={(e) => setDraftPriceMin(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="от"
                inputMode="numeric"
                className="h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none transition focus:[border-color:var(--mode-accent-ring)]"
              />
              <input
                value={draftPriceMax}
                onChange={(e) => setDraftPriceMax(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="до"
                inputMode="numeric"
                className="h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none transition focus:[border-color:var(--mode-accent-ring)]"
              />
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 flex gap-2 border-t border-border bg-background px-4 py-3">
          <button
            type="button"
            onClick={onReset}
            className="h-12 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            Сбросить
          </button>
          <button
            type="button"
            onClick={() =>
              onApply({
                categoryId: draftCategory,
                sort: draftSort,
                priceMin: draftPriceMin,
                priceMax: draftPriceMax,
              })
            }
            className="flex h-12 flex-1 items-center justify-center rounded-xl text-sm font-bold text-white transition active:scale-[0.99]"
            style={{
              backgroundColor: 'var(--mode-cta)',
              boxShadow: '0 4px 14px var(--mode-accent-ring)',
            }}
          >
            Показать результаты
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 *  HELPERS
 * ========================================================================== */
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1"
      style={{
        backgroundColor: 'var(--mode-accent-soft)',
        color: 'var(--mode-accent)',
        ['--tw-ring-color' as string]: 'var(--mode-accent-ring)',
      }}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="grid size-4 place-items-center rounded-full hover:bg-background"
        aria-label="Убрать фильтр"
      >
        <X size={10} strokeWidth={2.4} className="shrink-0" aria-hidden />
      </button>
    </span>
  );
}

function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  const h = highlight.trim().toLowerCase();
  if (h.length < 2) return <span className="text-foreground">{text}</span>;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(h);
  if (idx < 0) return <span className="text-foreground">{text}</span>;
  return (
    <span className="text-foreground">
      {text.slice(0, idx)}
      <span className="font-bold" style={{ color: 'var(--mode-accent)' }}>
        {text.slice(idx, idx + h.length)}
      </span>
      {text.slice(idx + h.length)}
    </span>
  );
}

function pluralizeFound(n: number): string {
  const abs = Math.abs(n) % 100;
  const n1 = abs % 10;
  if (abs > 10 && abs < 20) return 'объявлений';
  if (n1 > 1 && n1 < 5) return 'объявления';
  if (n1 === 1) return 'объявление';
  return 'объявлений';
}

/* ============================================================================
 *  EXPORT
 * ========================================================================== */
export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 bg-muted">
          <div
            className="h-10 w-10 shrink-0 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: 'var(--mode-accent-ring)', borderTopColor: 'transparent' }}
            role="status"
            aria-label="Загрузка"
          />
          <p className="text-sm text-muted-foreground">Открываем поиск…</p>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
