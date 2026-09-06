'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGetJson, type ListingCard } from '@/lib/api';
import { ListingCardComponent } from '@/components/listing-card';
import { assertCatalogMode, type CatalogMode } from '@/lib/catalog-mode';

type Props = {
  mode?: CatalogMode;
  initialPage: number;
  initialIds?: string[];
  total: number;
  limit: number;
  basePath: string;
  apiBase: string;
};

export function FeedLoadMore({ mode = 'market', initialPage, initialIds = [], total, limit, basePath, apiBase }: Props) {
  const [extra, setExtra] = useState<ListingCard[]>([]);
  const [page, setPage] = useState(initialPage);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [done, setDone] = useState(initialPage * limit >= total);
  const seen = useRef(new Set(initialIds));
  const inFlight = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (inFlight.current || done) return;
    inFlight.current = true;
    setPending(true);
    setError(false);
    const nextPage = page + 1;
    try {
      const sep = basePath.includes('?') ? '&' : '?';
      const data = await apiGetJson<{ appliedMode?: string; items: ListingCard[]; total: number }>(`${basePath}${sep}page=${nextPage}`);
      assertCatalogMode(data, mode);
      if (!Array.isArray(data.items)) throw new Error('Invalid listing response');
      const items = data.items.filter((item) => {
        if (!item?.id || seen.current.has(item.id)) return false;
        seen.current.add(item.id);
        return true;
      });
      setExtra((prev) => [...prev, ...items]);
      setPage(nextPage);
      setDone(data.items.length === 0 || nextPage * limit >= (data.total ?? total));
    } catch {
      setError(true);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }, [done, page, basePath, limit, total, mode]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || done || error || pending) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) void loadMore(); },
      { rootMargin: '300px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [done, error, pending, loadMore]);

  return <>
    {extra.map((item) => <ListingCardComponent key={item.id} data={item} apiBase={apiBase} />)}
    {!done ? <div ref={sentinelRef} className="col-span-full flex flex-col items-center gap-3 py-6" aria-live="polite">
      {error ? <p role="alert" className="text-sm text-muted-foreground">Не удалось загрузить ещё объявления. Попробуйте снова.</p> : null}
      <button type="button" disabled={pending} onClick={() => void loadMore()} className="glass-panel min-h-11 rounded-full border border-border px-6 text-sm font-medium text-foreground disabled:opacity-60">
        {pending ? 'Загружаем…' : error ? 'Повторить загрузку' : 'Показать ещё'}
      </button>
    </div> : null}
  </>;
}
