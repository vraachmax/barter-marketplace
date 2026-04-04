'use client';

import { useEffect, useRef } from 'react';
import { trackBehaviorEvents } from '@/lib/behavior-track';

/** Фиксирует view_item при открытии страницы объявления в браузере. */
export default function ListingViewTracker({ listingId }: { listingId: string }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void trackBehaviorEvents([{ type: 'view_item', listingId }]);
  }, [listingId]);

  return null;
}
