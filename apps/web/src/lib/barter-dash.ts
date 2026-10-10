export const BARTER_DASH_UNLOCKED_KEY = 'barter_dash_unlocked_v1';
export const BARTER_DASH_UNLOCKED_AT_KEY = 'barter_dash_unlocked_at_v1';
export const BARTER_DASH_PROGRESS_EVENT = 'barter-dash:progress';

export type BarterDashProgress = {
  unlocked: boolean;
  bestScore: number;
  streak: number;
};

function toNonNegativeInteger(value: string | null): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function readStreak(raw: string | null): number {
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw) as { streak?: unknown };
    return typeof parsed.streak === 'number' && Number.isFinite(parsed.streak) && parsed.streak > 0
      ? Math.floor(parsed.streak)
      : 0;
  } catch {
    return 0;
  }
}

export function getBarterDashProgress(): BarterDashProgress {
  if (typeof window === 'undefined') return { unlocked: false, bestScore: 0, streak: 0 };
  try {
    return {
      unlocked: window.localStorage.getItem(BARTER_DASH_UNLOCKED_KEY) === '1',
      bestScore: toNonNegativeInteger(window.localStorage.getItem('bd.best')),
      streak: readStreak(window.localStorage.getItem('bd.meta')),
    };
  } catch {
    return { unlocked: false, bestScore: 0, streak: 0 };
  }
}

export function announceBarterDashProgress(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(BARTER_DASH_PROGRESS_EVENT));
}

export function unlockBarterDash(): BarterDashProgress {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(BARTER_DASH_UNLOCKED_KEY, '1');
      if (!window.localStorage.getItem(BARTER_DASH_UNLOCKED_AT_KEY)) {
        window.localStorage.setItem(BARTER_DASH_UNLOCKED_AT_KEY, new Date().toISOString());
      }
    } catch {
      // Private browsing / storage denial must not make the Easter egg crash settings.
    }
    announceBarterDashProgress();
  }
  return getBarterDashProgress();
}
