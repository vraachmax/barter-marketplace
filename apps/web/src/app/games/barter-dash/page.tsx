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
    document.body.style.overflow = 'hidden';

    const onGameMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || typeof event.data !== 'object' || event.data === null) return;
      const type = 'type' in event.data ? String(event.data.type) : '';
      if (!type.startsWith('barter-dash:')) return;
      window.setTimeout(announceBarterDashProgress, 0);
    };

    window.addEventListener('message', onGameMessage);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('message', onGameMessage);
    };
  }, [router]);

  if (!allowed) {
    return <div className="fixed inset-0 z-[2000] bg-[#080b12]" aria-label="Открываем Barter Dash" />;
  }

  return (
    <main className="fixed inset-0 z-[2000] overflow-hidden bg-[#080b12]" data-barter-dash-shell>
      <button
        type="button"
        onClick={() => {
          if (window.history.length > 1) router.back();
          else router.push('/profile');
        }}
        className="fixed left-3 z-[2020] inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-black/45 px-4 text-sm font-bold text-white shadow-lg backdrop-blur-md transition hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-white"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
        aria-label="Вернуться в БАРТЕР"
      >
        <ArrowLeft size={19} strokeWidth={2} aria-hidden />
        Назад
      </button>
      <iframe
        src="/games/barter-dash/index.html"
        title="Barter Dash"
        className="h-full w-full border-0"
        allow="autoplay; fullscreen"
      />
    </main>
  );
}
