'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getBarterDashProgress } from '@/lib/barter-dash';

export default function BarterDashPage() {
  const router = useRouter();

  useEffect(() => {
    if (!getBarterDashProgress().unlocked) {
      router.replace('/profile/settings?section=about');
      return;
    }

    window.location.replace('/games/barter-dash/index.html?standalone=1');
  }, [router]);

  return (
    <main
      className="fixed inset-0 z-[2000] bg-[#060914]"
      style={{ width: '100dvw', height: '100dvh' }}
      aria-label="Открываем Barter Dash"
    />
  );
}
