'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type SetStateAction } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  Bell, Building2, Camera, CheckCircle, ChevronRight, Lock, Mail, MessageSquare,
  Monitor, Moon, Palette, Phone, Settings, Shield, Store, Sun, User,
} from 'lucide-react';
import { apiFetchJson, type AuthMe } from '@/lib/api';
import { AccountScreenHeader } from '@/components/account-screen-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PasswordSettings } from '@/components/password-settings';
import { applyThemePreference, getStoredThemePreference, getCurrentThemePreference, subscribeTheme } from '@/lib/theme';
import { buildSettingsPatch, autoReplyChanged, type SettingsForm, type SettingsSection as Section } from '@/lib/settings-patch';

const stroke = 1.8;
type AutoReply = { enabled: boolean; text: string };

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

function SettingsToggleRow({ checked, onChange, title, description }: {
  checked: boolean; onChange: (value: boolean) => void; title: string; description: string;
}) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={title}
      onClick={() => onChange(!checked)}
      className="flex min-h-12 w-full items-start justify-between gap-4 rounded-2xl border border-border bg-muted/40 p-4 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed">
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
      </span>
      <span aria-hidden className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
        <span className={`absolute left-0.5 top-0.5 size-6 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${checked ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  );
}

export function ProfileSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedSection = searchParams.get('section');
  const section: Section = isSection(requestedSection) ? requestedSection : 'account';
  const [status, setStatus] = useState<'loading' | 'need_auth' | 'ready' | 'error'>('loading');
  const [me, setMe] = useState<AuthMe | null>(null);
  const [form, setForm] = useState<SettingsForm>({
    email: '', phone: '', name: '', avatarUrl: '', about: '', companyName: '', companyInfo: '',
    appTheme: 'SYSTEM', notificationsEnabled: true, marketingEnabled: false,
    showEmailPublic: false, showPhonePublic: false,
  });
  const [autoReply, setAutoReply] = useState<AutoReply>({ enabled: false, text: '' });
  const [loadedAutoReply, setLoadedAutoReply] = useState<AutoReply | null>(null);
  const [autoReplyStatus, setAutoReplyStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const saveLock = useRef(false);
  const loadSequence = useRef(0);
  const autoReplySequence = useRef(0);

  function editForm(update: SetStateAction<SettingsForm>) {
    setSaved(false);
    setError('');
    setForm(update);
  }

  function editAutoReply(update: SetStateAction<AutoReply>) {
    setSaved(false);
    setError('');
    setAutoReply(update);
  }

  function goToSection(next: Section) {
    if (saveLock.current) return;
    setSaved(false);
    setError('');
    router.push(`/profile/settings?section=${next}`, { scroll: false });
  }

  async function loadAutoReply() {
    const sequence = ++autoReplySequence.current;
    setAutoReplyStatus('loading');
    const res = await apiFetchJson<AutoReply>('/support/seller/auto-reply', { signal: AbortSignal.timeout(15000) });
    if (sequence !== autoReplySequence.current) return;
    if (!res.ok) {
      setLoadedAutoReply(null);
      setAutoReplyStatus('error');
      return;
    }
    const value = { enabled: Boolean(res.data.enabled), text: res.data.text ?? '' };
    setAutoReply(value);
    setLoadedAutoReply(value);
    setAutoReplyStatus('ready');
  }

  async function load() {
    const sequence = ++loadSequence.current;
    const res = await apiFetchJson<AuthMe>('/auth/me', { signal: AbortSignal.timeout(15000) });
    if (sequence !== loadSequence.current) return;
    if (!res.ok) {
      setStatus(res.status === 401 ? 'need_auth' : 'error');
      return;
    }
    setMe(res.data);
    setForm({
      email: res.data.email ?? '', phone: res.data.phone ?? '', name: res.data.name ?? '',
      avatarUrl: res.data.avatarUrl ?? '', about: res.data.about ?? '',
      companyName: res.data.companyName ?? '', companyInfo: res.data.companyInfo ?? '',
      appTheme: getStoredThemePreference() ?? res.data.appTheme ?? 'LIGHT',
      notificationsEnabled: res.data.notificationsEnabled ?? true,
      marketingEnabled: res.data.marketingEnabled ?? false,
      showEmailPublic: res.data.showEmailPublic ?? false,
      showPhonePublic: res.data.showPhonePublic ?? false,
    });
    setStatus('ready');
    void loadAutoReply();
  }

  async function save() {
    if (saveLock.current || !me || section === 'security') return;
    saveLock.current = true;
    setBusy(true);
    setSaved(false);
    setError('');
    let accountSaved = false;
    try {
      const patch = buildSettingsPatch(section, form, me);
      const reply = { ...autoReply };
      const saveReply = section === 'storefront' && autoReplyStatus === 'ready' && autoReplyChanged(reply, loadedAutoReply);
      const signal = AbortSignal.timeout(15000);
      if (Object.keys(patch).length > 0) {
        const res = await apiFetchJson<AuthMe>('/auth/me', {
          method: 'PATCH', body: JSON.stringify(patch), signal,
        });
        if (!res.ok) {
          setError(res.status === 401 ? 'Сессия истекла. Войдите снова, чтобы сохранить настройки.' : res.status === 0 ? 'Не удалось подтвердить сохранение. Проверьте соединение и повторите.' : res.message);
          return;
        }
        accountSaved = true;
        setMe(res.data);
        if (patch.appTheme) applyThemePreference(patch.appTheme);
      }
      if (saveReply) {
        const res = await apiFetchJson<AutoReply>('/support/seller/auto-reply', {
          method: 'PUT', body: JSON.stringify(reply), signal,
        });
        if (!res.ok) {
          setError(accountSaved
            ? 'Витрина сохранена, но автоответ не удалось обновить. Повторите сохранение.'
            : 'Не удалось подтвердить сохранение автоответа. Проверьте соединение и повторите.');
          return;
        }
        const value = { enabled: Boolean(res.data.enabled), text: res.data.text ?? reply.text };
        setAutoReply(value);
        setLoadedAutoReply(value);
      }
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось сохранить настройки.');
    } finally {
      saveLock.current = false;
      setBusy(false);
    }
  }

  useEffect(() => {
    // load updates state only after awaiting the account API response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    return () => { loadSequence.current++; autoReplySequence.current++; };
  }, []);

  useEffect(() => subscribeTheme(() => {
    setSaved(false);
    setForm(previous => ({ ...previous, appTheme: getCurrentThemePreference() }));
  }), []);

  const currentMeta = SECTIONS.find(item => item.id === section);
  const SectionHeroIcon = currentMeta?.icon ?? Settings;
  const loginHref = `/auth?next=${encodeURIComponent(`/profile/settings?section=${section}`)}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AccountScreenHeader title="Настройки" subtitle="Аккаунт и приложение" showSettings={false} width="wide" />
      <main className="mx-auto max-w-6xl page-content-spacing px-4 pt-6 md:px-6">
        {status === 'loading' ? <div role="status" aria-label="Загружаем настройки" className="h-80 animate-pulse rounded-3xl bg-muted motion-reduce:animate-none" /> : null}
        {status === 'need_auth' ? (
          <section className="mx-auto max-w-md rounded-3xl border border-border bg-card p-6 text-center sm:p-8">
            <Settings size={32} className="mx-auto text-muted-foreground" aria-hidden />
            <h2 className="mt-4 text-xl font-semibold">Настройки аккаунта</h2>
            <p className="mt-2 text-sm text-muted-foreground">Войдите, чтобы изменить контакты, оформление и приватность.</p>
            <Button render={<Link href={loginHref} />} size="lg" className="mt-6 w-full">Войти</Button>
          </section>
        ) : null}
        {status === 'error' ? (
          <section role="alert" className="rounded-3xl border border-border bg-card p-6">
            <p>Не удалось загрузить настройки.</p>
            <Button className="mt-4" onClick={() => { setStatus('loading'); void load(); }}>Повторить</Button>
          </section>
        ) : null}
        {status === 'ready' ? (
          <div className="grid items-start gap-6 lg:grid-cols-[224px_minmax(0,1fr)]">
            <nav aria-label="Разделы настроек" className="rounded-3xl border border-border bg-card p-3 lg:sticky lg:top-24">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
                {SECTIONS.map(item => {
                  const Icon = item.icon;
                  return (
                    <button key={item.id} type="button" disabled={busy} aria-pressed={section === item.id}
                      onClick={() => goToSection(item.id)}
                      className="flex min-h-12 min-w-0 items-center gap-2 rounded-2xl px-3 py-3 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60 aria-pressed:bg-muted aria-pressed:text-foreground">
                      <Icon size={18} strokeWidth={stroke} className="shrink-0" aria-hidden />
                      <span className="break-words">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
            <section aria-labelledby="settings-section-title" className="min-w-0 rounded-3xl border border-border bg-card p-4 sm:p-6">
              <div className="mb-6 flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-muted">
                  <SectionHeroIcon size={22} strokeWidth={stroke} aria-hidden />
                </span>
                <div className="min-w-0">
                  <h2 id="settings-section-title" className="text-xl font-semibold tracking-tight">{currentMeta?.label}</h2>
                  <p className="text-sm text-muted-foreground">{currentMeta?.description}</p>
                </div>
              </div>
              <fieldset disabled={busy} aria-busy={busy} className="min-w-0 space-y-6">
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
                              <Input
                                value={form.email}
                                onChange={(e) => editForm((p) => ({ ...p, email: e.target.value }))}

                                placeholder="user@example.com"
                                type="email"
                                autoComplete="email"
                              />
                            </label>
                            <label className="block">
                              <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
                                <Phone size={16} strokeWidth={stroke} aria-hidden />
                                Телефон
                              </span>
                              <Input
                                value={form.phone}
                                onChange={(e) => editForm((p) => ({ ...p, phone: e.target.value }))}

                                placeholder="+7 999 123-45-67"
                                type="tel"
                                autoComplete="tel"
                              />
                            </label>
                          </div>
                        ) : null}

                        {section === 'storefront' ? (
                          <div className="space-y-6">
                            <div className="rounded-2xl bg-muted/60 px-4 py-4 text-sm text-foreground">
                              <p className="font-semibold">Витрина продавца</p>
                              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                Заполните <strong>отображаемое имя</strong>,{' '}
                                <strong>«О продавце»</strong> (опыт, условия, сроки ответа) и при необходимости блок{' '}
                                <strong>компании</strong> — юр. название и описание. Так покупателям будет проще доверять и связываться с вами.
                              </p>
                              {me?.id ? (
                                <Link
                                  href={`/seller/${me.id}`}
                                  className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-foreground underline"
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
                              <Input
                                value={form.name}
                                onChange={(e) => editForm((p) => ({ ...p, name: e.target.value }))}

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
                              <Input
                                maxLength={2000}
                                value={form.avatarUrl}
                                onChange={(e) => editForm((p) => ({ ...p, avatarUrl: e.target.value }))}

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
                              <Textarea
                                value={form.about}
                                onChange={(e) => editForm((p) => ({ ...p, about: e.target.value }))}
                                rows={6}
                                maxLength={8000}

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
                                <Input
                                  maxLength={500}
                                  value={form.companyName}
                                  onChange={(e) => editForm((p) => ({ ...p, companyName: e.target.value }))}

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
                                <Textarea
                                  value={form.companyInfo}
                                  onChange={(e) => editForm((p) => ({ ...p, companyInfo: e.target.value }))}
                                  rows={5}
                                  maxLength={8000}

                                  placeholder="Вид деятельности, юридический адрес, ИНН/ОГРН (если хотите указать публично), режим работы, сайт компании…"
                                />
                              </label>
                            </div>

                            <div className="relative">
                              <div className="absolute inset-x-0 top-1/2 h-px bg-muted" aria-hidden />
                              <p className="relative mx-auto w-fit bg-card px-3 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                                Автоматический ответ
                              </p>
                            </div>

                            <div className="rounded-2xl border border-border bg-muted/40 p-4">
                              <div className="mb-3 flex items-start gap-2">
                                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-muted text-muted-foreground">
                                  <MessageSquare size={18} strokeWidth={stroke} aria-hidden />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-foreground">Автоответ на первое сообщение</p>
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    Когда покупатель пишет вам впервые — площадка автоматически отправит этот текст
                                    от вашего имени, чтобы человек не ушёл, пока вы оффлайн.
                                  </p>
                                </div>
                              </div>

                              {autoReplyStatus === 'loading' ? <p role="status" className="text-sm text-muted-foreground">Загружаем автоответ…</p> : null}
                              {autoReplyStatus === 'error' ? (
                                <div role="alert" className="space-y-3 text-sm">
                                  <p>Не удалось загрузить автоответ. Настройки витрины можно сохранить отдельно.</p>
                                  <Button type="button" variant="outline" onClick={() => void loadAutoReply()}>Повторить загрузку</Button>
                                </div>
                              ) : null}
                              <fieldset disabled={autoReplyStatus !== 'ready'} className="min-w-0 space-y-4 disabled:opacity-60">
                              <SettingsToggleRow
                                checked={autoReply.enabled}
                                onChange={(v) => editAutoReply((p) => ({ ...p, enabled: v }))}
                                title="Включить автоответ"
                                description="Срабатывает один раз на чат — когда покупатель отправляет первое сообщение, а вы ещё не ответили"
                              />

                              <label className="mt-4 block">
                                <span className="mb-1.5 flex items-center justify-between gap-2 text-sm font-medium text-foreground">
                                  <span>Текст автоответа</span>
                                  <span className="text-xs font-normal text-muted-foreground">
                                    {autoReply.text.length} / 1000
                                  </span>
                                </span>
                                <Textarea
                                  value={autoReply.text}
                                  onChange={(e) =>
                                    editAutoReply((p) => ({ ...p, text: e.target.value.slice(0, 1000) }))
                                  }
                                  rows={4}
                                  disabled={!autoReply.enabled}
                                  placeholder="Спасибо за сообщение! Я обычно отвечаю в течение часа. Если вопрос срочный — напишите подробнее, и я вернусь как только смогу."

                                />
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Совет: укажите ваше обычное время ответа, способ связи (звонок/WhatsApp) или
                                  основные условия — самовывоз, доставка, торг.
                                </p>
                              </label>
                              </fieldset>
                            </div>
                          </div>
                        ) : null}

                        {section === 'appearance' ? (
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                              Тема меняется сразу. Нажмите «Сохранить», чтобы записать выбор в аккаунт.
                            </p>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
                                    onClick={() => { editForm((p) => ({ ...p, appTheme: id })); applyThemePreference(id); }}
                                    aria-pressed={active}
                                    className={`flex min-h-20 min-w-0 items-center gap-3 rounded-2xl border-2 p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-primary sm:flex-col sm:gap-2 sm:p-4 sm:text-center ${
 active
 ? 'border-primary bg-primary/10'
 : 'border-border bg-muted/50 hover:border-primary/40 hover:bg-primary/10'
 }`}
                                  >
                                    <span
                                      className={`grid size-10 shrink-0 place-items-center rounded-2xl ${
 active
 ? 'bg-primary text-white'
 : 'bg-card text-muted-foreground ring-1 ring-border'
 }`}
                                    >
                                      <ThemeIcon size={22} strokeWidth={stroke} aria-hidden />
                                    </span>
                                    <span className="min-w-0 flex-1 sm:flex-none">
                                      <span className="block text-sm font-semibold text-foreground">{label}</span>
                                      <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
                                    </span>
                                    {active ? (
                                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
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
                              onChange={(v) => editForm((p) => ({ ...p, notificationsEnabled: v }))}
                              title="Служебные уведомления"
                              description="Сообщения в чате, статусы объявлений и важные действия по аккаунту"
                            />
                            <SettingsToggleRow
                              checked={form.marketingEnabled}
                              onChange={(v) => editForm((p) => ({ ...p, marketingEnabled: v }))}
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
                              onChange={(v) => editForm((p) => ({ ...p, showEmailPublic: v }))}
                              title="Показывать email"
                              description="Адрес будет доступен на витрине продавца"
                            />
                            <SettingsToggleRow
                              checked={form.showPhonePublic}
                              onChange={(v) => editForm((p) => ({ ...p, showPhonePublic: v }))}
                              title="Показывать телефон"
                              description="Номер будет доступен на витрине продавца"
                            />
                          </div>
                        ) : null}

                        {section === 'security' ? <PasswordSettings /> : null}


                {error ? (
                  <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                    <p>{error}</p>
                    {error.includes('Войдите снова') ? <Link href={loginHref} className="mt-2 inline-flex min-h-11 items-center underline">Войти снова</Link> : null}
                  </div>
                ) : null}
                {saved ? <p role="status" className="flex items-center gap-2 rounded-2xl bg-muted p-4 text-sm"><CheckCircle size={18} aria-hidden />Настройки раздела сохранены</p> : null}
                {section !== 'security' ? (
                  <div className="border-t border-border pt-6">
                    <Button type="button" size="lg" onClick={() => void save()} disabled={busy} aria-busy={busy} className="w-full sm:max-w-xs">
                      {busy ? 'Сохраняем…' : 'Сохранить'}
                    </Button>
                    <p className="mt-3 text-xs text-muted-foreground">Сохраняются изменения в разделе «{currentMeta?.label}».</p>
                  </div>
                ) : null}
              </fieldset>
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
