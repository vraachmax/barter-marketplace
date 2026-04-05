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
            className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-800 ring-1 ring-emerald-200/80 transition hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800/50 dark:hover:bg-emerald-950/60"
          >
            <Phone size={18} strokeWidth={1.8} aria-hidden />
            {contactData.phone}
          </a>
        ) : null}
        {contactData.email ? (
          <a
            href={`mailto:${contactData.email}`}
            className="block truncate rounded-xl bg-zinc-50 px-4 py-2 text-xs text-zinc-600 ring-1 ring-zinc-200/80 dark:bg-zinc-800/50 dark:text-zinc-300 dark:ring-zinc-700"
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
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-200"
    >
      <Phone size={18} strokeWidth={1.8} aria-hidden />
      <span>Показать контакт</span>
      {maskedDisplay ? (
        <span className="ml-auto font-mono text-xs text-zinc-400 dark:text-zinc-500">{maskedDisplay}</span>
      ) : null}
    </button>
  );
}
