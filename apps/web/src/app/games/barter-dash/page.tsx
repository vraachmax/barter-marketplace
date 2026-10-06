'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  announceBarterDashProgress,
  getBarterDashProgress,
} from '@/lib/barter-dash';

export default function BarterDashPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!getBarterDashProgress().unlocked) {
      router.replace('/profile/settings?section=about');
      return;
    }

    setAllowed(true);
    const previousOverflow = document.body.style.overflow;
    const previousBodyBackground = document.body.style.backgroundColor;
    const previousHtmlBackground = document.documentElement.style.backgroundColor;
    document.body.style.overflow = 'hidden';
    document.body.style.backgroundColor = '#060914';
    document.documentElement.style.backgroundColor = '#060914';

    const statusMeta =
      document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-status-bar-style"]') ??
      (() => {
        const meta = document.createElement('meta');
        meta.name = 'apple-mobile-web-app-status-bar-style';
        document.head.appendChild(meta);
        return meta;
      })();
    const previousStatusBarStyle = statusMeta.content;
    statusMeta.content = 'black-translucent';

    const themeMeta =
      document.querySelector<HTMLMetaElement>('meta[name="theme-color"]') ??
      (() => {
        const meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.appendChild(meta);
        return meta;
      })();
    const previousThemeColor = themeMeta.content;
    themeMeta.content = '#060914';

    const onGameMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || typeof event.data !== 'object' || event.data === null) return;
      const type = 'type' in event.data ? String(event.data.type) : '';
      if (!type.startsWith('barter-dash:')) return;
      window.setTimeout(announceBarterDashProgress, 0);
    };

    window.addEventListener('message', onGameMessage);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.backgroundColor = previousBodyBackground;
      document.documentElement.style.backgroundColor = previousHtmlBackground;
      statusMeta.content = previousStatusBarStyle;
      themeMeta.content = previousThemeColor;
      window.removeEventListener('message', onGameMessage);
    };
  }, [router]);

  if (!allowed) {
    return <div className="fixed inset-0 z-[2000] bg-[#080b12]" aria-label="Открываем Barter Dash" />;
  }

  return (
    <main
      className="fixed inset-0 z-[2000] overflow-hidden bg-[#080b12]"
      style={{ width: '100dvw', height: '100dvh', overscrollBehavior: 'none', touchAction: 'none' }}
      data-barter-dash-shell
    >
      <button
        type="button"
        onClick={() => {
          if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
          if (window.history.length > 1) router.back();
          else router.push('/profile');
        }}
        className="fixed z-[2020] grid size-10 place-items-center rounded-full border border-white/10 bg-black/30 text-white/90 shadow-lg backdrop-blur-md transition hover:bg-black/50 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
          left: 'calc(env(safe-area-inset-left, 0px) + 8px)',
        }}
        aria-label="Вернуться в БАРТЕР"
        title="Назад"
      >
        <ArrowLeft size={20} strokeWidth={2} aria-hidden />
      </button>
      <iframe
        src="/games/barter-dash/index.html"
        title="Barter Dash"
        className="block border-0"
        style={{ width: '100dvw', height: '100dvh' }}
        allow="autoplay; fullscreen"
        allowFullScreen
      />
    </main>
  );
}
