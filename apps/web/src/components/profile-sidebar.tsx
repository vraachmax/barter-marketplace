'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { ReactNode } from 'react';
import { resolveAssetUrl } from '@/lib/api';
import {
  Archive,
  Bell,
  ChevronRight,
  Heart,
  Link2,
  LogOut,
  MessageCircle,
  Package,
  Plus,
  Settings,
  Star,
  Tag,
  User,
} from 'lucide-react';

type Props = {
  active: 'profile' | 'settings' | 'reviews' | 'orders';
  activeCount?: number;
  archivedCount?: number;
  profileName?: string | null;
  profileAvatarUrl?: string | null;
  ratingAvg?: number | null;
  ratingCount?: number;
  sellerUserId?: string | null;
  onLogout?: () => void;
};

const navStroke = 1.8;

  function NavItem({
    href,
    icon,
    label,
    right,
    isActive = false,
  }: {
    href: string;
    icon: ReactNode;
    label: string;
    right?: ReactNode;
    isActive?: boolean;
  }) {
    return (
      <Link
        href={href}
        aria-current={isActive ? 'page' : undefined}
        className={`group min-h-11 focus-visible:ring-2 focus-visible:ring-ring flex w-full items-center justify-between gap-2 min-h-11 rounded-2xl px-3 py-2.5 text-sm transition ${
 isActive
 ? '[background-color:var(--mode-accent-soft)] font-medium [color:var(--mode-accent)]'
 : 'text-foreground hover:bg-muted'
 }`}
      >
        <span className="inline-flex min-w-0 items-center gap-2.5">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
 isActive ? '[color:var(--mode-accent)]' : 'text-muted-foreground'
 }`}
          >
            {icon}
          </span>
          <span className="truncate">{label}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {right != null && right !== '' ? (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
 isActive
 ? '[background-color:var(--mode-accent-soft)] [color:var(--mode-accent)]'
 : 'bg-muted text-muted-foreground'
 }`}
            >
              {right}
            </span>
          ) : null}
          <ChevronRight
            size={18}
            strokeWidth={navStroke}
            className={isActive ? '[color:var(--mode-accent)]' : 'text-muted-foreground opacity-0 group-hover:opacity-100'}
            aria-hidden
          />
        </span>
      </Link>
    );
  }

  function NavHeading({ children }: { children: ReactNode }) {
    return (
      <div className="mb-2 mt-4 px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground first:mt-0">
        {children}
      </div>
    );
  }

export default function ProfileSidebar({
  active,
  activeCount = 0,
  archivedCount = 0,
  profileName,
  profileAvatarUrl,
  ratingAvg = null,
  ratingCount = 0,
  sellerUserId,
  onLogout,
}: Props) {
  const resolvedAvatarUrl = resolveAssetUrl(profileAvatarUrl);

  const iconMuted = 'text-current';

  return (
    <aside className="h-fit lg:sticky lg:top-6">
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="relative px-4 pb-4 pt-5">
          <div className="flex items-start gap-3">
            {resolvedAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolvedAvatarUrl}
                alt=""
                className="h-14 w-14 shrink-0 rounded-2xl object-cover"
              />
            ) : (
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                <User size={28} strokeWidth={navStroke} aria-hidden />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-foreground">{profileName ?? 'Профиль'}</div>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Star size={14} strokeWidth={navStroke} className="shrink-0 text-[#FFD166]" fill="currentColor" aria-hidden />
                <span className="font-semibold">{ratingAvg ? ratingAvg.toFixed(1) : '—'}</span>
                <span>
                  {ratingCount > 0 ? `· ${ratingCount} отзывов` : '· нет отзывов'}
                </span>
              </div>
              <Link
                href="/profile/settings?section=storefront"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold [color:var(--mode-accent)] hover:underline"
              >
                Редактировать профиль
                <ChevronRight size={14} strokeWidth={navStroke} aria-hidden />
              </Link>
            </div>
          </div>
          {sellerUserId ? (
            <Link
              href={`/seller/${sellerUserId}`}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border-[1.5px] [border-color:var(--mode-accent-ring)] bg-transparent py-2 text-xs font-semibold [color:var(--mode-accent)] transition hover:[background-color:var(--mode-accent-soft)]"
            >
              <Link2 size={16} strokeWidth={navStroke} aria-hidden />
              Как вас видят покупатели
            </Link>
          ) : null}
        </div>

        <nav className="p-3">
          <NavHeading>Продажи</NavHeading>
          <div className="space-y-0.5">
            <NavItem
              href="/listings"
              icon={<Tag size={20} strokeWidth={navStroke} className={iconMuted} />}
              label="Объявления"
              right={activeCount}
              isActive={active === 'profile'}
            />
            <NavItem
              href="/listings?tab=ARCHIVED"
              icon={<Archive size={20} strokeWidth={navStroke} className={iconMuted} />}
              label="Архив"
              right={archivedCount > 0 ? archivedCount : undefined}
            />
            <NavItem
              href="/messages"
              icon={<MessageCircle size={20} strokeWidth={navStroke} className={iconMuted} />}
              label="Сообщения"
            />
            <NavItem
              href="/favorites"
              icon={<Heart size={20} strokeWidth={navStroke} className={iconMuted} />}
              label="Избранное"
            />
          </div>

          <NavHeading>Аккаунт</NavHeading>
          <div className="space-y-0.5">
            <NavItem
              href="/profile/orders"
              icon={<Package size={20} strokeWidth={navStroke} className={iconMuted} />}
              label="Заказы"
              isActive={active === 'orders'}
            />
            <NavItem
              href="/profile/reviews"
              icon={<Star size={20} strokeWidth={navStroke} className={iconMuted} fill="currentColor" />}
              label="Отзывы"
              isActive={active === 'reviews'}
            />
            <NavItem
              href="/profile/settings"
              icon={<Settings size={20} strokeWidth={navStroke} className={iconMuted} />}
              label="Настройки"
              isActive={active === 'settings'}
            />
            <NavItem
              href="/profile/settings?section=notifications"
              icon={<Bell size={20} strokeWidth={navStroke} className={iconMuted} />}
              label="Уведомления"
            />
          </div>

          <NavHeading>Быстро</NavHeading>
          <div className="space-y-0.5">
            <Link
              href="/new"
              className="flex w-full items-center gap-2.5 rounded-lg [background-color:var(--mode-accent-soft)] px-3 py-2.5 text-sm font-semibold [color:var(--mode-accent)] transition hover:bg-muted"
            >
              <span className="grid h-8 w-8 place-items-center rounded-md [background-color:var(--mode-accent)]">
                <Plus size={20} strokeWidth={navStroke} className="text-white" aria-hidden />
              </span>
              Новое объявление
            </Link>
          </div>
        </nav>

        <div className="p-3">
          {onLogout ? (
            <Button variant="ghost"
              type="button"
              onClick={onLogout}
              className="flex w-full items-center justify-center gap-2 min-h-11 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut size={20} strokeWidth={navStroke} aria-hidden />
              Выйти из аккаунта
            </Button>
          ) : (
            <Link
              href="/auth"
              className="flex w-full items-center justify-center gap-2 min-h-11 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              <LogOut size={20} strokeWidth={navStroke} aria-hidden />
              Выйти
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
