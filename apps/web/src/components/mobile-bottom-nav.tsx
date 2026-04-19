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
 * Bottom-nav — mode-aware (Бартер / Маркет).
 * Активный пункт и FAB подсвечиваются `var(--mode-accent)` — оранжевым в
 * Бартере и голубым в Маркете. Переключение мгновенное: CSS-переменные
 * меняются вместе с `<html data-mode>` (см. globals.css), поэтому ре-рендер
 * не нужен.
 *
 * Пункты: Главная · Поиск · +Добавить (FAB) · Сообщения · Профиль.
 * Кнопка «Поиск» ведёт на `/search` (Phase 1.x — клон моб. поиска Avito
 * с широким списком категорий и фильтрами). Пока страница не готова —
 * деградирует к `/listings`, см. fallback ниже.
 */
const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Главная', icon: HomeIcon, match: (p) => p === '/' },
  { href: '/search', label: 'Поиск', icon: Search, match: (p) => p === '/search' || p === '/listings' },
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
                    background: 'var(--mode-accent)',
                    borderRadius: 14,
                    display: 'grid',
                    placeItems: 'center',
                    color: '#fff',
                    boxShadow: '0 4px 12px var(--mode-accent-ring)',
                    marginTop: -12,
                    transition: 'background 200ms ease, box-shadow 200ms ease',
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
                  ? 'var(--mode-accent)'
                  : 'var(--color-muted-foreground, #94A3B8)',
                fontWeight: active ? 700 : 500,
                fontSize: 10,
                padding: '4px 0',
                transition: 'color 200ms ease',
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
