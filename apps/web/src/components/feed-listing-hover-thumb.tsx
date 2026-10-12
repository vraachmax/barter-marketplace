'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveAssetUrl } from '@/lib/api';
import { usablePhotoUrls } from '@/lib/listing-placeholder';
import { ListingPhoto } from '@/components/listing-photo';

type Img = { url: string };

type Props = {
  images?: Img[] | null;
  title: string;
  apiBase: string;
  categoryTitle?: string;
  categorySlug?: string;
  /** Обёртка превью (как раньше listing-thumb-wrap …) */
  thumbClassName: string;
  /** Классы для <img> */
  imageClassName: string;
  /** Inline стили для обёртки */
  thumbStyle?: React.CSSProperties;
  /** Inline стили для <img> */
  imageStyle?: React.CSSProperties;
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
  categoryTitle,
  categorySlug,
  thumbClassName,
  imageClassName,
  thumbStyle,
  imageStyle,
  placeholder,
  badges,
}: Props) {
  const list = usablePhotoUrls(images).map((url) => ({ url }));
  const n = list.length;
  const [hoverIdx, setHoverIdx] = useState(0);
  const rafRef = useRef<number | null>(null);
  const pendingXRef = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);
  const touching = useRef(false);
  const [holding, setHolding] = useState(false);

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
      if (!touching.current) applyClientX(e.clientX);
    },
    [applyClientX],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!touching.current) schedulePointerX(e.clientX);
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

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || n < 2) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cycle: ReturnType<typeof setInterval> | undefined;
    let startX = 0, startY = 0, active = false;
    const stopTimers = () => { clearTimeout(timer); clearInterval(cycle); };
    const finish = () => {
      stopTimers(); active = false; setHolding(false); setHoverIdx(0);
      // Ignore synthetic mouse hover following a touch; the next mouse pointer
      // explicitly restores desktop preview below.
    };
    const start = (event: TouchEvent) => {
      finish(); touching.current = true; suppressClick.current = false;
      if (event.touches.length !== 1) return;
      startX = event.touches[0].clientX; startY = event.touches[0].clientY;
      timer = setTimeout(() => {
        active = true; suppressClick.current = true; setHolding(true);
        setHoverIdx(index => (index + 1) % n);
        cycle = setInterval(() => setHoverIdx(index => (index + 1) % n), 850);
      }, 320);
    };
    const move = (event: TouchEvent) => {
      if (event.touches.length !== 1) { finish(); return; }
      const touch = event.touches[0];
      if (!active) {
        if (Math.hypot(touch.clientX - startX, touch.clientY - startY) > 10) stopTimers();
        return; // A normal swipe scrolls the feed.
      }
      if (event.cancelable) event.preventDefault();
      if (Math.abs(touch.clientX - startX) > 10) {
        clearInterval(cycle);
        applyClientX(touch.clientX);
      }
    };
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', finish);
    el.addEventListener('touchcancel', finish);
    return () => {
      stopTimers();
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', finish);
      el.removeEventListener('touchcancel', finish);
    };
  }, [n, applyClientX]);

  if (n === 0) {
    return (
      <div ref={wrapRef} className={thumbClassName} style={thumbStyle}>
        {placeholder}
        {badges}
      </div>
    );
  }

  const current = list[hoverIdx] ?? list[0];

  return (
    <div
      ref={wrapRef}
      className={`${thumbClassName}${n > 1 ? ' photo-hold-preview' : ''}`}
      data-photo-index={hoverIdx}
      data-photo-holding={holding}
      style={thumbStyle}
      onPointerEnter={e => { if (e.pointerType === 'mouse') touching.current = false; }}
      onClickCapture={e => {
        if (suppressClick.current) { e.preventDefault(); e.stopPropagation(); suppressClick.current = false; }
      }}
      onContextMenu={e => { if (n > 1 && touching.current) e.preventDefault(); }}
      onDragStart={e => e.preventDefault()}
      onMouseEnter={onMouseEnter}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <ListingPhoto src={resolveAssetUrl(current.url, apiBase)} alt={title} categoryTitle={categoryTitle} categorySlug={categorySlug} className={imageClassName} style={imageStyle} fallback={placeholder} />
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
 i === hoverIdx ? 'bg-card shadow-sm' : 'bg-card/45'
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
