'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

type Mode = 'login' | 'register';

const errorMessages: Record<string, string> = {
  already_registered: 'Этот email или телефон уже зарегистрирован. Попробуйте войти.',
  email_or_phone_required: 'Укажите email или номер телефона.',
  choose_email_or_phone: 'Укажите только email или только телефон.',
  network_error: 'Ошибка сети. Проверьте подключение к интернету.',
  Unauthorized: 'Неверный email/телефон или пароль.',
};

function humanError(msg: string): string {
  return errorMessages[msg] ?? msg;
}

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<{ kind: 'idle' } | { kind: 'error'; msg: string } | { kind: 'ok' }>({
    kind: 'idle',
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const modeParam = new URLSearchParams(window.location.search).get('mode');
    if (modeParam === 'register' || modeParam === 'add-account') setMode('register');
  }, []);

  const payload = useMemo(() => {
    const v = emailOrPhone.trim();
    const isPhone = v.startsWith('+') || /^[0-9()\-\s]+$/.test(v);
    return isPhone ? { phone: v } : { email: v };
  }, [emailOrPhone]);

  const { login: authLogin } = useAuth();

  async function submit() {
    setBusy(true);
    setStatus({ kind: 'idle' });
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register';
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, password }),
      });
      const data = await res.json();
      setBusy(false);
      if (!res.ok || !data.token) {
        const msg = data?.message ?? (res.ok ? 'no_token' : `API ${res.status}`);
        setStatus({ kind: 'error', msg: humanError(msg) });
        return;
      }
      await authLogin(data.token);
      setStatus({ kind: 'ok' });
      setTimeout(() => {
        window.location.href = '/';
      }, 300);
    } catch (e: any) {
      setBusy(false);
      setStatus({ kind: 'error', msg: `Ошибка: ${e?.message ?? 'неизвестная ошибка'}` });
    }
  }

  return (
    <div className="min-h-screen bg-zinc-100 px-4 py-6 pb-24 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100 md:py-12 md:pb-12">
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-xl shadow-zinc-300/30 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/40">
        <div className="border-b border-zinc-200/80 bg-gradient-to-r from-sky-50 via-white to-cyan-50/90 px-5 py-4 dark:border-zinc-800 dark:from-sky-950/40 dark:via-zinc-900 dark:to-cyan-950/25">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-md shadow-sky-500/25">
                <Sparkles size={22} strokeWidth={1.8} className="text-white" aria-hidden />
              </span>
              <div>
                <div className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {mode === 'login' ? 'Вход' : 'Регистрация'}
                </div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Маркетплейс Бартер</p>
              </div>
            </div>
            <Link
              className="shrink-0 text-sm font-semibold text-sky-700 underline decoration-sky-600/30 underline-offset-2 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300"
              href="/"
            >
              На главную
            </Link>
          </div>
        </div>

        <div className="p-5 md:p-6">
          <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-zinc-100 p-1.5 dark:bg-zinc-900">
            <button
              className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                mode === 'login'
                  ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
              onClick={() => setMode('login')}
              type="button"
            >
              Вход
            </button>
            <button
              className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                mode === 'register'
                  ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
              onClick={() => setMode('register')}
              type="button"
            >
              Регистрация
            </button>
          </div>

          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <label className="block">
              <div className="mb-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400">Email или телефон</div>
              <input
                className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3 text-base text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 dark:border-zinc-600 dark:bg-slate-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-cyan-500 dark:focus:ring-cyan-500/20"
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                placeholder="test@example.com или +7..."
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
              />
            </label>

            <label className="block">
              <div className="mb-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400">Пароль</div>
              <input
                className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3 text-base text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 dark:border-zinc-600 dark:bg-slate-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-cyan-500 dark:focus:ring-cyan-500/20"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="минимум 6 символов"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </label>

            {status.kind === 'error' ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                {status.msg}
              </div>
            ) : null}

            {status.kind === 'ok' ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
                Готово! Перенаправляем на главную...
              </div>
            ) : null}

            {mode === 'register' ? (
              <div className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                Регистрируясь, вы подтверждаете согласие с правилами сервиса.
              </div>
            ) : null}

            <button
              className="mt-1 h-12 w-full rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-4 text-base font-bold text-white shadow-lg shadow-sky-600/25 transition hover:from-sky-700 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy || emailOrPhone.trim().length === 0 || password.length < 6}
              type="submit"
            >
              {busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-zinc-500 dark:text-zinc-400">
            {mode === 'login' ? (
              <span>
                Нет аккаунта?{' '}
                <button
                  className="font-semibold text-sky-600 underline decoration-sky-600/30 underline-offset-2 hover:text-sky-700 dark:text-sky-400"
                  onClick={() => setMode('register')}
                  type="button"
                >
                  Зарегистрироваться
                </button>
              </span>
            ) : (
              <span>
                Уже есть аккаунт?{' '}
                <button
                  className="font-semibold text-sky-600 underline decoration-sky-600/30 underline-offset-2 hover:text-sky-700 dark:text-sky-400"
                  onClick={() => setMode('login')}
                  type="button"
                >
                  Войти
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
