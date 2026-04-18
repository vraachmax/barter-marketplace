'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  Bell,
  Building2,
  Camera,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Globe,
  Lock,
  Mail,
  MessageSquare,
  Monitor,
  Moon,
  Palette,
  Phone,
  Search,
  Settings,
  Shield,
  Smartphone,
  Sparkles,
  Store,
  Sun,
  Trash2,
  User,
  Wifi,
} from 'lucide-react';

const stroke = 1.8;
import {
  apiFetchJson,
  apiGetJson,
  type AuthMe,
  type ChatSummary,
  type MyListing,
  type SellerProfileResponse,
} from '@/lib/api';
import { applyThemePreference } from '@/lib/theme';
import ProfileSidebar from '@/components/profile-sidebar';

type Section = 'account' | 'storefront' | 'appearance' | 'notifications' | 'privacy' | 'security';

const SECTIONS: Array<{
  id: Section;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  { id: 'account', label: 'Аккаунт', description: 'Контакты для входа', icon: User },
  {
    id: 'storefront',
    label: 'Витрина продавца',
    description: 'Имя, описание и компания для покупателей',
    icon: Store,
  },
  { id: 'appearance', label: 'Внешний вид', description: 'Тема интерфейса', icon: Palette },
  { id: 'notifications', label: 'Уведомления', description: 'Сообщения и рассылки', icon: Bell },
  { id: 'privacy', label: 'Приватность', description: 'Публичный профиль', icon: Shield },
  { id: 'security', label: 'Безопасность', description: 'Защита аккаунта', icon: Lock },
];

function isSection(s: string | null): s is Section {
  return (
    s === 'account' ||
    s === 'storefront' ||
    s === 'appearance' ||
    s === 'notifications' ||
    s === 'privacy' ||
    s === 'security'
  );
}

function SettingsToggleRow({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <div
      role="switch"
      tabIndex={0}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border bg-muted/50 px-4 py-3.5 outline-none transition hover:border-primary/40 hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/20500/40"
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
      </div>
      <div
        className={`pointer-events-none relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition ${
 checked ? 'bg-primary' : 'bg-muted-foreground/30'
 }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-card shadow-sm transition-transform ${
 checked ? 'translate-x-5' : 'translate-x-0'
 }`}
        />
      </div>
    </div>
  );
}

// Mobile-only toggle row - simpler single-line layout
function MobileSettingsToggle({
  checked,
  onChange,
  title,
  icon: Icon,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  icon: LucideIcon;
}) {
  return (
    <div
      role="switch"
      tabIndex={0}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      className="flex cursor-pointer items-center justify-between gap-3 py-3.5 px-4 outline-none transition hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary/20500/40"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Icon size={18} strokeWidth={stroke} className="shrink-0 text-muted-foreground" aria-hidden />
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>
      <div
        className={`pointer-events-none relative h-6 w-11 shrink-0 rounded-full transition ${
 checked ? 'bg-primary' : 'bg-muted-foreground/30'
 }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-card shadow-sm transition-transform ${
 checked ? 'translate-x-5' : 'translate-x-0'
 }`}
        />
      </div>
    </div>
  );
}

export function ProfileSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'need_auth' | 'ready' | 'error'>('loading');
  const [counts, setCounts] = useState({ active: 0, archived: 0, chats: 0 });
  const [me, setMe] = useState<AuthMe | null>(null);
  const [rating, setRating] = useState<{ avg: number | null; count: number }>({ avg: null, count: 0 });
  const [section, setSection] = useState<Section>('account');
  const [form, setForm] = useState({
    email: '',
    phone: '',
    name: '',
    avatarUrl: '',
    about: '',
    companyName: '',
    companyInfo: '',
    appTheme: 'SYSTEM' as 'SYSTEM' | 'LIGHT' | 'DARK',
    notificationsEnabled: true,
    marketingEnabled: false,
    showEmailPublic: false,
    showPhonePublic: false,
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function goToSection(s: Section) {
    setSection(s);
    router.push(`/profile/settings?section=${s}`, { scroll: false });
  }

  async function load() {
    setStatus('loading');
    const [res, myListings, chats] = await Promise.all([
      apiFetchJson<AuthMe>('/auth/me'),
      apiFetchJson<MyListing[]>('/listings/my'),
      apiFetchJson<ChatSummary[]>('/chats'),
    ]);
    if (!res.ok) {
      if (res.status === 401) {
        setStatus('need_auth');
        return;
      }
      setStatus('error');
      return;
    }
    setMe(res.data);
    const requestedSection = new URLSearchParams(window.location.search).get('section');
    if (isSection(requestedSection)) {
      setSection(requestedSection);
    }
    const profile = await apiGetJson<SellerProfileResponse>(`/users/${res.data.id}/profile`).catch(
      () => null as SellerProfileResponse | null,
    );
    if (profile?.rating) {
      setRating({
        avg: profile.rating.avg ?? null,
        count: profile.rating.count ?? 0,
      });
    }
    if (myListings.ok) {
      setCounts({
        active: myListings.data.filter((x) => x.status === 'ACTIVE').length,
        archived: myListings.data.filter((x) => x.status === 'ARCHIVED').length,
        chats: chats.ok ? chats.data.length : 0,
      });
    }
    setForm({
      email: res.data.email ?? '',
      phone: res.data.phone ?? '',
      name: res.data.name ?? '',
      avatarUrl: res.data.avatarUrl ?? '',
      about: res.data.about ?? '',
      companyName: res.data.companyName ?? '',
      companyInfo: res.data.companyInfo ?? '',
      appTheme: res.data.appTheme ?? 'SYSTEM',
      notificationsEnabled: res.data.notificationsEnabled ?? true,
      marketingEnabled: res.data.marketingEnabled ?? false,
      showEmailPublic: res.data.showEmailPublic ?? false,
      showPhonePublic: res.data.showPhonePublic ?? false,
    });
    setStatus('ready');
  }

  async function save() {
    setSaved(false);
    setError('');
    setBusy(true);
    const res = await apiFetchJson<AuthMe>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setMe(res.data);
    applyThemePreference(form.appTheme);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 4000);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const s = searchParams.get('section');
    if (isSection(s)) setSection(s);
  }, [searchParams]);

  const currentMeta = SECTIONS.find((x) => x.id === section);
  const SectionHeroIcon = currentMeta?.icon ?? Settings;

  return (
    <div className="min-h-screen bg-muted text-foreground antialiased">
      {/* Mobile Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-md md:hidden">
        <div className="flex h-14 items-center gap-3 px-4">
          <Link
            href="/profile"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground"
          >
            <ArrowLeft size={20} strokeWidth={stroke} aria-hidden />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="truncate text-sm font-bold">Настройки</div>
            <div className="text-xs text-muted-foreground">Аккаунт и приложение</div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
        {status === 'loading' ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <div
              className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent"
              role="status"
              aria-label="Загрузка"
            />
            <p className="text-sm text-muted-foreground">Загружаем настройки…</p>
          </div>
        ) : null}

        {status === 'need_auth' ? (
          <div className="mx-auto max-w-md py-10">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
              <div className="border-b border-border bg-primary px-6 py-10 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-card shadow-md ring-1 ring-primary/20">
                  <Settings size={28} strokeWidth={stroke} className="text-primary" aria-hidden />
                </div>
                <h1 className="mt-4 text-xl font-bold text-foreground">Настройки</h1>
                <p className="mt-2 text-sm text-muted-foreground">Войдите, чтобы изменить параметры аккаунта.</p>
              </div>
              <div className="p-6">
                <Link
                  href="/auth"
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white shadow-lg shadow-primary/20"
                >
                  Войти
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {status === 'error' ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
            Не удалось загрузить настройки. Обновите страницу.
          </div>
        ) : null}

        {status === 'ready' ? (
          <>
            {/* Mobile View: Avito-style settings matching profile card design */}
            <div className="md:hidden space-y-3 pb-24">
              {/* ACCOUNT Section */}
              <div className="space-y-2">
                <p className="px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Аккаунт
                </p>
                {me?.avatarUrl ? (
                  <div className="flex items-center gap-3 rounded-2xl bg-card p-4">
                    <img src={me.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-[#1a1a1a] truncate">
                        {form.name || me.name || me.email}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {form.email || me.email}
                      </div>
                      {form.phone ? (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {form.phone}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 transition hover:bg-muted/60"
                  onClick={() => {/* TODO: password change modal */}}
                >
                  <Lock size={24} strokeWidth={1.5} className="text-[#0088FF]" aria-hidden />
                  <span className="flex-1 text-left text-sm font-semibold text-[#1a1a1a]">Сменить пароль</span>
                  <ChevronRight size={20} strokeWidth={1.5} className="text-muted-foreground" aria-hidden />
                </button>
              </div>

              {/* NOTIFICATIONS Section */}
              <div className="space-y-2">
                <p className="px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Уведомления
                </p>
                <div className="rounded-2xl bg-card divide-y divide-border overflow-hidden">
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Bell size={24} strokeWidth={1.5} className="shrink-0 text-[#0088FF]" aria-hidden />
                      <span className="text-sm font-semibold text-[#1a1a1a]">Push-уведомления</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.notificationsEnabled}
                      onClick={() => setForm((p) => ({ ...p, notificationsEnabled: !p.notificationsEnabled }))}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition ${form.notificationsEnabled ? 'bg-[#0088FF]' : 'bg-muted-foreground/30'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-card shadow-sm transition-transform ${form.notificationsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Mail size={24} strokeWidth={1.5} className="shrink-0 text-[#0088FF]" aria-hidden />
                      <span className="text-sm font-semibold text-[#1a1a1a]">Email-рассылка</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.marketingEnabled}
                      onClick={() => setForm((p) => ({ ...p, marketingEnabled: !p.marketingEnabled }))}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition ${form.marketingEnabled ? 'bg-[#0088FF]' : 'bg-muted-foreground/30'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-card shadow-sm transition-transform ${form.marketingEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <MessageSquare size={24} strokeWidth={1.5} className="shrink-0 text-[#0088FF]" aria-hidden />
                      <span className="text-sm font-semibold text-[#1a1a1a]">SMS-уведомления</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.notificationsEnabled}
                      onClick={() => setForm((p) => ({ ...p, notificationsEnabled: !p.notificationsEnabled }))}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition ${form.notificationsEnabled ? 'bg-[#0088FF]' : 'bg-muted-foreground/30'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-card shadow-sm transition-transform ${form.notificationsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* PRIVACY Section */}
              <div className="space-y-2">
                <p className="px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Приватность
                </p>
                <div className="rounded-2xl bg-card divide-y divide-border overflow-hidden">
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Phone size={24} strokeWidth={1.5} className="shrink-0 text-[#0088FF]" aria-hidden />
                      <span className="text-sm font-semibold text-[#1a1a1a]">Показывать телефон</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.showPhonePublic}
                      onClick={() => setForm((p) => ({ ...p, showPhonePublic: !p.showPhonePublic }))}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition ${form.showPhonePublic ? 'bg-[#0088FF]' : 'bg-muted-foreground/30'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-card shadow-sm transition-transform ${form.showPhonePublic ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Eye size={24} strokeWidth={1.5} className="shrink-0 text-[#0088FF]" aria-hidden />
                      <span className="text-sm font-semibold text-[#1a1a1a]">Показывать email</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.showEmailPublic}
                      onClick={() => setForm((p) => ({ ...p, showEmailPublic: !p.showEmailPublic }))}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition ${form.showEmailPublic ? 'bg-[#0088FF]' : 'bg-muted-foreground/30'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-card shadow-sm transition-transform ${form.showEmailPublic ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* APP Section */}
              <div className="space-y-2">
                <p className="px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Приложение
                </p>
                <div className="rounded-2xl bg-card divide-y divide-border overflow-hidden">
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Moon size={24} strokeWidth={1.5} className="shrink-0 text-[#0088FF]" aria-hidden />
                      <span className="text-sm font-semibold text-[#1a1a1a]">Ночной режим</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.appTheme === 'DARK'}
                      onClick={() => setForm((p) => ({ ...p, appTheme: p.appTheme === 'DARK' ? 'LIGHT' : 'DARK' }))}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition ${form.appTheme === 'DARK' ? 'bg-[#0088FF]' : 'bg-muted-foreground/30'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-card shadow-sm transition-transform ${form.appTheme === 'DARK' ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Globe size={24} strokeWidth={1.5} className="shrink-0 text-[#0088FF]" aria-hidden />
                      <span className="text-sm font-semibold text-[#1a1a1a]">Язык</span>
                    </div>
                    <div className="flex gap-1.5">
                      {(['RU', 'EN'] as const).map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
 lang === 'RU'
 ? 'bg-[#0088FF] text-white'
 : 'bg-muted text-muted-foreground'
 }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* DANGER ZONE Section */}
              <div className="space-y-2">
                <p className="px-1 text-xs font-bold uppercase tracking-wide text-destructive">
                  Опасная зона
                </p>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 transition hover:bg-destructive/10"
                >
                  <Trash2 size={24} strokeWidth={1.5} className="text-destructive" aria-hidden />
                  <span className="flex-1 text-left text-sm font-semibold text-destructive">Удалить аккаунт</span>
                  <ChevronRight size={20} strokeWidth={1.5} className="text-destructive" aria-hidden />
                </button>
                <p className="px-1 text-xs text-muted-foreground">
                  Удаление аккаунта необратимо. Все объявления и сообщения будут потеряны.
                </p>
              </div>

              {/* Status Messages */}
              {error ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              ) : null}
              {saved ? (
                <div className="flex items-center gap-2 rounded-2xl border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm font-medium text-secondary">
                  <CheckCircle size={18} strokeWidth={stroke} aria-hidden />
                  Настройки сохранены
                </div>
              ) : null}

              {/* Save Button - fixed at bottom like Avito */}
              <div className="fixed bottom-16 left-0 right-0 z-30 px-4 pb-3 pt-2 bg-primary">
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={busy}
                  className="w-full inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-bold text-white shadow-lg shadow-primary/25 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? (
                    <>
                      <span
                        className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
                        aria-hidden
                      />
                      Сохранение…
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} strokeWidth={stroke} aria-hidden />
                      Сохранить
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Desktop View: Tabbed layout with sidebar (original) */}
            <div className="hidden md:grid gap-6 lg:grid-cols-[280px_1fr] lg:items-start">
              <ProfileSidebar
                active="settings"
                activeCount={counts.active}
                archivedCount={counts.archived}
                profileName={me?.name ?? me?.email ?? 'Профиль'}
                profileAvatarUrl={me?.avatarUrl ?? null}
                ratingAvg={rating.avg}
                ratingCount={rating.count}
                sellerUserId={me?.id ?? null}
              />

              <div className="min-w-0 space-y-6">
                {/* Desktop header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
                      <Settings size={14} strokeWidth={stroke} aria-hidden />
                      Центр настроек
                    </div>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
                      Настройки приложения
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Разделы слева, формы справа. Изменения применяются по кнопке «Сохранить».
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link
                      href="/profile"
                      className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm hover:bg-muted/50"
                    >
                      Кабинет
                      <ChevronRight size={16} strokeWidth={stroke} className="opacity-60" aria-hidden />
                    </Link>
                    <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-primary">
                      На главную
                    </Link>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:shadow-md">
                  <div className="border-b border-border bg-primary px-4 py-4 md:px-6 md:py-5">
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-card shadow-sm ring-1 ring-primary/20">
                        <SectionHeroIcon size={22} strokeWidth={stroke} aria-hidden />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-foreground">{currentMeta?.label ?? 'Настройки'}</h2>
                        <p className="text-sm text-muted-foreground">{currentMeta?.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row lg:min-h-[420px]">
                    {/* Section nav — vertical sidebar */}
                    <nav className="border-b border-border lg:w-56 lg:shrink-0 lg:border-b-0 lg:border-r lg:bg-muted/50 lg:p-3">
                      <p className="hidden px-2 pb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground lg:block">
                        Разделы
                      </p>
                      <div className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:gap-0.5 lg:p-0 lg:overflow-visible">
                        {SECTIONS.map((sec) => {
                          const active = section === sec.id;
                          const NavIcon = sec.icon;
                          return (
                            <button
                              key={sec.id}
                              type="button"
                              onClick={() => goToSection(sec.id)}
                              className={`flex min-w-[120px] items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition lg:min-w-0 ${
 active
 ? 'bg-card font-semibold text-primary shadow-sm ring-1 ring-primary/20 lg:ring-primary/20'
 : 'text-muted-foreground hover:bg-card/80 hover:text-foreground'
 }`}
                            >
                              <span
                                className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
 active
 ? 'bg-primary text-primary'
 : 'bg-muted text-muted-foreground'
 }`}
                              >
                                <NavIcon size={16} strokeWidth={stroke} aria-hidden />
                              </span>
                              <span className="truncate">{sec.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </nav>

                    {/* Content */}
                    <div className="flex-1 p-4 md:p-6">
                      <div className={`mx-auto space-y-6 ${section === 'storefront' ? 'max-w-2xl' : 'max-w-xl'}`}>
                        {section === 'account' ? (
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                              Эти данные используются для входа и связи с вами. Публичная видимость настраивается в разделе
                              «Приватность».
                            </p>
                            <label className="block">
                              <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                                <Mail size={16} strokeWidth={stroke} aria-hidden />
                                Email
                              </span>
                              <input
                                value={form.email}
                                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                                className="h-12 w-full rounded-xl border border-border bg-muted/50 px-4 text-sm outline-none transition focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/20500/15"
                                placeholder="user@example.com"
                                autoComplete="email"
                              />
                            </label>
                            <label className="block">
                              <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                                <Phone size={16} strokeWidth={stroke} aria-hidden />
                                Телефон
                              </span>
                              <input
                                value={form.phone}
                                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                                className="h-12 w-full rounded-xl border border-border bg-muted/50 px-4 text-sm outline-none transition focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/20500/15"
                                placeholder="+7 999 123-45-67"
                                autoComplete="tel"
                              />
                            </label>
                          </div>
                        ) : null}

                        {section === 'storefront' ? (
                          <div className="space-y-6">
                            <div className="rounded-2xl border border-primary/30 bg-primary px-4 py-3 text-sm text-primary">
                              <p className="font-semibold">Витрина продавца</p>
                              <p className="mt-1 text-xs leading-relaxed text-primary/90">
                                Заполните <strong>отображаемое имя</strong>,{' '}
                                <strong>«О продавце»</strong> (опыт, условия, сроки ответа) и при необходимости блок{' '}
                                <strong>компании</strong> — юр. название и описание. Так покупателям будет проще доверять и связываться с вами.
                              </p>
                              {me?.id ? (
                                <Link
                                  href={`/seller/${me.id}`}
                                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary underline hover:text-primary"
                                >
                                  Посмотреть публичную страницу
                                  <ChevronRight size={14} strokeWidth={stroke} aria-hidden />
                                </Link>
                              ) : null}
                            </div>

                            <label className="block">
                              <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                                <User size={16} strokeWidth={stroke} aria-hidden />
                                Имя на витрине
                              </span>
                              <input
                                value={form.name}
                                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                                className="h-12 w-full rounded-xl border border-border bg-muted/50 px-4 text-sm outline-none transition focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/20500/15"
                                placeholder="Как вас увидят покупатели: Иван или «Магазин электроники»"
                                autoComplete="name"
                              />
                              <p className="mt-1 text-xs text-muted-foreground">
                                Минимум 2 символа, если указываете имя. Пустое поле — без отображаемого имени на витрине.
                              </p>
                            </label>

                            <label className="block">
                              <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                                <Camera size={16} strokeWidth={stroke} aria-hidden />
                                Фото или логотип (URL)
                              </span>
                              <input
                                value={form.avatarUrl}
                                onChange={(e) => setForm((p) => ({ ...p, avatarUrl: e.target.value }))}
                                className="h-12 w-full rounded-xl border border-border bg-muted/50 px-4 text-sm outline-none transition focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/20500/15"
                                placeholder="https://… — прямая ссылка на изображение"
                                autoComplete="off"
                              />
                              <p className="mt-1 text-xs text-muted-foreground">
                                Аватар на странице продавца; позже можно будет загружать файл напрямую.
                              </p>
                            </label>

                            <label className="block">
                              <span className="mb-1.5 flex items-center justify-between gap-2 text-sm font-medium text-foreground">
                                <span className="inline-flex items-center gap-2">
                                  <Store size={16} strokeWidth={stroke} aria-hidden />
                                  О продавце
                                </span>
                                <span className="text-xs font-normal text-muted-foreground">
                                  {form.about.length} / 8000
                                </span>
                              </span>
                              <textarea
                                value={form.about}
                                onChange={(e) => setForm((p) => ({ ...p, about: e.target.value }))}
                                rows={6}
                                className="min-h-[140px] w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm leading-relaxed outline-none transition focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/20500/15"
                                placeholder="Расскажите о себе: чем торгуете, как долго на площадке, как быстро отвечаете в чате, условия возврата или самовывоза."
                              />
                            </label>

                            <div className="relative">
                              <div className="absolute inset-x-0 top-1/2 h-px bg-muted" aria-hidden />
                              <p className="relative mx-auto w-fit bg-card px-3 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                                Компания (необязательно)
                              </p>
                            </div>

                            <div className="rounded-2xl border border-border bg-muted/50 p-4">
                              <div className="mb-3 flex items-start gap-2 text-xs text-muted-foreground">
                                <Building2 size={16} strokeWidth={stroke} className="mt-0.5 shrink-0" aria-hidden />
                                <span>
                                  Если продаёте как <strong className="text-foreground">юрлицо или ИП</strong>
                                  , укажите название и реквизиты — покупатели увидят их на вашей публичной странице.
                                </span>
                              </div>
                              <label className="block">
                                <span className="mb-1.5 text-sm font-medium text-foreground">
                                  Название компании или бренда
                                </span>
                                <input
                                  value={form.companyName}
                                  onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
                                  className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none transition focus:border-accent/30 focus:ring-2 focus:ring-accent/20"
                                  placeholder="ООО «Ромашка», ИП Иванов…"
                                />
                              </label>
                              <label className="mt-4 block">
                                <span className="mb-1.5 flex items-center justify-between gap-2 text-sm font-medium text-foreground">
                                  <span>О компании</span>
                                  <span className="text-xs font-normal text-muted-foreground">
                                    {form.companyInfo.length} / 8000
                                  </span>
                                </span>
                                <textarea
                                  value={form.companyInfo}
                                  onChange={(e) => setForm((p) => ({ ...p, companyInfo: e.target.value }))}
                                  rows={5}
                                  className="min-h-[120px] w-full rounded-xl border border-border bg-card px-4 py-3 text-sm leading-relaxed outline-none transition focus:border-accent/30 focus:ring-2 focus:ring-accent/20"
                                  placeholder="Вид деятельности, юридический адрес, ИНН/ОГРН (если хотите указать публично), режим работы, сайт компании…"
                                />
                              </label>
                            </div>
                          </div>
                        ) : null}

                        {section === 'appearance' ? (
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                              Тема сохраняется в аккаунте и применяется на всех устройствах после входа.
                            </p>
                            <div className="grid gap-3 sm:grid-cols-3">
                              {(
                                [
                                  {
                                    id: 'SYSTEM' as const,
                                    label: 'Системная',
                                    hint: 'Как в ОС',
                                    themeIcon: Monitor,
                                  },
                                  { id: 'LIGHT' as const, label: 'Светлая', hint: 'Днём', themeIcon: Sun },
                                  { id: 'DARK' as const, label: 'Тёмная', hint: 'Вечером', themeIcon: Moon },
                                ] as const
                              ).map(({ id, label, hint, themeIcon }) => {
                                const ThemeIcon = themeIcon;
                                const active = form.appTheme === id;
                                return (
                                  <button
                                    key={id}
                                    type="button"
                                    onClick={() => setForm((p) => ({ ...p, appTheme: id }))}
                                    className={`flex flex-col items-center rounded-2xl border-2 px-4 py-5 text-center transition ${
 active
 ? 'border-primary bg-primary/10 shadow-md shadow-primary/10'
 : 'border-border bg-muted/50 hover:border-primary/40 hover:bg-primary/10'
 }`}
                                  >
                                    <span
                                      className={`mb-3 grid h-12 w-12 place-items-center rounded-xl ${
 active
 ? 'bg-primary text-white'
 : 'bg-card text-muted-foreground ring-1 ring-border'
 }`}
                                    >
                                      <ThemeIcon size={24} strokeWidth={stroke} aria-hidden />
                                    </span>
                                    <span className="text-sm font-bold text-foreground">{label}</span>
                                    <span className="mt-1 text-xs text-muted-foreground">{hint}</span>
                                    {active ? (
                                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                                        <CheckCircle size={14} strokeWidth={stroke} aria-hidden />
                                        Выбрано
                                      </span>
                                    ) : null}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}

                        {section === 'notifications' ? (
                          <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                              Управляйте тем, как Бартер напоминает о сообщениях и активности.
                            </p>
                            <SettingsToggleRow
                              checked={form.notificationsEnabled}
                              onChange={(v) => setForm((p) => ({ ...p, notificationsEnabled: v }))}
                              title="Служебные уведомления"
                              description="Сообщения в чате, статусы объявлений и важные действия по аккаунту"
                            />
                            <SettingsToggleRow
                              checked={form.marketingEnabled}
                              onChange={(v) => setForm((p) => ({ ...p, marketingEnabled: v }))}
                              title="Рекомендации и акции"
                              description="Подборки объявлений, советы продавцу и специальные предложения сервиса"
                            />
                          </div>
                        ) : null}

                        {section === 'privacy' ? (
                          <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                              Решите, что видят покупатели на вашей{' '}
                              {me?.id ? (
                                <Link href={`/seller/${me.id}`} className="font-semibold text-primary hover:underline">
                                  публичной странице продавца
                                </Link>
                              ) : (
                                'публичной странице продавца'
                              )}
                              .
                            </p>
                            <SettingsToggleRow
                              checked={form.showEmailPublic}
                              onChange={(v) => setForm((p) => ({ ...p, showEmailPublic: v }))}
                              title="Показывать email"
                              description="Адрес будет доступен на витрине продавца"
                            />
                            <SettingsToggleRow
                              checked={form.showPhonePublic}
                              onChange={(v) => setForm((p) => ({ ...p, showPhonePublic: v }))}
                              title="Показывать телефон"
                              description="Номер будет доступен на витрине продавца"
                            />
                          </div>
                        ) : null}

                        {section === 'security' ? (
                          <div className="space-y-4">
                            <div className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-4">
                              <div className="flex items-start gap-3">
                                <Sparkles size={20} strokeWidth={stroke} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                                <div>
                                  <p className="text-sm font-semibold text-accent">Скоро здесь будет больше</p>
                                  <p className="mt-1 text-sm text-accent">
                                    Планируем смену пароля, список активных сессий и выход со всех устройств.
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                              Сейчас вход защищён cookie-сессией: без авторизации изменить чужой аккаунт нельзя.
                            </div>
                          </div>
                        ) : null}

                        {error ? (
                          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            {error}
                          </div>
                        ) : null}
                        {saved ? (
                          <div className="flex items-center gap-2 rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm font-medium text-secondary">
                            <CheckCircle size={18} strokeWidth={stroke} aria-hidden />
                            Настройки сохранены
                          </div>
                        ) : null}

                        <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
                          <button
                            type="button"
                            onClick={() => void save()}
                            disabled={busy}
                            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-white shadow-lg shadow-primary/25 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-xs"
                          >
                            {busy ? (
                              <>
                                <span
                                  className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
                                  aria-hidden
                                />
                                Сохранение…
                              </>
                            ) : (
                              <>
                                <CheckCircle size={18} strokeWidth={stroke} aria-hidden />
                                Сохранить
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </>
          ) : null}
        </div>
      </div>
  );
}
