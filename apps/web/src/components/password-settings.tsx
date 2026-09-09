'use client';

import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { CheckCircle, Lock } from 'lucide-react';
import { apiFetchJson } from '@/lib/api';

export function PasswordSettings() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError('');
    setSaved(false);
    if (newPassword !== confirmation) {
      setError('Новые пароли не совпадают.');
      return;
    }
    setBusy(true);
    try {
      const result = await apiFetchJson<{ token?: string }>('/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
        signal: AbortSignal.timeout(15000),
      });
      if (!result.ok) {
        const message = result.message;
        setError(message.includes('wrong_current_password') ? 'Текущий пароль неверный.'
          : message.includes('password_login_unavailable') ? 'Для этого аккаунта вход по паролю недоступен.'
          : result.status === 401 ? 'Войдите в аккаунт заново, чтобы изменить пароль.'
          : 'Не удалось изменить пароль. Попробуйте ещё раз.');
        return;
      }
      if (result.data.token) {
        try { localStorage.setItem('barter_token', result.data.token); } catch { /* Cookie session remains active. */ }
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
      setSaved(true);
    } catch {
      setError('Не удалось связаться с сервером. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><Lock size={21} aria-hidden /></span>
        <div><h3 className="font-semibold">Смена пароля</h3><p className="mt-1 text-sm text-muted-foreground">Укажите текущий пароль и придумайте новый, не короче 6 символов.</p></div>
      </div>
      {[
        { label: 'Текущий пароль', value: currentPassword, change: setCurrentPassword, autocomplete: 'current-password', min: 1 },
        { label: 'Новый пароль', value: newPassword, change: setNewPassword, autocomplete: 'new-password', min: 6 },
        { label: 'Повторите новый пароль', value: confirmation, change: setConfirmation, autocomplete: 'new-password', min: 6 },
      ].map((field) => (
        <label key={field.label} className="block">
          <span className="mb-2 block text-sm font-medium">{field.label}</span>
          <input type="password" required minLength={field.min} autoComplete={field.autocomplete} value={field.value} onChange={(e) => field.change(e.target.value)} disabled={busy}
            className="h-12 w-full rounded-2xl border border-border bg-muted/40 px-4 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60" />
        </label>
      ))}
      {error ? <p role="alert" className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p> : null}
      {saved ? <p role="status" className="flex items-center gap-2 rounded-2xl bg-primary/10 p-4 text-sm"><CheckCircle size={18} aria-hidden />Пароль изменён</p> : null}
      <Button disabled={busy} type="submit" size="lg" className="w-full">{busy ? 'Меняем пароль…' : 'Изменить пароль'}</Button>
    </form>
  );
}
