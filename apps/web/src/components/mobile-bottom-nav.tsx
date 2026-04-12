'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home as HomeIcon, Heart, ListPlus, MessageCircle, User } from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: typeof HomeIcon;
  match?: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Главная', icon: HomeIcon, match: (p) => p === '/' },
  { href: '/favorites', label: 'Избранное', icon: Heart, match: (p) => p === '/favorites' },
  { href: '/profile/listings', label: 'Объявления', icon: ListPlus, match: (p) => p === '/profile/listings' },
  { href: '/messages', label: 'Сообщения', icon: MessageCircle, match: (p) => p.startsWith('/messages') },
  { href: '/profile', label: 'Профиль', icon: User, match: (p) => p === '/profile' || p === '/profile/settings' },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', zIndex: 1000 }} className="md:hidden">
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '8px 16px 16px', background: '#fff', borderTop: '1px solid #E8E8E8', boxShadow: '0 -2px 12px rgba(0,0,0,0.04)' }} className="dark:!bg-zinc-950 dark:!border-zinc-800">
        {NAV_ITEMS.map((item) => {
          const isActive = item.match ? item.match(pathname) : pathname === item.href;

          return (
            <Link key={item.href} href={item.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: isActive ? '#00AAFF' : '#94A3B8', fontWeight: isActive ? 700 : 400, textDecoration: 'none' }}>
              <item.icon size={24} strokeWidth={1.8} fill={isActive ? '#00AAFF' : 'none'} aria-hidden />
              <span style={{ fontSize: 10, fontWeight: 500, marginTop: 4 }}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
