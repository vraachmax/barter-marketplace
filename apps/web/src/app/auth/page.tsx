'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound, X } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { authReturnPath } from '@/lib/auth-return';

type Mode = 'login' | 'register';
type Notice = { kind: 'error' | 'info' | 'ok'; message: string } | null;

const knownErrors: Record<string, string> = {
  already_registered: 'Этот email или телефон уже зарегистрирован. Попробуйте войти.',
  email_or_phone_required: 'Укажите email или номер телефона.',
  choose_email_or_phone: 'Укажите email или номер телефона, но не оба сразу.',
  network_error: 'Проверьте подключение к интернету.',
  Unauthorized: 'Неверный телефон, email или пароль.',
};
const errorText = (message: unknown): string => {
  const code = Array.isArray(message) ? message[0] : message;
  return typeof code === 'string' ? (knownErrors[code] ?? code) : 'Не удалось выполнить вход. Попробуйте ещё раз.';
};

/**
 * Approved Barter mobile-auth concept. Preserve real API endpoints and
 * authReturnPath while replacing only the visual presentation.
 */
export default function AuthPage() {
  const router = useRouter();
  const { login: storeLogin } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const [yandexEnabled, setYandexEnabled] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'register' || params.get('mode') === 'add-account') {
      queueMicrotask(() => setMode('register'));
    }
    const controller = new AbortController();
    fetch('/auth/providers', { signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (!controller.signal.aborted) setYandexEnabled(data?.yandex?.enabled === true); })
      .catch(() => { if (!controller.signal.aborted) setYandexEnabled(false); });
    return () => controller.abort();
  }, []);

  const payload = useMemo(() => {
    const value = identifier.trim();
    const phone = value.startsWith('+') || /^[0-9()\-\s]+$/.test(value);
    return phone ? { phone: value } : { email: value };
  }, [identifier]);

  function selectMode(next: Mode) {
    setMode(next);
    setNotice(null);
    setPassword('');
    setShowPassword(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !identifier.trim() || password.length < 6) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(mode === 'login' ? '/auth/login' : '/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, password }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || typeof data?.token !== 'string') {
        setNotice({ kind: 'error', message: errorText(data?.message ?? (response.status === 401 ? 'Unauthorized' : 'network_error')) });
        return;
      }
      await storeLogin(data.token);
      setNotice({ kind: 'ok', message: 'Готово! Перенаправляем…' });
      router.replace(authReturnPath(new URLSearchParams(window.location.search).get('next')));
    } catch {
      setNotice({ kind: 'error', message: knownErrors.network_error });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="barter-auth" data-auth-screen="reference-2026-10">
      {/* Approved translucent amber-glass ribbon asset, not a CSS/SVG approximation. */}
      <div className="barter-auth__orb" aria-hidden="true">
        <Image
          src="/auth/amber-glass-ribbon.webp"
          alt=""
          width={491}
          height={443}
          priority
          unoptimized
          className="barter-auth__ribbon-image"
        />
      </div>

      <div className="barter-auth__content">
        <header className="barter-auth__brand-row">
          <Link href="/" className="barter-auth__brand" aria-label="БАРТЕР — на главную">
            <Image src="/brand/bubble-b-v3.svg" alt="" width={38} height={42} unoptimized className="barter-auth__brand-mark" />
            <span className="barter-auth__brand-word">БАРТЕР</span>
          </Link>
        </header>

        <section className="barter-auth__intro" aria-labelledby="auth-heading">
          <h1 id="auth-heading">{mode === 'login' ? 'Вход' : 'Регистрация'}</h1>
          <p>{mode === 'login'
            ? 'Войдите, чтобы управлять объявлениями, чатами и избранным.'
            : 'Создайте аккаунт, чтобы покупать, обменивать и размещать объявления.'}</p>
        </section>

        <form className="barter-auth__form" onSubmit={event => { void submit(event); }}>
          <label className="barter-auth__field">
            <UserRound size={22} strokeWidth={1.7} aria-hidden="true" />
            <span className="sr-only">Телефон или email</span>
            <input
              name="username"
              value={identifier}
              onChange={event => setIdentifier(event.target.value)}
              type="text"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              placeholder="Телефон или email"
              aria-label="Телефон или email"
            />
            <button type="button" className="barter-auth__field-action barter-auth__clear"
              aria-label="Очистить поле" disabled={!identifier}
              onClick={() => setIdentifier('')}><X size={18} strokeWidth={1.8} /></button>
          </label>

          <label className="barter-auth__field">
            <LockKeyhole size={22} strokeWidth={1.7} aria-hidden="true" />
            <span className="sr-only">Пароль</span>
            <input
              name="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              type={showPassword ? 'text' : 'password'}
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              placeholder="Пароль"
              aria-label="Пароль"
            />
            <button type="button" className="barter-auth__field-action barter-auth__visibility"
              onClick={() => setShowPassword(show => !show)}
              aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}>
              {showPassword ? <Eye size={21} strokeWidth={1.8} /> : <EyeOff size={21} strokeWidth={1.8} />}
            </button>
          </label>

          {mode === 'login' ? (
            <div className="barter-auth__forgot-row">
              <button type="button" onClick={() => setNotice({kind:'info',message:'Восстановление пароля пока не подключено. Если ваш аккаунт связан с Яндекс ID, попробуйте войти через него.'})}>
                Забыли пароль?
              </button>
            </div>
          ) : (
            <p className="barter-auth__legal">Создавая аккаунт, вы соглашаетесь с правилами сервиса.</p>
          )}

          {notice ? (
            <p role={notice.kind === 'error' ? 'alert' : 'status'} className={'barter-auth__notice barter-auth__notice--' + notice.kind}>
              {notice.message}
            </p>
          ) : null}

          <button type="submit" disabled={busy || !identifier.trim() || password.length < 6}
            className="barter-auth__submit">
            {busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
          </button>
        </form>

        <div className="barter-auth__alternatives">
          {yandexEnabled ? (
            <a className="barter-auth__yandex" href="/auth/yandex">
              <span className="barter-auth__yandex-mark" aria-hidden="true">Я</span>
              Продолжить с Яндекс ID
            </a>
          ) : (
            <button type="button" className="barter-auth__yandex" aria-disabled="true"
              onClick={() => setNotice({kind:'info',message:'Вход через Яндекс ID станет доступен после подключения сервиса.'})}>
              <span className="barter-auth__yandex-mark" aria-hidden="true">Я</span>
              Продолжить с Яндекс ID
            </button>
          )}

          <div className="barter-auth__divider" aria-hidden="true"><span>или</span></div>

          <button type="button" className="barter-auth__switch"
            onClick={() => selectMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Создать аккаунт' : 'Уже есть аккаунт? Войти'}
          </button>
        </div>

        <footer className="barter-auth__footer">
          <ShieldCheck size={25} strokeWidth={1.5} aria-hidden="true" />
          <span>Безопасный вход. Объявления, обмен<br className="barter-auth__desktop-break" /> и сообщения — в одном месте.</span>
        </footer>
      </div>
    </main>
  );
}
