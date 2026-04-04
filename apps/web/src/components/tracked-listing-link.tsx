'use client';

import Link, { type LinkProps } from 'next/link';
import type { ReactNode } from 'react';
import { trackBehaviorEvents } from '@/lib/behavior-track';

type Props = Omit<LinkProps, 'href'> & {
  href: string;
  listingId: string;
  className?: string;
  children: ReactNode;
};

/** Ссылка на объявление с учётом click_item (лента / рекомендации). */
export function TrackedListingLink({ listingId, onClick, children, ...props }: Props) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        void trackBehaviorEvents([{ type: 'click_item', listingId }]);
        onClick?.(e);
      }}
    >
      {children}
    </Link>
  );
}
