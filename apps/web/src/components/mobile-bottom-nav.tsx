'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { Home as HomeIcon, Search, ClipboardList, MessageCircle, User } from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: typeof HomeIcon;
  match: (pathname: string) => boolean;
};

/**
 * Mobile bottom-navigation в стиле «magic-navigation» (Hotfix #16).
 *
 * Дизайн:
 *   • Бар прибит к низу (fixed), 5 равных пунктов на всю ширину экрана.
 *   • Активный пункт «выпрыгивает» вверх — иконка translateY(-34px),
 *     под ним появляется круглый индикатор на var(--mode-accent)
 *     (оранжевый в Бартере / голубой в Маркете).
 *   • Снизу под иконкой плавно проявляется label (opacity 0→1 +
 *     translateY 20→0). У неактивных — спрятан.
 *   • Индикатор плавно «скользит» к новому активному пункту через
 *     transform: translateX(N * 100%), где N — индекс активного из
 *     NAV_ITEMS. CSS transitions делают это бесшовным.
 *
 * Палитра/шрифты — наши:
 *   • var(--mode-accent) для индикатора и label, var(--background) для
 *     "выреза" вокруг кружка (имитация вогнутого стыка через border +
 *     ::before/::after box-shadow).
 *   • Шрифт Golos Text наследуется из body.
 *
 * Пункты (под нашу IA Avito-клона):
 *   Главная · Поиск · Объявления (центральный) · Сообщения · Профиль.
 *
 * Hotfix #15 контракт сохранён: на `/new` (wizard) bottom-nav скрыт
 * полностью — у wizard'а свой sticky action-bar и две fixed-плашки
 * перекрывали бы друг друга.
 *
 * Стили — в globals.css блок `.magic-nav { ... }`. Псевдо-элементы для
 * "выреза" вокруг dot Tailwind не покрывает, поэтому отдельный CSS-блок.
 */
const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Главная', icon: HomeIcon, match: (p) => p === '/' },
  { href: '/search', label: 'Поиск', icon: Search, match: (p) => p === '/search' },
  { href: '/listings', label: 'Объявления', icon: ClipboardList, match: (p) => p === '/listings' },
  { href: '/messages', label: 'Сообщения', icon: MessageCircle, match: (p) => p.startsWith('/messages') },
  { href: '/profile', label: 'Профиль', icon: User, match: (p) => p === '/profile' || p.startsWith('/profile/') },
];

/** Маршруты, на которых нижняя навигация полностью скрывается. */
const HIDE_ON_PATHS = new Set<string>(['/new']);

export function MobileBottomNav() {
  const pathname = usePathname();

  // Индекс активного пункта — нужен для translateX индикатора.
  // Если pathname не матчит ни один пункт (например, /listing/[id]) —
  // индикатор уезжает за левый край (translateX -100%) и кажется скрытым,
  // активного label тоже нет.
  const activeIndex = useMemo(
    () => NAV_ITEMS.findIndex((it) => it.match(pathname)),
    [pathname],
  );

  if (HIDE_ON_PATHS.has(pathname)) return null;

  return (
    <nav className="magic-nav md:hidden" aria-label="Основная навигация">
      <ul>
        {NAV_ITEMS.map((item, idx) => {
          const active = idx === activeIndex;
          const Icon = item.icon;
          return (
            <li
              key={item.href}
              className={
                active ? 'magic-nav__item magic-nav__item--active' : 'magic-nav__item'
              }
            >
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                aria-label={item.label}
              >
                <span className="magic-nav__icon">
                  <Icon size={22} strokeWidth={1.9} aria-hidden />
                </span>
                <span className="magic-nav__text">{item.label}</span>
              </Link>
            </li>
          );
        })}
        <div
          className="magic-nav__indicator"
          style={{
            // Если активного нет (-1) — прячем индикатор за левый край.
            transform:
              activeIndex >= 0
                ? `translateX(${activeIndex * 100}%)`
                : 'translateX(-200%)',
          }}
          aria-hidden
        >
          <span className="magic-nav__indicator-dot" />
        </div>
      </ul>
    </nav>
  );
}
