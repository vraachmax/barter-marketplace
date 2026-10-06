'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { unlockBarterDash } from '@/lib/barter-dash';

/** Совпадает с брейкпоинтом `md` в Tailwind */
const DESKTOP_MIN_WIDTH_PX = 768;
const DASH_TAP_WINDOW_MS = 10000;
const DASH_TAP_COUNT_KEY = 'barter_dash_logo_tap_count';
const DASH_TAP_AT_KEY = 'barter_dash_logo_tap_at';

function clearHomeFilterCookies() {
  const opts = 'path=/; max-age=0; samesite=lax';
  document.cookie = `barter_pref_city=; ${opts}`;
  document.cookie = `barter_pref_category=; ${opts}`;
}

/**
 * Логотип на главной: на десктопе клик сбрасывает фильтры и поиск (URL + cookie предпочтений).
 * На мобильной веб-версии — обычный переход на «/» без принудительного сброса cookie.
 */
export function BarterHomeLogo() {
  const router = useRouter();

  function registerDashTap(): boolean {
    const now = Date.now();
    try {
      const lastTap = Number(window.sessionStorage.getItem(DASH_TAP_AT_KEY) ?? 0);
      const previousCount = Number(window.sessionStorage.getItem(DASH_TAP_COUNT_KEY) ?? 0);
      const count = now - lastTap <= DASH_TAP_WINDOW_MS ? previousCount + 1 : 1;

      if (count >= 5) {
        window.sessionStorage.removeItem(DASH_TAP_COUNT_KEY);
        window.sessionStorage.removeItem(DASH_TAP_AT_KEY);
        unlockBarterDash();
        try {
          navigator.vibrate?.([30, 35, 70]);
        } catch {
          // Haptics are optional.
        }
        return true;
      }

      window.sessionStorage.setItem(DASH_TAP_COUNT_KEY, String(count));
      window.sessionStorage.setItem(DASH_TAP_AT_KEY, String(now));
      return false;
    } catch {
      return false;
    }
  }

  function onLogoClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (typeof window === 'undefined') return;

    if (registerDashTap()) {
      e.preventDefault();
      router.push('/games/barter-dash');
      return;
    }

    const isDesktop = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH_PX}px)`).matches;
    if (!isDesktop) return;

    e.preventDefault();
    clearHomeFilterCookies();
    router.push('/');
    router.refresh();
  }

  return (
    <Link
      href="/"
      onClick={onLogoClick}
      className="inline-flex min-h-11 w-fit shrink-0 items-center"
      title="Главная — сбросить фильтры и поиск"
      aria-label="Бартер — на главную"
    >
      <span className="inline-flex items-center gap-2">
        <Image
          src="/brand/bubble-b-v2/mark.png"
          alt=""
          width={160}
          height={192}
          sizes="(min-width: 768px) 36px, 32px"
          unoptimized
          className="h-auto w-8 shrink-0 object-contain md:w-9"
        />
        <span className="whitespace-nowrap text-base font-bold tracking-tight text-foreground md:text-lg">БАРТЕР</span>
      </span>
    </Link>
  );
}
