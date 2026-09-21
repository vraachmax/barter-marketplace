'use client';

import Link from 'next/link';
import Image from 'next/image';
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
