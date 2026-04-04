'use client';

import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { BarterHomeLogo } from '@/components/barter-home-logo';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import {
  Bell,
  Heart,
  LayoutGrid,
  LogOut,
  MessageCircle,
  Package,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Star,
  Tag,
  User,
  Wallet,
} from 'lucide-react';
import { MegaMenu } from '@/components/mega-menu';

export function SiteHeader({ children }: { children?: ReactNode }) {
  const { ready, user, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    router.push('/');
  };

  const closeMega = useCallback(() => setMegaOpen(false), []);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? 'U';

  return (
    <>
      <header className="sticky top-0 z-[100] bg-white dark:bg-zinc-950" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        {/* Desktop header row */}
        <div className="mx-auto hidden h-14 max-w-7xl items-center gap-3 px-6 md:flex">
          <div className="shrink-0">
            <BarterHomeLogo />
          </div>

          {/* Mega menu trigger */}
          <button
            type="button"
            onClick={() => setMegaOpen((v) => !v)}
            className="shrink-0 items-center gap-1.5 rounded-lg bg-[#00B4D8] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#0096b5] inline-flex"
          >
            <LayoutGrid size={18} strokeWidth={1.8} aria-hidden />
            Все категории
          </button>

          {/* Search slot from page.tsx */}
          {children}

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-1">
              <IconButton href="/favorites" label="Избранное">
                <Heart size={20} strokeWidth={1.8} aria-hidden />
              </IconButton>
              <IconButton href="/messages" label="Сообщения">
                <MessageCircle size={20} strokeWidth={1.8} aria-hidden />
              </IconButton>
              <IconButton href="/profile/settings?section=notifications" label="Уведомления">
                <Bell size={20} strokeWidth={1.8} aria-hidden />
              </IconButton>
            </div>

            <Link
              href="/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#00B4D8] px-[18px] py-2 text-sm font-semibold text-white transition hover:bg-[#0096b5]"
            >
              <Plus size={16} strokeWidth={1.8} aria-hidden />
              Разместить
            </Link>

            {ready ? (
              user ? (
                <div ref={menuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 rounded-lg border-[1.5px] border-[#e5e7eb] px-2.5 py-[7px] transition hover:border-[#00B4D8] dark:border-zinc-700 dark:hover:border-[#00B4D8]"
                  >
                    <span className="grid size-7 place-items-center rounded-md bg-[#e0f5fb] text-xs font-bold text-[#00B4D8] dark:bg-sky-900 dark:text-sky-300">
                      {initials}
                    </span>
                    <span className="hidden max-w-[100px] truncate text-sm font-medium text-[#1a1a1a] dark:text-zinc-200 lg:inline">
                      {user.name ?? 'Профиль'}
                    </span>
                  </button>

                  {menuOpen ? (
                    <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-lg bg-white shadow-[0_4px_24px_rgba(0,0,0,0.12)] dark:bg-zinc-900">
                      <div className="bg-[#e0f5fb] px-4 py-3 dark:bg-sky-950/30">
                        <div className="flex items-center gap-3">
                          <span className="grid size-10 place-items-center rounded-lg bg-[#00B4D8] text-sm font-bold text-white">
                            {initials}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-[#1a1a1a] dark:text-zinc-50">
                              {user.name ?? 'Пользователь'}
                            </p>
                            <p className="truncate text-xs text-[#6b7280] dark:text-zinc-400">{user.email ?? user.phone}</p>
                          </div>
                        </div>
                      </div>
                      <div className="py-1.5">
                        {[
                          { href: '/profile', icon: <Tag size={20} strokeWidth={1.8} />, label: 'Мои объявления' },
                          { href: '/profile/orders', icon: <Package size={20} strokeWidth={1.8} />, label: 'Заказы' },
                          { href: '/profile/reviews', icon: <Star size={20} strokeWidth={1.8} fill="currentColor" />, label: 'Мои отзывы' },
                          { href: '/favorites', icon: <Heart size={20} strokeWidth={1.8} />, label: 'Избранное' },
                          { href: '/wallet', icon: <Wallet size={20} strokeWidth={1.8} />, label: 'Кошелёк' },
                        ].map(({ href, icon, label }) => (
                          <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#1a1a1a] transition hover:bg-[#f0f9ff] dark:text-zinc-300 dark:hover:bg-zinc-800">
                            <span className="shrink-0 text-[#6b7280] dark:text-zinc-300">{icon}</span>
                            {label}
                          </Link>
                        ))}
                      </div>
                      <div className="border-t border-[#f0f0f0] py-1.5 dark:border-zinc-800">
                        <Link href="/profile/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#1a1a1a] transition hover:bg-[#f0f9ff] dark:text-zinc-300 dark:hover:bg-zinc-800">
                          <Settings size={20} strokeWidth={1.8} className="shrink-0 text-[#6b7280]" />
                          Настройки
                        </Link>
                        <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20">
                          <LogOut size={20} strokeWidth={1.8} className="shrink-0" />
                          Выйти
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <Link
                  href="/auth?mode=login"
                  className="inline-flex items-center gap-1.5 rounded-lg border-[1.5px] border-[#e5e7eb] px-3.5 py-[7px] text-sm font-medium text-[#1a1a1a] transition hover:border-[#00B4D8] dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-[#00B4D8]"
                >
                  <User size={20} strokeWidth={1.8} className="text-[#909090] dark:text-zinc-400" aria-hidden />
                  Войти
                </Link>
              )
            ) : (
              <div className="h-9 w-24 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
            )}
          </div>
        </div>

        {/* Mobile header */}
        <div className="flex items-center gap-2 px-4 py-2.5 md:hidden">
          <div className="shrink-0">
            <BarterHomeLogo />
          </div>
          <form action="/" method="GET" className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-[#f0f0f0] px-3 py-2 dark:bg-zinc-800">
            <Search size={16} strokeWidth={1.8} className="shrink-0 text-[#b0b0b0]" aria-hidden />
            <input
              type="text"
              name="q"
              placeholder="Поиск по объявлениям"
              className="min-w-0 flex-1 bg-transparent text-sm text-[#1a1a1a] outline-none placeholder:text-[#b0b0b0] dark:text-zinc-100"
            />
          </form>
          <button
            type="button"
            onClick={() => setMegaOpen((v) => !v)}
            className="grid size-10 shrink-0 place-items-center rounded-lg text-[#909090] transition hover:bg-[#f0f0f0] dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Категории"
          >
            <SlidersHorizontal size={20} strokeWidth={1.8} aria-hidden />
          </button>
        </div>
      </header>

      <MegaMenu open={megaOpen} onClose={closeMega} />
    </>
  );
}

function IconButton({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <Link href={href} className="grid size-9 place-items-center rounded-full text-[#909090] transition-colors hover:bg-[#f5f5f5] hover:text-[#00B4D8] dark:text-zinc-400 dark:hover:text-[#00B4D8]" aria-label={label} title={label}>
      {children}
    </Link>
  );
}
