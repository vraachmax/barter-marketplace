'use client';

import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { BarterHomeLogo } from '@/components/barter-home-logo';
import { useRouter } from 'next/navigation';
import { useCallback, useState, type ReactNode } from 'react';
import {
  ChevronDown,
  Heart,
  LogOut,
  MessageCircle,
  Package,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tag,
  Wallet,
  Search,
  Lock,
} from 'lucide-react';
import { MegaMenu } from '@/components/mega-menu';
import { ThemeQuickToggle } from '@/components/theme-quick-toggle';
import { SupportSheet } from '@/components/support-sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

/** Shared responsive marketplace header. */
export function SiteHeader({ children, regionControl }: { children?: ReactNode; regionControl?: ReactNode }) {
  const { ready, user, logout } = useAuth();
  const router = useRouter();
  const [megaOpen, setMegaOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const closeMega = useCallback(() => setMegaOpen(false), []);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : (user?.email?.[0]?.toUpperCase() ?? 'U');

  // ── Top utility links ───────────────────────────────────────────────────
  const topLinkClass =
    'inline-flex items-center gap-1 text-[13px] text-foreground/80 transition-colors hover:text-primary';

  return (
    <>
      <header className="glass-panel sticky top-0 z-[100] border-b border-border pt-[env(safe-area-inset-top)] md:pt-0">
        <div className="mx-auto hidden max-w-[1600px] items-center gap-6 px-6 py-4 md:flex">
          <div className="shrink-0"><BarterHomeLogo /></div>
          <div className="min-w-0 flex-1">{children ?? <form action="/search" className="flex h-12 items-center gap-3 rounded-full bg-muted px-5"><Search size={20} /><input aria-label="Поиск товаров" name="q" placeholder="Поиск товаров, категорий, брендов..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" /><button type="button" aria-label="Категории" onClick={() => setMegaOpen(true)}><SlidersHorizontal size={20} /></button></form>}</div>
          {regionControl ?? <Link href="/search" className="shrink-0 text-sm text-muted-foreground">Город и фильтры</Link>}
          <Link href="/favorites" aria-label="Избранное" className="text-muted-foreground"><Heart size={24} strokeWidth={1.8} /></Link>
          <Link href="/messages" aria-label="Сообщения" className="text-muted-foreground"><MessageCircle size={24} strokeWidth={1.8} /></Link>
              {ready ? (
                user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className={`${topLinkClass} font-medium`}
                      aria-label="Меню профиля"
                    >
                      <Avatar size="sm" className="size-6">
                        <AvatarFallback className="bg-primary text-[11px] font-bold text-primary-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden lg:inline">{user.name ?? 'Профиль'}</span>
                      <ChevronDown size={13} strokeWidth={1.8} className="opacity-60" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={8} className="w-72 p-0">
                      <div className="bg-primary/10 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid size-10 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                            {initials}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-foreground">
                              {user.name ?? 'Пользователь'}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {user.email ?? user.phone}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="py-1.5">
                        {[
                          { href: '/listings', icon: Tag, label: 'Мои объявления' },
                          { href: '/profile/orders', icon: Package, label: 'Заказы' },
                          { href: '/profile/reviews', icon: Star, label: 'Мои отзывы' },
                          { href: '/favorites', icon: Heart, label: 'Избранное' },
                          { href: '/wallet', icon: Wallet, label: 'Кошелёк' },
                          { href: '/pricing', icon: Sparkles, label: 'Тарифы и Pro' },
                        ].map(({ href, icon: Icon, label }) => (
                          <DropdownMenuItem
                            key={href}
                            render={<Link href={href} />}
                            className="cursor-pointer gap-3 px-4 py-2 text-sm text-foreground"
                          >
                            <Icon size={18} strokeWidth={1.8} className="text-muted-foreground" />
                            {label}
                          </DropdownMenuItem>
                        ))}
                      </div>
                      <DropdownMenuSeparator className="my-0" />
                      <div className="py-1.5">
                        <div className="flex items-center justify-between px-4 py-2 text-sm"><span>Тема оформления</span><ThemeQuickToggle /></div>
                        <DropdownMenuItem onClick={() => setSupportOpen(true)} className="px-4 py-2 text-sm">Помощь</DropdownMenuItem>
                        <DropdownMenuItem
                          render={<Link href="/profile/settings" />}
                          className="cursor-pointer gap-3 px-4 py-2 text-sm text-foreground"
                        >
                          <Settings
                            size={18}
                            strokeWidth={1.8}
                            className="text-muted-foreground"
                          />
                          Настройки
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={handleLogout}
                          className="cursor-pointer gap-3 px-4 py-2 text-sm"
                        >
                          <LogOut size={18} strokeWidth={1.8} />
                          Выйти
                        </DropdownMenuItem>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link
                    href="/auth?mode=login"
                    className={`${topLinkClass} font-medium text-foreground`}
                  >
                    <Lock size={14} strokeWidth={1.8} />
                    Вход и регистрация
                  </Link>
                )
              ) : null}

        </div>

        {/* ── Mobile row ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-4 py-2 md:hidden" style={{ minHeight: 56 }}>
          <div className="shrink-0">
            <BarterHomeLogo />
          </div>
          <form
            action="/"
            method="GET"
            className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-muted px-4 py-2.5"
          >
            <Search size={16} strokeWidth={1.8} className="shrink-0 text-muted-foreground" />
            <input
              type="text"
              name="q"
              placeholder="Поиск по объявлениям"
              className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </form>
          <button
            type="button"
            onClick={() => setMegaOpen((v) => !v)}
            className="grid size-10 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Категории и фильтры"
          >
            <SlidersHorizontal size={20} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      <SupportSheet open={supportOpen} onClose={() => setSupportOpen(false)} />
      <MegaMenu open={megaOpen} onClose={closeMega} />
    </>
  );
}
