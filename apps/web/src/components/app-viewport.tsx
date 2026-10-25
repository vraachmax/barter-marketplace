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
  useEffect(() => { scrollRef.current?.scrollTo(0, 0); }, [pathname]);
  if (pathname.startsWith('/games/barter-dash')) return children;
  return (
    <div
      className="app-viewport"
      data-screen={pathname.startsWith('/listing/') ? 'listing' : pathname.split('/')[1] || 'home'}
    >
      <DesktopNavigation />
      <div ref={scrollRef} className="app-scroll-root">{children}</div>
      {/* The dock participates in the shell's column layout, after the scrollport.
          It never needs a separate body / visual-viewport position. */}
      <LiquidBottomNav />
      <PwaLayoutDiagnostics />
    </div>
  );
}
