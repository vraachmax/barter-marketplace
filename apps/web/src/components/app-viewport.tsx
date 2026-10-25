'use client';
import { DesktopNavigation } from './desktop-navigation';
import { LiquidBottomNav } from './liquid-bottom-nav';
import { PwaLayoutDiagnostics } from './pwa-layout-diagnostics';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';

/** Keep the system inset outside the mobile scrolling surface. */
export function AppViewport({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo(0, 0); }, [pathname]);

  // An installed iOS PWA can keep a short CSS layout viewport after an
  // external full-screen document (Barter Dash). Match the real device
  // screen rather than anchoring the dock to that stale layout viewport.
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    if (!standalone) return;

    const sync = () => {
      const current = shellRef.current;
      if (!current) return;
      const viewport = window.visualViewport;
      const focused = document.activeElement;
      const typing = focused instanceof HTMLElement
        && (focused.matches('input, textarea, select, [contenteditable="true"]'));
      const keyboardOpen = Boolean(typing && viewport
        && window.innerHeight - viewport.height - viewport.offsetTop > 120);
      current.dataset.keyboardOpen = String(keyboardOpen);
      const height = Math.max(
        window.innerHeight,
        document.documentElement.clientHeight,
        window.screen.height || 0,
      );
      current.style.setProperty('--barter-pwa-shell-height', Math.ceil(height) + 'px');
    };

    sync();
    const raf = requestAnimationFrame(sync);
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    window.addEventListener('pageshow', sync);
    window.addEventListener('focusin', sync);
    window.addEventListener('focusout', sync);
    document.addEventListener('visibilitychange', sync);
    window.visualViewport?.addEventListener('resize', sync);
    window.visualViewport?.addEventListener('scroll', sync);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
      window.removeEventListener('pageshow', sync);
      window.removeEventListener('focusin', sync);
      window.removeEventListener('focusout', sync);
      document.removeEventListener('visibilitychange', sync);
      window.visualViewport?.removeEventListener('resize', sync);
      window.visualViewport?.removeEventListener('scroll', sync);
      shell.style.removeProperty('--barter-pwa-shell-height');
      delete shell.dataset.keyboardOpen;
    };
  }, [pathname]);
  if (pathname.startsWith('/games/barter-dash')) return children;
  return (
    <div
      ref={shellRef}
      className="app-viewport"
      data-screen={pathname.startsWith('/listing/') ? 'listing' : pathname.split('/')[1] || 'home'}
    >
      <DesktopNavigation />
      <div ref={scrollRef} className="app-scroll-root">{children}</div>
      {/* Share the same viewport coordinate system with the scrolling app.
          iOS standalone WebKit can offset body-fixed UI from this shell. */}
      <LiquidBottomNav />
      <PwaLayoutDiagnostics />
    </div>
  );
}
