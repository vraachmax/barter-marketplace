'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';

type Img = { id: string; url: string };

const SWIPE_THRESHOLD_PX = 56;
const EDGE_RESISTANCE = 0.28;

export default function ListingGallery({
  images,
  title,
  apiBase,
  placeholder,
}: {
  images: Img[];
  title: string;
  apiBase: string;
  placeholder: React.ReactNode;
}) {
  const [idx, setIdx] = useState(0);
  const [pullPx, setPullPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const startXRef = useRef(0);
  const activePointerRef = useRef<number | null>(null);

  if (!images.length) return <>{placeholder}</>;

  const main = images[idx] ?? images[0];
  const n = images.length;

  const prev = useCallback(() => {
    setIdx((i) => (i - 1 + n) % n);
  }, [n]);

  const next = useCallback(() => {
    setIdx((i) => (i + 1) % n);
  }, [n]);

  const dampenPull = useCallback(
    (dx: number) => {
      if (n <= 1) return 0;
      if (idx === 0 && dx > 0) return dx * EDGE_RESISTANCE;
      if (idx === n - 1 && dx < 0) return dx * EDGE_RESISTANCE;
      return dx;
    },
    [idx, n],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (n <= 1) return;
      if (e.button !== 0) return;
      const el = e.currentTarget;
      el.setPointerCapture(e.pointerId);
      activePointerRef.current = e.pointerId;
      startXRef.current = e.clientX;
      setIsDragging(true);
      setPullPx(0);
    },
    [n],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (n <= 1 || activePointerRef.current !== e.pointerId) return;
      const dx = e.clientX - startXRef.current;
      setPullPx(dampenPull(dx));
    },
    [n, dampenPull],
  );

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerRef.current !== e.pointerId) return;
      const el = e.currentTarget;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      activePointerRef.current = null;
      setIsDragging(false);

      const dx = e.clientX - startXRef.current;
      setPullPx(0);

      if (n <= 1) return;
      if (dx > SWIPE_THRESHOLD_PX) prev();
      else if (dx < -SWIPE_THRESHOLD_PX) next();
    },
    [n, prev, next],
  );

  const onPointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    activePointerRef.current = null;
    setIsDragging(false);
    setPullPx(0);
  }, []);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900">
        <div
          role="presentation"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={onPointerCancel}
          className={`relative aspect-[4/3] w-full touch-none select-none sm:aspect-[16/10] ${
            n > 1 ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
          style={{ touchAction: n > 1 ? 'none' : undefined }}
          aria-label={n > 1 ? 'Потяните фото влево или вправо, чтобы перелистать' : undefined}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${apiBase}${main.url}`}
            alt={title}
            draggable={false}
            className="listing-thumb-img pointer-events-none h-full w-full object-cover"
            style={{
              transform: `translateX(${pullPx}px)`,
              transition: isDragging ? 'none' : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
          {n > 1 ? (
            <p className="pointer-events-none absolute left-3 top-3 hidden max-w-[min(100%,240px)] rounded-lg bg-black/45 px-2 py-1 text-[10px] font-medium leading-snug text-white/95 backdrop-blur-sm sm:block sm:text-[11px]">
              Ведите по фото влево / вправо — перелистывание как на крупных площадках
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setFullscreen(true)}
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
          aria-label="Открыть на весь экран"
        >
          <Search size={20} strokeWidth={1.8} className="text-white drop-shadow" aria-hidden />
        </button>
        {n > 1 ? (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-2 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/80 bg-black/35 text-white shadow-md backdrop-blur-sm transition hover:bg-black/50 md:left-3"
              aria-label="Предыдущее фото"
            >
              <ChevronLeft size={22} strokeWidth={1.8} className="text-white" aria-hidden />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-2 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/80 bg-black/35 text-white shadow-md backdrop-blur-sm transition hover:bg-black/50 md:right-3"
              aria-label="Следующее фото"
            >
              <ChevronRight size={22} strokeWidth={1.8} className="text-white" aria-hidden />
            </button>
            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/45 px-2 py-1 backdrop-blur-sm">
              {images.map((im, i) => (
                <button
                  key={im.id}
                  type="button"
                  onClick={() => setIdx(i)}
                  className={`h-1.5 rounded-full transition ${i === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/70'}`}
                  aria-label={`Фото ${i + 1}`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {n > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((im, i) => (
            <button
              key={im.id}
              type="button"
              onClick={() => setIdx(i)}
              className={`shrink-0 overflow-hidden rounded-xl border-2 transition ${
                i === idx ? 'border-sky-500 ring-2 ring-sky-500/30' : 'border-zinc-200 opacity-80 hover:opacity-100 dark:border-zinc-600'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${apiBase}${im.url}`} alt="" className="h-16 w-16 object-cover sm:h-20 sm:w-20" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}

      {fullscreen ? (
        <FullscreenGallery
          images={images}
          title={title}
          apiBase={apiBase}
          initialIdx={idx}
          onClose={() => setFullscreen(false)}
        />
      ) : null}
    </div>
  );
}

function FullscreenGallery({
  images,
  title,
  apiBase,
  initialIdx,
  onClose,
}: {
  images: Img[];
  title: string;
  apiBase: string;
  initialIdx: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(initialIdx);
  const n = images.length;
  const current = images[idx] ?? images[0];

  const prev = useCallback(() => setIdx((i) => (i - 1 + n) % n), [n]);
  const next = useCallback(() => setIdx((i) => (i + 1) % n), [n]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose, prev, next]);

  const startXRef = useRef(0);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
  }, []);
  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startXRef.current;
      if (dx > 60) prev();
      else if (dx < -60) next();
    },
    [prev, next],
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold tabular-nums text-white/80">
          {idx + 1} / {n}
        </span>
        <button
          onClick={onClose}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          aria-label="Закрыть"
        >
          <X size={24} strokeWidth={1.8} className="text-white" aria-hidden />
        </button>
      </div>

      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden px-2"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${apiBase}${current.url}`}
          alt={title}
          className="max-h-full max-w-full rounded-lg object-contain"
          draggable={false}
        />
        {n > 1 ? (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-2 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/25 md:left-4"
              aria-label="Предыдущее"
            >
              <ChevronLeft size={28} strokeWidth={1.8} className="text-white" aria-hidden />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-2 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/25 md:right-4"
              aria-label="Следующее"
            >
              <ChevronRight size={28} strokeWidth={1.8} className="text-white" aria-hidden />
            </button>
          </>
        ) : null}
      </div>

      <div className="flex justify-center gap-2 overflow-x-auto px-4 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {images.map((im, i) => (
          <button
            key={im.id}
            type="button"
            onClick={(e) => { e.stopPropagation(); setIdx(i); }}
            className={`shrink-0 overflow-hidden rounded-lg border-2 transition ${
              i === idx ? 'border-white ring-1 ring-white/40' : 'border-transparent opacity-50 hover:opacity-80'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${apiBase}${im.url}`} alt="" className="h-14 w-14 object-cover sm:h-16 sm:w-16" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}
