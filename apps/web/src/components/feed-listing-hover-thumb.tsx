'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Img = { url: string };

type Props = {
  images?: Img[] | null;
  title: string;
  apiBase: string;
  /** Обёртка превью (как раньше listing-thumb-wrap …) */
  thumbClassName: string;
  /** Классы для <img> */
  imageClassName: string;
  /** Если нет фото */
  placeholder: React.ReactNode;
  /** Бейджи, затемнение — поверх картинки, pointer-events-none сами по себе */
  badges?: React.ReactNode;
};

/**
 * Лента / рекомендации: наведите курсор на превью и ведите влево-вправо —
 * подставляется соответствующее фото (логика как у крупных маркетплейсов).
 */
export default function FeedListingHoverThumb({
  images,
  title,
  apiBase,
  thumbClassName,
  imageClassName,
  placeholder,
  badges,
}: Props) {
  const list = (images ?? []).filter((im) => im?.url);
  const n = list.length;
  const [hoverIdx, setHoverIdx] = useState(0);
  const rafRef = useRef<number | null>(null);
  const pendingXRef = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const applyClientX = useCallback(
    (clientX: number) => {
      const el = wrapRef.current;
      if (!el || n <= 1) return;
      const r = el.getBoundingClientRect();
      if (r.width <= 0) return;
      const ratio = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      const idx = Math.min(n - 1, Math.floor(ratio * n));
      setHoverIdx((prev) => (prev === idx ? prev : idx));
    },
    [n],
  );

  const schedulePointerX = useCallback(
    (clientX: number) => {
      pendingXRef.current = clientX;
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const x = pendingXRef.current;
        if (x != null) applyClientX(x);
      });
    },
    [applyClientX],
  );

  const onMouseEnter = useCallback(
    (e: React.MouseEvent) => {
      applyClientX(e.clientX);
    },
    [applyClientX],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      schedulePointerX(e.clientX);
    },
    [schedulePointerX],
  );

  const onMouseLeave = useCallback(() => {
    setHoverIdx(0);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (n === 0) {
    return (
      <div ref={wrapRef} className={thumbClassName}>
        {placeholder}
        {badges}
      </div>
    );
  }

  const current = list[hoverIdx] ?? list[0];

  return (
    <div
      ref={wrapRef}
      className={thumbClassName}
      onMouseEnter={onMouseEnter}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${apiBase}${current.url}`} alt={title} className={imageClassName} loading="lazy" />
      {badges}
      {n > 1 ? (
        <>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-1.5 z-[3] flex justify-center gap-0.5 px-2"
            aria-hidden
          >
            {list.map((_, i) => (
              <div
                key={i}
                className={`h-0.5 min-w-[6px] flex-1 rounded-full transition-colors ${
                  i === hoverIdx ? 'bg-white shadow-sm' : 'bg-white/45'
                }`}
              />
            ))}
          </div>
          {n > 2 ? (
            <span className="pointer-events-none absolute right-1.5 top-1.5 z-[3] rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white backdrop-blur-sm">
              {n} фото
            </span>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
