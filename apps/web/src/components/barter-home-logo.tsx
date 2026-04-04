'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

/** Совпадает с брейкпоинтом `md` в Tailwind */
const DESKTOP_MIN_WIDTH_PX = 768;

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

  function onLogoClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (typeof window === 'undefined') return;
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
      className="inline-flex items-center"
      title="Главная — сбросить фильтры и поиск"
      aria-label="Бартер — на главную"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo_light.svg"
        alt="Бартер"
        className="brand-logo-light h-9 w-auto max-w-[180px] object-contain md:h-10 md:max-w-[200px]"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo_dark.svg"
        alt="Бартер"
        className="brand-logo-dark h-9 w-auto max-w-[180px] object-contain md:h-10 md:max-w-[200px]"
      />
    </Link>
  );
}
