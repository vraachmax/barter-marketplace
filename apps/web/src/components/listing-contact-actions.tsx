'use client';

import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import FavoriteToggle from '@/components/favorite-toggle';
import { ShowPhoneButton } from '@/components/show-phone-button';

type Props = { listingId: string; sellerId: string; active: boolean; phone: string | null; email: string | null };

export default function ListingContactActions({ listingId, sellerId, active, phone, email }: Props) {
  const { user, ready } = useAuth();
  if (user?.id === sellerId) return (
    <Button render={<Link href="/listings" />} size="lg" className="w-full">Управлять объявлением</Button>
  );
  return (
    <div className="space-y-3">
      {active ? <>
        <Button render={<Link href={`/messages?listingId=${listingId}`} />} size="lg" className="w-full" disabled={!ready}>Написать продавцу</Button>
        <ShowPhoneButton listingId={listingId} phone={phone} email={email} />
      </> : <p className="rounded-2xl bg-muted p-3 text-sm text-muted-foreground">Объявление сейчас недоступно для новых обращений.</p>}
      <FavoriteToggle listingId={listingId} />
    </div>
  );
}
