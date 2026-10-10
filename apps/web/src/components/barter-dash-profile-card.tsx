'use client';

import Link from 'next/link';
import { ChevronRight, Flame, Gamepad2, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  BARTER_DASH_PROGRESS_EVENT,
  getBarterDashProgress,
  type BarterDashProgress,
} from '@/lib/barter-dash';

const emptyProgress: BarterDashProgress = { unlocked: false, bestScore: 0, streak: 0 };

export function BarterDashProfileCard({ className = '' }: { className?: string }) {
  const [progress, setProgress] = useState<BarterDashProgress>(emptyProgress);

  useEffect(() => {
    const refresh = () => setProgress(getBarterDashProgress());
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener(BARTER_DASH_PROGRESS_EVENT, refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(BARTER_DASH_PROGRESS_EVENT, refresh);
    };
  }, []);

  if (!progress.unlocked) return null;

  return (
    <Link
      href="/games/barter-dash"
      className={`group block rounded-3xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary ${className}`.trim()}
      aria-label="Открыть Barter Dash"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl [background-color:var(--mode-accent-soft)] [color:var(--mode-accent)]">
          <Gamepad2 size={25} strokeWidth={1.8} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">Barter Dash</span>
            <span className="rounded-full [background-color:var(--mode-accent-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide [color:var(--mode-accent)]">
              secret
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Trophy size={14} strokeWidth={1.8} aria-hidden />
              Рекорд: {progress.bestScore > 0 ? progress.bestScore.toLocaleString('ru-RU') : '—'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Flame size={14} strokeWidth={1.8} aria-hidden />
              Серия: {progress.streak > 0 ? `${progress.streak} дн.` : '—'}
            </span>
          </div>
        </div>
        <ChevronRight
          size={20}
          strokeWidth={1.8}
          className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>
    </Link>
  );
}
