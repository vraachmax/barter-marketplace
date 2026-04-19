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
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition"
            style={{
              backgroundColor: 'var(--mode-accent-soft)',
              color: 'var(--mode-accent)',
              boxShadow: 'inset 0 0 0 1px var(--mode-accent-ring)',
            }}
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

  // Кнопка «Показать контакт» — `.btn-show-phone` даёт зелёный CTA (#87D32C)
  // в Маркете и оранжевый (--mode-accent) в Бартере. Блок `h-auto` + `py-3`
  // снимает фиксированную высоту 34px, чтобы лейбл «Показать контакт» с
  // маской номера вмещался без обрезания.
  return (
    <button
      type="button"
      onClick={reveal}
      className="btn-show-phone flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold"
      style={{ height: 'auto' }}
    >
      <Phone size={18} strokeWidth={1.8} aria-hidden />
      <span>Показать контакт</span>
      {maskedDisplay ? (
        <span className="ml-auto font-mono text-xs opacity-90">{maskedDisplay}</span>
      ) : null}
    </button>
  );
}
