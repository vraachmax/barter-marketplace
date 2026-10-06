'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle, Gamepad2, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getBarterDashProgress, unlockBarterDash } from '@/lib/barter-dash';

const REQUIRED_TAPS = 5;
const TAP_WINDOW_MS = 2400;

export function BarterDashEasterEgg() {
  const [unlocked, setUnlocked] = useState(false);
  const [foundNow, setFoundNow] = useState(false);
  const taps = useRef<number[]>([]);

  useEffect(() => {
    setUnlocked(getBarterDashProgress().unlocked);
  }, []);

  function tapLogo() {
    if (unlocked) return;
    const now = Date.now();
    taps.current = [...taps.current.filter((stamp) => now - stamp <= TAP_WINDOW_MS), now];

    if (taps.current.length >= 3) {
      try {
        navigator.vibrate?.(18);
      } catch {
        // Haptics are optional.
      }
    }

    if (taps.current.length < REQUIRED_TAPS) return;

    taps.current = [];
    unlockBarterDash();
    setUnlocked(true);
    setFoundNow(true);
    try {
      navigator.vibrate?.([30, 35, 70]);
    } catch {
      // Haptics are optional.
    }
  }

  return (
    <>
      <div className="space-y-5">
        <div className="rounded-3xl border border-border bg-muted/40 p-5 text-center sm:p-7">
          <button
            type="button"
            onClick={tapLogo}
            className="mx-auto grid min-h-24 min-w-24 place-items-center rounded-3xl p-3 transition active:scale-95 focus-visible:outline-2 focus-visible:outline-primary"
            aria-label="Логотип БАРТЕР"
          >
            <Image
              src="/brand/bubble-b-v2/mark.png"
              alt=""
              width={160}
              height={192}
              unoptimized
              className="h-auto w-16 object-contain sm:w-20"
              draggable={false}
            />
          </button>
          <p className="mt-2 text-base font-bold text-foreground">БАРТЕР</p>
          <p className="mt-1 text-sm text-muted-foreground">Маркетплейс продажи и обмена</p>
          <p className="mt-3 text-xs text-muted-foreground">Alpha · Bubble B</p>
        </div>

        {unlocked ? (
          <div className="rounded-3xl border [border-color:var(--mode-accent-ring)] [background-color:var(--mode-accent-soft)] p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-card [color:var(--mode-accent)] shadow-sm">
                <Gamepad2 size={23} strokeWidth={1.8} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-foreground">Barter Dash открыт</p>
                  <CheckCircle size={17} className="[color:var(--mode-accent)]" aria-hidden />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Теперь игра доступна из вашего профиля.
                </p>
              </div>
            </div>
            <Link
              href="/games/barter-dash"
              className="mt-4 flex min-h-12 w-full items-center justify-center rounded-2xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:bg-primary-hover"
            >
              Играть
            </Link>
          </div>
        ) : null}
      </div>

      {foundNow ? (
        <div
          className="fixed inset-0 z-[2100] grid place-items-center bg-black/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="barter-dash-found-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setFoundNow(false);
          }}
        >
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card p-6 text-center shadow-2xl">
            <button
              type="button"
              onClick={() => setFoundNow(false)}
              className="absolute right-3 top-3 grid size-11 place-items-center rounded-full text-muted-foreground transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
              aria-label="Закрыть"
            >
              <X size={20} aria-hidden />
            </button>
            <span className="mx-auto grid size-16 place-items-center rounded-3xl [background-color:var(--mode-accent-soft)] [color:var(--mode-accent)]">
              <Sparkles size={30} strokeWidth={1.7} aria-hidden />
            </span>
            <h3 id="barter-dash-found-title" className="mt-5 text-2xl font-black tracking-tight">
              Ты нашёл Barter Dash 🎮
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Скрытая игра внутри БАРТЕРА. Теперь она останется в твоём профиле.
            </p>
            <Link
              href="/games/barter-dash"
              className="mt-6 flex min-h-13 w-full items-center justify-center rounded-2xl bg-primary px-5 text-base font-bold text-primary-foreground transition hover:bg-primary-hover"
            >
              Играть
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
