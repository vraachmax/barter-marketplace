'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

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
  const [status, setStatus] = useState<
    { kind: 'idle' } | { kind: 'error'; msg: string } | { kind: 'ok' }
  >({ kind: 'idle' });
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
    } catch (e: unknown) {
      setBusy(false);
      const msg = e instanceof Error ? e.message : 'неизвестная ошибка';
      setStatus({ kind: 'error', msg: `Ошибка: ${msg}` });
    }
  }

  return (
    <div className="min-h-screen bg-muted px-4 py-6 pb-24 text-foreground antialiased md:py-12 md:pb-12">
      <Card className="mx-auto w-full max-w-md gap-0 overflow-hidden p-0">
        {/* Header banner — Avito blue tint */}
        <div className="border-b border-border bg-primary/10 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground">
                <Sparkles size={22} strokeWidth={1.8} aria-hidden />
              </span>
              <div>
                <div className="text-lg font-bold tracking-tight text-foreground">
                  {mode === 'login' ? 'Вход' : 'Регистрация'}
                </div>
                <p className="text-xs font-medium text-muted-foreground">Маркетплейс Бартер</p>
              </div>
            </div>
            <Link
              href="/"
              className="shrink-0 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
            >
              На главную
            </Link>
          </div>
        </div>

        <div className="p-5 md:p-6">
          {/* Mode tabs */}
          <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-muted p-1.5">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${
 mode === 'login'
 ? 'bg-background text-foreground shadow-sm'
 : 'text-muted-foreground hover:text-foreground'
 }`}
            >
              Вход
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${
 mode === 'register'
 ? 'bg-background text-foreground shadow-sm'
 : 'text-muted-foreground hover:text-foreground'
 }`}
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
              <span className="mb-1.5 block text-sm font-medium text-muted-foreground">
                Email или телефон
              </span>
              <Input
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                placeholder="test@example.com или +7..."
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
                className="h-12 rounded-xl px-3 text-base"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-muted-foreground">Пароль</span>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="минимум 6 символов"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="h-12 rounded-xl px-3 text-base"
              />
            </label>

            {status.kind === 'error' ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                {status.msg}
              </div>
            ) : null}

            {status.kind === 'ok' ? (
              <div className="rounded-xl border border-secondary/30 bg-secondary/10 px-3 py-2.5 text-sm text-secondary">
                Готово! Перенаправляем на главную...
              </div>
            ) : null}

            {mode === 'register' ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                Регистрируясь, вы подтверждаете согласие с правилами сервиса.
              </p>
            ) : null}

            <Button
              type="submit"
              size="lg"
              disabled={busy || emailOrPhone.trim().length === 0 || password.length < 6}
              className="mt-1 h-12 w-full rounded-xl text-base font-semibold"
            >
              {busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
            </Button>
          </form>

          <div className="mt-5 text-center text-xs text-muted-foreground">
            {mode === 'login' ? (
              <span>
                Нет аккаунта?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  Зарегистрироваться
                </button>
              </span>
            ) : (
              <span>
                Уже есть аккаунт?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  Войти
                </button>
              </span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
