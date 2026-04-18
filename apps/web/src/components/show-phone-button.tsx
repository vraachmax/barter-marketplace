'use client';

import { Phone } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { getToken } from '@/lib/auth-store';

type Props = {
  phone: string | null;
  email: string | null;
  sellerId: string;
};

function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  return phone.slice(0, -4).replace(/./g, (c, i) => (i < 2 ? c : '*')) + phone.slice(-2) + '**';
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

export function ShowPhoneButton({ phone, email, sellerId }: Props) {
  const { user } = useAuth();
  const [revealed, setRevealed] = useState(false);
  const [contactData, setContactData] = useState<{ phone?: string | null; email?: string | null } | null>(null);

  const hasContact = phone || email;
  const maskedDisplay = phone ? maskPhone(phone) : email ? maskEmail(email) : null;

  const reveal = useCallback(async () => {
    if (revealed) return;
    if (!user) {
      window.location.href = '/auth?mode=login';
      return;
    }
    const token = getToken();
    try {
      const res = await fetch(`/users/${sellerId}/profile`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        const u = data.user;
        setContactData({ phone: u?.phone, email: u?.email });
      }
    } catch {}
    setRevealed(true);
  }, [revealed, user, sellerId]);

  if (!hasContact) return null;

  if (revealed && contactData) {
    return (
      <div className="space-y-1.5">
        {contactData.phone ? (
          <a
            href={`tel:${contactData.phone}`}
            className="flex items-center gap-2 rounded-xl bg-secondary/10 px-4 py-2.5 text-sm font-bold text-secondary ring-1 ring-secondary/30 transition hover:bg-secondary/10"
          >
            <Phone size={18} strokeWidth={1.8} aria-hidden />
            {contactData.phone}
          </a>
        ) : null}
        {contactData.email ? (
          <a
            href={`mailto:${contactData.email}`}
            className="block truncate rounded-xl bg-muted/50 px-4 py-2 text-xs text-muted-foreground ring-1 ring-border"
          >
            {contactData.email}
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={reveal}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:border-secondary/30 hover:bg-secondary/10 hover:text-secondary"
    >
      <Phone size={18} strokeWidth={1.8} aria-hidden />
      <span>Показать контакт</span>
      {maskedDisplay ? (
        <span className="ml-auto font-mono text-xs text-muted-foreground">{maskedDisplay}</span>
      ) : null}
    </button>
  );
}
