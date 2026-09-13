'use client';

import Link from 'next/link';
import { Mail, Phone } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { listingLoginHref } from '@/lib/listing-presentation';

type Props = { phone: string | null; email: string | null; listingId: string };

export function ShowPhoneButton({ phone, email, listingId }: Props) {
  const { user, ready } = useAuth();
  const [revealed, setRevealed] = useState(false);
  if (!phone && !email) return null;
  const Icon = phone ? Phone : Mail;
  if (revealed && user) return (
    <div className="space-y-2">
      {phone ? <Button render={<a href={`tel:${phone}`} />} variant="outline" size="lg" className="w-full"><Phone size={18} aria-hidden />{phone}</Button> : null}
      {email ? <Button render={<a href={`mailto:${email}`} />} variant="outline" size="lg" className="w-full min-w-0 whitespace-normal break-all py-3 text-sm"><Mail size={18} aria-hidden />{email}</Button> : null}
    </div>
  );
  if (ready && !user) return <Button render={<Link href={listingLoginHref(listingId)} />} variant="outline" size="lg" className="w-full"><Icon size={18} aria-hidden />Показать контакт</Button>;
  return <Button variant="outline" size="lg" disabled={!ready} onClick={() => setRevealed(true)} className="w-full"><Icon size={18} aria-hidden />Показать контакт</Button>;
}
