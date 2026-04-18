'use client';

import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { BarterHomeLogo } from '@/components/barter-home-logo';
import { useRouter } from 'next/navigation';
import { useCallback, useState, type ReactNode } from 'react';
import {
  ChevronDown,
  Heart,
  LayoutGrid,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  Plus,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  Tag,
  Wallet,
  Search,
  Lock,
} from 'lucide-react';
import { MegaMenu } from '@/components/mega-menu';
import { ThemeQuickToggle } from '@/components/theme-quick-toggle';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

/**
 * Site header — Avito-matched layout (pixel-for-pixel 2026).
 * Reference: docs/design-system/project/ui_kits/web/Header.jsx
 *
 * Structure:
 *   ── Top utility row (desktop)
 *      • left: Для бизнеса, Карьера в Бартере, Помощь, Каталоги, #яПомогаю
 *      • right: heart, cart, msg, theme, login / profile dropdown, "+ Разместить"
 *   ── Main row (desktop)
 *      • Logo  ·  [Все категории] (cyan pill)  ·  Search input + [Найти]  ·  Region pin
 *   ── Mobile row: logo + pill search + filters icon
 *
 * Brand colors come from `--brand-primary` (#00AAFF) via the @theme layer
 * (`bg-primary`, `text-primary`, etc.) — no hardcoded hex.
 */
export function SiteHeader({ children }: { children?: ReactNode }) {
  const { ready, user, logout } = useAuth();
  const router = useRouter();
  const [megaOpen, setMegaOpen] = useState(false);

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
      <header className="sticky top-0 z-[100] bg-background border-b border-border">
        {/* ── Top utility bar — desktop only ─────────────────────────────── */}
        <div className="hidden border-b border-border/60 md:block">
          <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-6">
            <nav className="flex items-center gap-5">
              <button type="button" className={topLinkClass}>
                Для бизнеса <ChevronDown size={13} strokeWidth={1.8} className="opacity-60" />
              </button>
              <span className={topLinkClass}>Карьера в Бартере</span>
              <span className={topLinkClass}>Помощь</span>
              <button type="button" className={topLinkClass}>
                Каталоги <ChevronDown size={13} strokeWidth={1.8} className="opacity-60" />
              </button>
              <span className={topLinkClass}>#яПомогаю</span>
            </nav>

            <div className="flex items-center gap-5">
              <ThemeQuickToggle />
              <Link href="/favorites" className={topLinkClass} aria-label="Избранное">
                <Heart size={16} strokeWidth={1.8} />
              </Link>
              <Link href="/cart" className={topLinkClass} aria-label="Корзина">
                <ShoppingCart size={16} strokeWidth={1.8} />
              </Link>
              {ready && user ? (
                <Link href="/messages" className={topLinkClass} aria-label="Сообщения">
                  <MessageCircle size={16} strokeWidth={1.8} />
                </Link>
              ) : null}

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

              <Button
                render={<Link href="/new" />}
                size="sm"
                className="h-7 gap-1 px-3 text-xs font-semibold"
              >
                <Plus size={14} strokeWidth={2} />
                Разместить объявление
              </Button>
            </div>
          </div>
        </div>

        {/* ── Main row — desktop ─────────────────────────────────────────── */}
        <div className="mx-auto hidden max-w-7xl items-center gap-3 px-6 py-3 md:flex">
          <div className="shrink-0">
            <BarterHomeLogo />
          </div>

          {/* Все категории — cyan pill (Avito-style) */}
          <Button
            type="button"
            onClick={() => setMegaOpen((v) => !v)}
            aria-expanded={megaOpen}
            className="h-11 shrink-0 gap-2 rounded-full bg-primary px-5 text-[15px] font-medium text-primary-foreground shadow-none hover:bg-primary/90"
          >
            <LayoutGrid size={14} strokeWidth={1.8} aria-hidden />
            Все категории
          </Button>

          {/* Search — outer 2px primary frame; the inner input + Найти button live in `children` (page.tsx) */}
          {children}

          {/* Region selector — Avito pin + city */}
          <Button
            type="button"
            variant="ghost"
            className="h-11 shrink-0 gap-1.5 px-3 text-[15px] font-normal text-foreground hover:bg-muted"
          >
            <MapPin size={16} strokeWidth={1.8} aria-hidden />
            <span className="hidden whitespace-nowrap lg:inline">Москва</span>
            <span className="whitespace-nowrap lg:hidden">Регион</span>
          </Button>
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

      <MegaMenu open={megaOpen} onClose={closeMega} />
    </>
  );
}
