'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, Heart, ClipboardList, UserRound, Plus, Settings, ChartNoAxesColumnIncreasing } from 'lucide-react';
const items = [
  { href: '/', label: 'Главная', Icon: Home },
  { href: '/messages', label: 'Сообщения', Icon: MessageCircle },
  { href: '/favorites', label: 'Избранное', Icon: Heart },
  { href: '/listings', label: 'Мои объявления', Icon: ClipboardList },
  { href: '/profile/analytics', label: 'Аналитика', Icon: ChartNoAxesColumnIncreasing },
  { href: '/profile', label: 'Мой профиль', Icon: UserRound },
];
export function DesktopNavigation() {
  const pathname = usePathname();
  return <aside className="desktop-navigation"><nav aria-label="Разделы БАРТЕРА">
    {items.map(({ href, label, Icon }) => <Link key={href} href={href} aria-current={(href === '/' ? pathname === '/' || pathname === '/search' : href === '/profile' ? pathname === href : pathname.startsWith(href)) ? 'page' : undefined}><Icon size={21} aria-hidden />{label}</Link>)}
    <Link href="/new" className="desktop-navigation-create"><Plus size={20} aria-hidden />Разместить объявление</Link>
    <Link href="/profile/settings"><Settings size={20} aria-hidden />Настройки</Link>
  </nav></aside>;
}
