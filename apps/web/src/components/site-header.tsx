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
  ShoppingCart,
  ChevronDown,
} from 'lucide-react';
import { MegaMenu } from '@/components/mega-menu';
import { ThemeQuickToggle } from '@/components/theme-quick-toggle';

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
      <header className="sticky top-0 z-[100] bg-white dark:bg-zinc-950 border-b border-[#E8E8E8] dark:border-zinc-800">
        {/* Top utility bar â desktop only */}
        <div className="hidden border-b border-[#F0F0F0] dark:border-zinc-800 md:block">
          <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-6">
            <div className="flex items-center gap-4 text-xs text-[#707070] dark:text-zinc-400">
              <span className="cursor-default hover:text-[#007AFF] transition-colors">ÐÐ°ÑÑÐµÑÐ°</span>
              <span className="cursor-default hover:text-[#007AFF] transition-colors">ÐÐ¾Ð¼Ð¾ÑÑ</span>
            </div>
            <div className="flex items-center gap-3">
              <ThemeQuickToggle />
              <Link href="/favorites" className="flex items-center gap-1 text-xs text-[#707070] hover:text-[#007AFF] transition-colors dark:text-zinc-400">
                <Heart size={14} strokeWidth={1.8} />
                <span className="hidden lg:inline">ÐÐ·Ð±ÑÐ°Ð½Ð½Ð¾Ðµ</span>
              </Link>
              {ready && user ? (
                <Link href="/messages" className="flex items-center gap-1 text-xs text-[#707070] hover:text-[#007AFF] transition-colors dark:text-zinc-400">
                  <MessageCircle size={14} strokeWidth={1.8} />
                  <span className="hidden lg:inline">Ð¡Ð¾Ð¾Ð±ÑÐµÐ½Ð¸Ñ</span>
                </Link>
              ) : null}
              {ready ? (
                user ? (
                  <button
                    type="button"
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-1 text-xs text-[#707070] hover:text-[#007AFF] transition-colors dark:text-zinc-400"
                  >
                    <User size={14} strokeWidth={1.8} />
                    <span className="hidden lg:inline">{user.name ?? 'ÐÑÐ¾ÑÐ¸Ð»Ñ'}</span>
                  </button>
                ) : (
                  <Link href="/auth?mode=login" className="text-xs font-medium text-[#007AFF] hover:text-[#0066DD] transition-colors">
                    ÐÑÐ¾Ð´ Ð¸ ÑÐµÐ³Ð¸ÑÑÑÐ°ÑÐ¸Ñ
                  </Link>
                )
              ) : null}
              <Link
                href="/new"
                className="inline-flex items-center gap-1 rounded-md bg-[#007AFF] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#0066DD]"
              >
                <Plus size={14} strokeWidth={2} />
                Ð Ð°Ð·Ð¼ÐµÑÑÐ¸ÑÑ Ð¾Ð±ÑÑÐ²Ð»ÐµÐ½Ð¸Ðµ
              </Link>
            </div>
          </div>
        </div>

        {/* Main header row with logo + categories + search */}
        <div className="mx-auto hidden max-w-7xl items-center gap-3 px-6 py-3 md:flex">
          <div className="shrink-0">
            <BarterHomeLogo />
          </div>

          {/* Mega menu trigger */}
          <button
            type="button"
            onClick={() => setMegaOpen((v) => !v)}
            className="shrink-0 items-center gap-1.5 rounded-lg bg-[#007AFF] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0066DD] inline-flex"
          >
            <LayoutGrid size={16} strokeWidth={1.8} aria-hidden />
            ÐÑÐµ ÐºÐ°ÑÐµÐ³Ð¾ÑÐ¸Ð¸
          </button>

          {/* Search slot from page.tsx â desktop only */}
          {children}
        </div>

        {/* Profile dropdown (anchored to top bar) */}
        {menuOpen ? (
          <div ref={menuRef} className="absolute right-6 top-[36px] z-[300]">
            <div className="w-72 overflow-hidden rounded-lg bg-white shadow-[0_4px_24px_rgba(0,0,0,0.12)] dark:bg-zinc-900">
              <div className="bg-[#E8F2FF] px-4 py-3 dark:bg-blue-950/30">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-lg bg-[#007AFF] text-sm font-bold text-white">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#111] dark:text-zinc-50">
                      {user?.name ?? 'ÐÐ¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»Ñ'}
                    </p>
                    <p className="truncate text-xs text-[#707070] dark:text-zinc-400">{user?.email ?? user?.phone}</p>
                  </div>
                </div>
              </div>
              <div className="py-1.5">
                {[
                  { href: '/profile', icon: <Tag size={18} strokeWidth={1.8} />, label: 'ÐÐ¾Ð¸ Ð¾Ð±ÑÑÐ²Ð»ÐµÐ½Ð¸Ñ' },
                  { href: '/profile/orders', icon: <Package size={18} strokeWidth={1.8} />, label: 'ÐÐ°ÐºÐ°Ð·Ñ' },
                  { href: '/profile/reviews', icon: <Star size={18} strokeWidth={1.8} fill="currentColor" />, label: 'ÐÐ¾Ð¸ Ð¾ÑÐ·ÑÐ²Ñ' },
                  { href: '/favorites', icon: <Heart size={18} strokeWidth={1.8} />, label: 'ÐÐ·Ð±ÑÐ°Ð½Ð½Ð¾Ðµ' },
                  { href: '/wallet', icon: <Wallet size={18} strokeWidth={1.8} />, label: 'ÐÐ¾ÑÐµÐ»ÑÐº' },
                ].map(({ href, icon, label }) => (
                  <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-[#111] transition hover:bg-[#F4F4F4] dark:text-zinc-300 dark:hover:bg-zinc-800">
                    <span className="shrink-0 text-[#707070] dark:text-zinc-400">{icon}</span>
                    {label}
                  </Link>
                ))}
              </div>
              <div className="border-t border-[#E8E8E8] py-1.5 dark:border-zinc-800">
                <Link href="/profile/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-[#111] transition hover:bg-[#F4F4F4] dark:text-zinc-300 dark:hover:bg-zinc-800">
                  <Settings size={18} strokeWidth={1.8} className="shrink-0 text-[#707070]" />
                  ÐÐ°ÑÑÑÐ¾Ð¹ÐºÐ¸
                </Link>
                <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20">
                  <LogOut size={18} strokeWidth={1.8} className="shrink-0" />
                  ÐÑÐ¹ÑÐ¸
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Mobile header */}
        <div className="flex items-center gap-2 px-4 py-2.5 md:hidden">
          <div className="shrink-0">
            <BarterHomeLogo />
          </div>
          <form action="/" method="GET" className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-[#F0F0F0] px-3 py-2 dark:bg-zinc-800">
            <Search size={16} strokeWidth={1.8} className="shrink-0 text-[#999]" aria-hidden />
            <input
              type="text"
              name="q"
              placeholder="ÐÐ¾Ð¸ÑÐº Ð¿Ð¾ Ð¾Ð±ÑÑÐ²Ð»ÐµÐ½Ð¸ÑÐ¼"
              className="min-w-0 flex-1 bg-transparent text-sm text-[#111] outline-none placeholder:text-[#999] dark:text-zinc-100"
            />
          </form>
          <button
            type="button"
            onClick={() => setMegaOpen((v) => !v)}
            className="grid size-10 shrink-0 place-items-center rounded-lg text-[#707070] transition hover:bg-[#F0F0F0] dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="ÐÐ°ÑÐµÐ³Ð¾ÑÐ¸Ð¸"
          >
            <SlidersHorizontal size={20} strokeWidth={1.8} aria-hidden />
          </button>
        </div>
      </header>

      <MegaMenu open={megaOpen} onClose={closeMega} />
    </>
  );
}
