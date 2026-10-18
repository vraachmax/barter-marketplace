'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Popover } from '@base-ui/react/popover';
import Image from 'next/image';
import { Tag, Repeat2, Layers2, Search, ClipboardList } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Главная', icon: 'M11 2.7a1.5 1.5 0 0 1 2 0l8 7.1a1.2 1.2 0 0 1-.8 2.1H19V20a1 1 0 0 1-1 1h-4v-7h-4v7H6a1 1 0 0 1-1-1v-8.1H3.8a1.2 1.2 0 0 1-.8-2.1Z', match: (p: string) => p === '/' || p === '/search' },
  { href: '/favorites', label: 'Избранное', icon: 'M12 21S2 15 2 8.3C2 2.6 9 .9 12 5.5 15 .9 22 2.6 22 8.3 22 15 12 21Z', match: (p: string) => p === '/favorites' },
  { href: '/messages', label: 'Сообщения', icon: 'M12 2C6.5 2 2 5.9 2 10.8c0 2.3 1 4.4 2.7 6L3.5 22l5.7-2.7c.9.2 1.8.3 2.8.3 5.5 0 10-3.9 10-8.8S17.5 2 12 2Z', match: (p: string) => p.startsWith('/messages') },
  { href: '/profile', label: 'Профиль', icon: 'M12 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9ZM3 20c0-4.4 4-7 9-7s9 2.6 9 7c0 .6-.4 1-1 1H4c-.6 0-1-.4-1-1Z', match: (p: string) => p === '/listings' || p.startsWith('/profile') },
];
const CREATE_ITEMS = [
  { mode: 'sale', label: 'Продать', description: 'Предложите свою цену', icon: Tag },
  { mode: 'barter', label: 'Обменять', description: 'Найдите что-то интереснее', icon: Repeat2 },
  { mode: 'both', label: 'Продать или обменять', description: 'Одно объявление, две ленты', icon: Layers2 },
];

/** The approved prototype, adapted to real routes. No per-frame React renders. */
export function LiquidBottomNav() {
  const pathname = usePathname();
  const visible = pathname !== '/new' && !pathname.startsWith('/listing/') && !pathname.startsWith('/games/barter-dash');
  const activeIndex = NAV_ITEMS.findIndex(item => item.match(pathname));
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [activeIndex, pathname]);


  if (!visible) return null;
  return <nav className="magic-nav md:hidden" aria-label="Основная навигация">
    <div className="liquid-nav">
      <div className="liquid-nav__material" aria-hidden />
      <div className="liquid-nav__lens" aria-hidden />
      <ul className="liquid-nav__items">
        {NAV_ITEMS.map((item, index) => {
          return <li key={item.href}><Link href={item.href} className="liquid-nav__link"
            aria-current={index === activeIndex ? 'page' : undefined} data-selected={index === activeIndex}
            draggable={false}>
            <svg className="liquid-nav__icon" width="23" height="23" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d={item.icon} /></svg><span>{item.label}</span>
          </Link></li>;
        })}
      </ul>
    </div>
    <Popover.Root open={menuOpen} onOpenChange={setMenuOpen}>
      <Popover.Trigger className="liquid-nav__add" aria-label="Добавить объявление"><Image src="/brand/claude-mark-white.png" alt="" width={34} height={40} className="compose-brand-mark" /></Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" align="end" sideOffset={14} className="liquid-compose-positioner">
          <Popover.Popup className="liquid-compose">
            <Popover.Title className="liquid-compose__title">Новое объявление</Popover.Title>
            {CREATE_ITEMS.map(item => {
              const Icon = item.icon;
                  return <Link key={item.mode} href={`/new?tradeMode=${item.mode}`} className="liquid-compose__choice" onNavigate={() => setMenuOpen(false)}>
                <Icon size={24} strokeWidth={1.8} aria-hidden /><span>{item.label}<small>{item.description}</small></span>
              </Link>;
            })}
            <div className="liquid-compose__shortcuts">
              <Link href="/search" onNavigate={() => setMenuOpen(false)}><Search size={18} aria-hidden />Поиск</Link>
              <Link href="/listings" onNavigate={() => setMenuOpen(false)}><ClipboardList size={18} aria-hidden />Мои объявления</Link>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  </nav>;
}
