'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home as HomeIcon, Search, Plus, MessageCircle, User } from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: typeof HomeIcon;
  match: (pathname: string) => boolean;
  fab?: boolean;
};

/**
 * Bottom-nav пересобран по Claude Design home.html (mobile).
 * Структура: Главная · Поиск · +Добавить (приподнятый FAB) · Сообщения · Профиль.
 * «Избранное» переехало в шапку (heart-icon со счётчиком), как в дизайне.
 */
const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Главная', icon: HomeIcon, match: (p) => p === '/' },
  { href: '/listings', label: 'Поиск', icon: Search, match: (p) => p === '/listings' },
  { href: '/new', label: 'Добавить', icon: Plus, match: (p) => p === '/new', fab: true },
  { href: '/messages', label: 'Сообщения', icon: MessageCircle, match: (p) => p.startsWith('/messages') },
  { href: '/profile', label: 'Профиль', icon: User, match: (p) => p === '/profile' || p.startsWith('/profile/') },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        zIndex: 1000,
        background: 'var(--color-background, #fff)',
        borderTop: '1px solid var(--color-border, #ECECEC)',
        boxShadow: '0 -2px 16px rgba(0,0,0,0.06)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          alignItems: 'center',
          padding: '8px 4px 10px',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          if (item.fab) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  textDecoration: 'none',
                  color: 'var(--color-muted-foreground, #6B6B6B)',
                  fontSize: 10,
                  fontWeight: 500,
                  padding: '4px 0',
                }}
              >
                <span
                  style={{
                    width: 44,
                    height: 44,
                    background: 'var(--color-primary, #00AAFF)',
                    borderRadius: 14,
                    display: 'grid',
                    placeItems: 'center',
                    color: '#fff',
                    boxShadow: '0 4px 12px color-mix(in srgb, var(--color-primary, #00AAFF) 35%, transparent)',
                    marginTop: -12,
                  }}
                >
                  <item.icon size={22} strokeWidth={2.2} aria-hidden />
                </span>
                {item.label}
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                textDecoration: 'none',
                color: active
                  ? 'var(--color-primary, #00AAFF)'
                  : 'var(--color-muted-foreground, #94A3B8)',
                fontWeight: active ? 700 : 500,
                fontSize: 10,
                padding: '4px 0',
              }}
            >
              <item.icon
                size={24}
                strokeWidth={1.8}
                fill={active ? 'currentColor' : 'none'}
                aria-hidden
              />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
