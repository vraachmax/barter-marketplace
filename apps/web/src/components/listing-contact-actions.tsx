'use client';

import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import FavoriteToggle from '@/components/favorite-toggle';
import { ShowPhoneButton } from '@/components/show-phone-button';

type Props = { barterEnabled?: boolean; saleEnabled?: boolean; listingId: string; sellerId: string; active: boolean; phone: string | null; email: string | null };

export default function ListingContactActions({ listingId, sellerId, active, phone, email, saleEnabled, barterEnabled }: Props) {
  const { user, ready } = useAuth();
  if (user?.id === sellerId) return (
    <Button render={<Link href="/listings" />} size="lg" className="listing-owner-action w-full">Управлять объявлением</Button>
  );
  return (
    <div className="listing-contact-actions space-y-3">
      {active ? <>
        <div className="listing-primary-actions">
          {barterEnabled ? <Button render={<Link href={`/messages?listingId=${listingId}`} />} variant="secondary" size="lg" disabled={!ready}>Обсудить обмен</Button> : null}
          {saleEnabled !== false ? <Button render={<Link href={`/messages?listingId=${listingId}`} />} size="lg" disabled={!ready}>Написать продавцу</Button> : null}
        </div>
        <ShowPhoneButton listingId={listingId} phone={phone} email={email} />
      </> : <p className="rounded-2xl bg-muted p-3 text-sm text-muted-foreground">Объявление сейчас недоступно для новых обращений.</p>}
      <FavoriteToggle listingId={listingId} />
    </div>
  );
}

