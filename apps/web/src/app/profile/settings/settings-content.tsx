'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  Building2,
  Camera,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Lock,
  Mail,
  Monitor,
  Moon,
  Palette,
  Phone,
  Settings,
  Shield,
  Sparkles,
  Store,
  Sun,
  User,
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
      className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-zinc-100 bg-zinc-50/50 px-4 py-3.5 outline-none transition hover:border-sky-200 hover:bg-sky-50/30 focus-visible:ring-2 focus-visible:ring-sky-500/40 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-sky-800 dark:hover:bg-sky-950/40"
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</div>
        <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{description}</div>
      </div>
      <div
        className={`pointer-events-none relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition ${
          checked ? 'bg-sky-600 dark:bg-sky-500' : 'bg-zinc-300 dark:bg-zinc-600'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
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
    <div className="min-h-screen bg-zinc-100 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 md:hidden">
        <div className="flex h-14 items-center gap-3 px-4">
          <Link
            href="/profile"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <ChevronLeft size={20} strokeWidth={stroke} aria-hidden />
          </Link>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold dark:text-zinc-100">Настройки</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Аккаунт и приложение</div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
        {status === 'loading' ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <div
              className="h-10 w-10 animate-spin rounded-full border-2 border-sky-600 border-t-transparent dark:border-sky-400"
              role="status"
              aria-label="Загрузка"
            />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Загружаем настройки…</p>
          </div>
        ) : null}

        {status === 'need_auth' ? (
          <div className="mx-auto max-w-md py-10">
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-black/40">
              <div className="border-b border-zinc-100 bg-gradient-to-r from-sky-50 to-cyan-50 px-6 py-10 text-center dark:border-zinc-800 dark:from-sky-950/50 dark:to-cyan-950/40">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white shadow-md ring-1 ring-sky-100 dark:bg-zinc-900 dark:ring-sky-900/50">
                  <Settings size={28} strokeWidth={stroke} className="text-sky-600 dark:text-sky-400" aria-hidden />
                </div>
                <h1 className="mt-4 text-xl font-bold text-zinc-900 dark:text-zinc-100">Настройки</h1>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Войдите, чтобы изменить параметры аккаунта.</p>
              </div>
              <div className="p-6">
                <Link
                  href="/auth"
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 text-sm font-semibold text-white shadow-lg shadow-sky-600/20"
                >
                  Войти
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {status === 'error' ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            Не удалось загрузить настройки. Обновите страницу.
          </div>
        ) : null}

        {status === 'ready' ? (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:items-start">
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
              <div className="hidden items-start justify-between gap-4 md:flex">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-sky-600 dark:text-sky-400">
                    <Settings size={14} strokeWidth={stroke} aria-hidden />
                    Центр настроек
                  </div>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 lg:text-3xl">
                    Настройки приложения
                  </h1>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Разделы слева, формы справа. Изменения применяются по кнопке «Сохранить».
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    href="/profile"
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Кабинет
                    <ChevronRight size={16} strokeWidth={stroke} className="opacity-60" aria-hidden />
                  </Link>
                  <Link href="/" className="text-sm font-medium text-zinc-500 hover:text-sky-700 dark:text-zinc-400 dark:hover:text-sky-400">
                    На главную
                  </Link>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-black/30 lg:shadow-md">
                <div className="border-b border-zinc-100 bg-gradient-to-r from-slate-50 via-sky-50/40 to-cyan-50/30 px-4 py-4 dark:border-zinc-800 dark:from-zinc-900 dark:via-sky-950/30 dark:to-cyan-950/20 md:px-6 md:py-5">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white shadow-sm ring-1 ring-sky-100 dark:bg-zinc-900 dark:ring-sky-900/50">
                      <SectionHeroIcon size={22} strokeWidth={stroke} aria-hidden />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{currentMeta?.label ?? 'Настройки'}</h2>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">{currentMeta?.description}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row lg:min-h-[420px]">
                  {/* Section nav — vertical sidebar */}
                  <nav className="border-b border-zinc-100 lg:w-56 lg:shrink-0 lg:border-b-0 lg:border-r lg:bg-zinc-50/50 lg:p-3 dark:border-zinc-800 dark:lg:bg-zinc-950/50">
                    <p className="hidden px-2 pb-2 text-[11px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 lg:block">
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
                                ? 'bg-white font-semibold text-sky-900 shadow-sm ring-1 ring-sky-200/80 dark:bg-zinc-900 dark:text-sky-100 dark:ring-sky-800/60 lg:ring-sky-100'
                                : 'text-zinc-600 hover:bg-white/80 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/60 dark:hover:text-zinc-100'
                            }`}
                          >
                            <span
                              className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                                active
                                  ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                                  : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
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
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Эти данные используются для мхода и связи с вами. Публичная видимость настраивается в разделе
                            «Приватность».
                          </p>
                          <label className="block">
                            <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                              <Mail size={16} strokeWidth={stroke} aria-hidden />
                              Email
                            </span>
                            <input
                              value={form.email}
                              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                              className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-sky-500 dark:focus:bg-zinc-900"
                              placeholder="user@example.com"
                              autoComplete="email"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                              <Phone size={16} strokeWidth={stroke} aria-hidden />
                              Телефон
                            </span>
                            <input
                              value={form.phone}
                              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                              className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-sky-500 dark:focus:bg-zinc-900"
                              placeholder="+7 999 123-45-67"
                              autoComplete="tel"
                            />
                          </label>
                        </div>
                      ) : null}

                      {section === 'storefront' ? (
                        <div className="space-y-6">
                          <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/90 to-cyan-50/40 px-4 py-3 text-sm text-sky-950 dark:border-sky-900/40 dark:from-sky-950/35 dark:to-cyan-950/25 dark:text-sky-100">
                            <p className="font-semibold">Витрина продавца</p>
                            <p className="mt-1 text-xs leading-relaxed text-sky-900/90 dark:text-sky-200/90">
                              Заполните <strong>отображаемое имя</strong>,{' '}
                              <strong>«О продавце»</strong> (опыт, условия, сроки ответа) и при необходимости блок{' '}
                              <strong>компании</strong> — юр. название и описание. Так покупателям будет проще доверять и связываться с вами.
                            </p>
                            {me?.id ? (
                              <Link
                                href={`/seller/${me.id}`}
                                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-sky-800 underline hover:text-sky-950 dark:text-sky-300 dark:hover:text-sky-100"
                              >
                                Посмотреть публичную страницу
                                <ChevronRight size={14} strokeWidth={stroke} aria-hidden />
                              </Link>
                            ) : null}
                          </div>

                          <label className="block">
                            <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                              <User size={16} strokeWidth={stroke} aria-hidden />
                              Имя на витрине
                            </span>
                            <input
                              value={form.name}
                              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                              className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-sky-500 dark:focus:bg-zinc-900"
                              placeholder="Как вас увидят покупатели: Иван или «Магазин электроники»"
                              autoComplete="name"
                            />
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                              Минимум 2 символа, если указываете имя. Пустое поле — без отображаемого имени на витрине.
                            </p>
                          </label>

                          <label className="block">
                            <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                              <Camera size={16} strokeWidth={stroke} aria-hidden />
                              Фото или логотип (URL)
                            </span>
                            <input
                              value={form.avatarUrl}
                              onChange={(e) => setForm((p) => ({ ...p, avatarUrl: e.target.value }))}
                              className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-sky-500 dark:focus:bg-zinc-900"
                              placeholder="https://… — прямая ссылка на изображение"
                              autoComplete="off"
                            />
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                              Аватар на странице продавца; позже можно будет загружать файл напрямую.
                            </p>
                          </label>

                          <label className="block">
                            <span className="mb-1.5 flex items-center justify-between gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                              <span className="inline-flex items-center gap-2">
                                <Store size={16} strokeWidth={stroke} aria-hidden />
                                О продавце
                              </span>
                              <span className="text-xs font-normal text-zinc-400 dark:text-zinc-500">
                                {form.about.length} / 8000
                              </span>
                            </span>
                            <textarea
                              value={form.about}
                              onChange={(e) => setForm((p) => ({ ...p, about: e.target.value }))}
                              rows={6}
                              className="min-h-[140px] w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm leading-relaxed outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-sky-500 dark:focus:bg-zinc-900"
                              placeholder="Расскажите о себе: чем торгуете, как долго на площадке, как быстро отвечаете в чате, условия возврата или самовывоза."
                            />
                          </label>

                          <div className="relative">
                            <div className="absolute inset-x-0 top-1/2 h-px bg-zinc-200 dark:bg-zinc-700" aria-hidden />
                            <p className="relative mx-auto w-fit bg-white px-3 text-center text-[11px] font-bold uppercase tracking-wide text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500">
                              Компания (необязательно)
                            </p>
                          </div>

                          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                            <div className="mb-3 flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                              <Building2 size={16} strokeWidth={stroke} className="mt-0.5 shrink-0" aria-hidden />
                              <span>
                                Если продаёте как <strong className="text-zinc-800 dark:text-zinc-200">юрлицо или ИП</strong>
                                , укажите название и реквизиты — покупатели увидят их на вашей публичной странице.
                              </span>
                            </div>
                            <label className="block">
                              <span className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Название компании или бренда
                              </span>
                              <input
                                value={form.companyName}
                                onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
                                className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-violet-500"
                                placeholder="ООО «Ромашка», ИП Иванов…"
                              />
                            </label>
                            <label className="mt-4 block">
                              <span className="mb-1.5 flex items-center justify-between gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                <span>О компании</span>
                                <span className="text-xs font-normal text-zinc-400 dark:text-zinc-500">
                                  {form.companyInfo.length} / 8000
                                </span>
                              </span>
                              <textarea
                                value={form.companyInfo}
                                onChange={(e) => setForm((p) => ({ ...p, companyInfo: e.target.value }))}
                                rows={5}
                                className="min-h-[120px] w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-relaxed outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-violet-500"
                                placeholder="Вид деятельности, юридический адрес, ИНН/ОГРН (если хотите указать публично), режим работы, сайт компании…"
                              />
                            </label>
                          </div>
                        </div>
                      ) : null}

                      {section === 'appearance' ? (
                        <div className="space-y-4">
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">
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
                                      ? 'border-sky-500 bg-sky-50/80 shadow-md shadow-sky-500/10 dark:border-sky-500 dark:bg-sky-950/50'
                                      : 'border-zinc-200 bg-zinc-50/30 hover:border-sky-200 hover:bg-sky-50/40 dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:border-sky-700 dark:hover:bg-sky-950/30'
                                  }`}
                                >
                                  <span
                                    className={`mb-3 grid h-12 w-12 place-items-center rounded-xl ${
                                      active
                                        ? 'bg-sky-600 text-white'
                                        : 'bg-white text-zinc-500 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-700'
                                    }`}
                                  >
                                    <ThemeIcon size={24} strokeWidth={stroke} aria-hidden />
                                  </span>
                                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{label}</span>
                                  <span className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</span>
                                  {active ? (
                                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sky-700 dark:text-sky-400">
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
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">
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
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Решите, что видят покупатели на вашей{' '}
                            {me?.id ? (
                              <Link href={`/seller/${me.id}`} className="font-semibold text-sky-700 hover:underline dark:text-sky-400">
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
                          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 px-4 py-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                            <div className="flex items-start gap-3">
                              <Sparkles size={20} strokeWidth={stroke} className="mt-0.5 shrink-0 text-violet-600 dark:text-violet-400" aria-hidden />
                              <div>
                                <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">Скоро здесь будет больше</p>
                                <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-200/90">
                                  Планируем смену пароля, список активных сессий и выход со всех устройств.
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
                            Сейчас вход защищён cookie-сессией: без авторизации изменить чужой аккаунт нельзя.
                          </div>
                        </div>
                      ) : null}

                      {error ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                          {error}
                        </div>
                      ) : null}
                      {saved ? (
                        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
                          <CheckCircle size={18} strokeWidth={stroke} aria-hidden />
                          Настройки сохранены
                        </div>
                      ) : null}

                      <div className="flex flex-col gap-3 border-t border-zinc-100 pt-6 dark:border-zinc-800 sm:flex-row sm:items-center">
                        <button
                          type="button"
                          onClick={() => void save()}
                          disabled={busy}
                          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-6 text-sm font-bold text-white shadow-lg shadow-sky-600/25 transition hover:from-sky-700 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-xs"
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
                              Сохранить изменения
                            </>
                          )}
                        </button>
                        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400 sm:text-left">
                          Некоторые параметры (тема) применяются сразу после сохранения в этом браузере.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
