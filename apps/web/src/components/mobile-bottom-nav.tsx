'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home as HomeIcon, Heart, Plus, MessageCircle, User } from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: typeof HomeIcon;
  isFab?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Главная', icon: HomeIcon },
  { href: '/favorites', label: 'Избранное', icon: Heart },
  { href: '/new', label: 'Разместить', icon: Plus, isFab: true },
  { href: '/messages', label: 'Сообщения', icon: MessageCircle },
  { href: '/profile', label: 'Профиль', icon: User },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', zIndex: 1000 }} className="md:hidden">
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '8px 16px 16px', background: '#fff', borderTop: '1px solid #E8E8E8', boxShadow: '0 -2px 12px rgba(0,0,0,0.04)' }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;

          if (item.isFab) {
            return (
              <div key={item.href} style={{ position: 'relative', top: -24 }}>
                <Link href={item.href} style={{ display: 'flex', width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(to bottom, #00B4D8, #00677d)', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,103,125,0.3)', color: '#fff', textDecoration: 'none' }}>
                  <item.icon size={28} strokeWidth={2.5} aria-hidden />
                </Link>
                <span style={{ position: 'absolute', top: 56, left: '50%', transform: 'translateX(-50%)', fontSize: 10, fontWeight: 500, color: '#94A3B8', whiteSpace: 'nowrap' }}>{item.label}</span>
              </div>
            );
          }

          return (
            <Link key={item.href} href={item.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: isActive ? '#00B4D8' : '#94A3B8', fontWeight: isActive ? 700 : 400, textDecoration: 'none' }}>
              <item.icon size={24} strokeWidth={1.8} fill={isActive ? '#00B4D8' : 'none'} aria-hidden />
              <span style={{ fontSize: 10, fontWeight: 500, marginTop: 4 }}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
