'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveAssetUrl } from '@/lib/api';
import { usablePhotoUrls } from '@/lib/listing-placeholder';
import { ListingPhoto } from '@/components/listing-photo';

type Img = { url: string };

type Props = {
  onOpen: () => void;
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
  onOpen,
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
  // Preserve a compact pagination row even when an announcement has many photos.
  const dotStart = Math.max(0, Math.min(hoverIdx - 3, n - 7));
  const visibleDots = n <= 7 ? list.map((_, i) => i) : Array.from({ length: 7 }, (_, i) => dotStart + i);
  const rafRef = useRef<number | null>(null);
  const pendingXRef = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const suppressClickUntil = useRef(0);
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
    if (!touching.current) setHoverIdx(0);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || n < 2) return;

    let holdTimer: ReturnType<typeof setTimeout> | undefined;
    let cycle: ReturnType<typeof setInterval> | undefined;
    let startX = 0;
    let startY = 0;
    let swiping = false;
    let holdingNow = false;
    const clearTimers = () => { clearTimeout(holdTimer); clearInterval(cycle); };
    const finish = () => { clearTimers(); holdingNow = false; swiping = false; setHolding(false); };

    const start = (event: TouchEvent) => {
      clearTimers();
      holdingNow = false; swiping = false;
      touching.current = true;
      // A NEW touch starts a NEW gesture; do not suppress its regular tap.
      suppressClickUntil.current = 0;
      if (event.touches.length !== 1) return;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
      holdTimer = setTimeout(() => {
        holdingNow = true;
        suppressClickUntil.current = Date.now() + 650;
        setHolding(true);
        setHoverIdx(index => (index + 1) % n);
        cycle = setInterval(() => setHoverIdx(index => (index + 1) % n), 850);
      }, 320);
    };
    const move = (event: TouchEvent) => {
      if (event.touches.length !== 1) { finish(); return; }
      const touch = event.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (holdingNow) {
        if (event.cancelable) event.preventDefault();
        if (Math.abs(dx) > 9) {
          clearInterval(cycle);
          applyClientX(touch.clientX);
        }
        return;
      }
      if (swiping) {
        if (event.cancelable) event.preventDefault();
        return;
      }
      if (Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        clearTimers();
        swiping = true;
        suppressClickUntil.current = Date.now() + 650;
        if (event.cancelable) event.preventDefault();
      } else if (Math.abs(dy) > 10) {
        // Vertical motion belongs to the feed scroll, never intercept it.
        clearTimers();
      }
    };
    const endTouch = (event: TouchEvent) => {
      if (swiping) {
        const dx = (event.changedTouches[0]?.clientX ?? startX) - startX;
        if (Math.abs(dx) > 28) {
          setHoverIdx(index => (index + (dx < 0 ? 1 : n - 1)) % n);
        }
      }
      // Retain the selected image after a swipe or hold, like marketplace previews.
      finish();
    };
    const cancelTouch = () => finish();
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', endTouch);
    el.addEventListener('touchcancel', cancelTouch);
    return () => {
      clearTimers();
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', endTouch);
      el.removeEventListener('touchcancel', cancelTouch);
    };
  }, [n, applyClientX]);

  if (n === 0) {
    return (
      <div ref={wrapRef} className={thumbClassName} style={thumbStyle} role="link" tabIndex={0} aria-label={title} onClick={onOpen} onKeyDown={e => { if (e.key === 'Enter') onOpen(); }}>
        {placeholder}
        {badges}
      </div>
    );
  }

  const openProps = {
    role: 'link', tabIndex: 0, 'aria-label': n > 1 ? `${title}, фото ${hoverIdx + 1} из ${n}` : title,
    onClick: onOpen,
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); onOpen(); } },
  };

  return (
    <div
      {...openProps}
      ref={wrapRef}
      className={`${thumbClassName}${n > 1 ? ' photo-hold-preview' : ''}`}
      data-photo-index={hoverIdx}
      data-photo-count={n}
      data-photo-holding={holding}
      style={thumbStyle}
      onPointerEnter={e => { if (e.pointerType === 'mouse') touching.current = false; }}
      onClickCapture={e => {
        if (Date.now() < suppressClickUntil.current) { e.preventDefault(); e.stopPropagation(); }
      }}
      onContextMenu={e => { if (n > 1 && touching.current) e.preventDefault(); }}
      onDragStart={e => e.preventDefault()}
      onMouseEnter={onMouseEnter}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {list.map((photo, index) => <div key={photo.url} className="absolute inset-0 pointer-events-none" style={{ visibility: index === hoverIdx ? 'visible' : 'hidden' }} aria-hidden={index !== hoverIdx}>
        <ListingPhoto src={resolveAssetUrl(photo.url, apiBase)} alt={title} categoryTitle={categoryTitle} categorySlug={categorySlug} className={imageClassName} style={imageStyle} fallback={placeholder} eager={index === hoverIdx} />
      </div>)}
      {badges}
      {n > 1 ? (
        <div
          className="pointer-events-none absolute bottom-[8px] inset-x-0 z-[3] flex items-center justify-center gap-[4px]"
          data-photo-pagination="dots"
          aria-hidden
        >
          {visibleDots.map(i => (
            <span key={i}
              data-active={i === hoverIdx ? 'true' : 'false'}
              className={`h-[9px] w-[9px] shrink-0 rounded-full border-0 shadow-[0_1px_3px_rgba(0,0,0,.2)] transition-[background,transform] duration-150 ${
                i === hoverIdx ? 'scale-[1.08] bg-[#ff5a0a]' : 'bg-[#ff5a0a]/45'
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
