'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HelpCircle, Loader2, Send, Sparkles, Wand2, X } from 'lucide-react';
import { apiFetchJson, type AdviseResponse, type SupportTemplate } from '@/lib/api';

type SupportSheetMessage =
  | {
      id: string;
      kind: 'bot';
      text: string;
      suggestions?: { code: string; title: string; text: string }[];
      createdAt: string;
    }
  | {
      id: string;
      kind: 'user';
      text: string;
      createdAt: string;
    };

type Props = {
  open: boolean;
  onClose: () => void;
};

const WELCOME_MESSAGE: SupportSheetMessage = {
  id: 'welcome',
  kind: 'bot',
  text:
    'Здравствуйте! Я — ассистент Бартера. Помогу с размещением, оплатой, доставкой и спорами. Опишите ситуацию или выберите тему ниже.',
  suggestions: [
    { code: 'w-listing', title: 'Как разместить объявление', text: 'Как разместить объявление?' },
    { code: 'w-promote', title: 'Как продвинуть', text: 'Как продвинуть объявление?' },
    { code: 'w-barter', title: 'Как устроен бартер', text: 'Как устроен режим бартера?' },
    { code: 'w-safety', title: 'Безопасная сделка', text: 'Как провести сделку безопасно?' },
  ],
  createdAt: new Date().toISOString(),
};

/**
 * Закреплённый чат поддержки — открывается с экрана `/messages` в виде
 * нижнего листа (мобилка) или правосайд-диалога (десктоп).
 *
 * Логика:
 *   • При открытии сразу здороваемся (WELCOME_MESSAGE) + подтягиваем FAQ
 *     из `/support/faq`, чтобы показать подсказки.
 *   • На каждый ввод пользователя дергаем `/support/advise` с
 *     `role: 'neutral'` и полем `prompt` — бэк возвращает `tip` + список
 *     готовых ответов (`suggestions`). Tip = основное сообщение, чипы =
 *     next-step идеи (клик → добавляет текст в ввод).
 *   • Если пользователь не авторизован — advise вернёт 401, в этом случае
 *     показываем ссылку на FAQ + форму тикета (через обычный виджет
 *     поддержки не ведём, чтобы не скрывать чат).
 */
export function SupportSheet({ open, onClose }: Props) {
  const [messages, setMessages] = useState<SupportSheetMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [faq, setFaq] = useState<SupportTemplate[]>([]);
  const [needAuth, setNeedAuth] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    if (open) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open, messages.length, scrollToBottom]);

  // Блокируем скролл body пока шит открыт (только на мобилке)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Закрытие по Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Подгружаем FAQ один раз
  useEffect(() => {
    if (!open || faq.length > 0) return;
    let alive = true;
    (async () => {
      const res = await apiFetchJson<SupportTemplate[]>('/support/faq');
      if (!alive) return;
      if (res.ok) setFaq(res.data.slice(0, 6));
    })();
    return () => {
      alive = false;
    };
  }, [open, faq.length]);

  const sendPrompt = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed || busy) return;

      const userMsg: SupportSheetMessage = {
        id: `u-${Date.now()}`,
        kind: 'user',
        text: trimmed,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setBusy(true);

      const res = await apiFetchJson<AdviseResponse>('/support/advise', {
        method: 'POST',
        body: JSON.stringify({ role: 'neutral', prompt: trimmed }),
      });
      setBusy(false);

      if (!res.ok) {
        if (res.status === 401) {
          setNeedAuth(true);
          setMessages((prev) => [
            ...prev,
            {
              id: `b-${Date.now()}`,
              kind: 'bot',
              text:
                'Чтобы продолжить диалог с ассистентом, войдите в аккаунт. А пока вот частые вопросы — возможно, ответ уже есть.',
              suggestions: faq.slice(0, 4).map((t) => ({
                code: t.code,
                title: t.title,
                text: t.text,
              })),
              createdAt: new Date().toISOString(),
            },
          ]);
          return;
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `b-${Date.now()}`,
            kind: 'bot',
            text:
              'Извините, не получилось получить ответ. Попробуйте переформулировать или открыть раздел «Частые вопросы».',
            createdAt: new Date().toISOString(),
          },
        ]);
        return;
      }

      const botMsg: SupportSheetMessage = {
        id: `b-${Date.now()}`,
        kind: 'bot',
        text: res.data.tip || 'Вот пара идей — выберите, какая ближе к вашей задаче.',
        suggestions: res.data.suggestions?.slice(0, 5),
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMsg]);
    },
    [busy, faq],
  );

  const faqChips = useMemo(
    () =>
      faq.slice(0, 4).map((t) => ({
        code: t.code,
        title: t.title,
        text: t.text,
      })),
    [faq],
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Чат с поддержкой Бартера"
      className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/50 backdrop-blur-sm md:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl md:max-h-[620px] md:w-[520px] md:rounded-3xl"
        style={{ animation: 'support-sheet-in 0.28s cubic-bezier(.34,1.56,.64,1)' }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 bg-gradient-to-br from-primary to-accent px-4 py-3 text-white">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/15 shadow-inner backdrop-blur-sm">
            <Sparkles size={22} strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-[15px] font-bold leading-tight">Бартер · Ассистент</span>
              <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold tracking-wide">
                24/7
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/85">
              <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-success" aria-hidden />
              Отвечаю мгновенно
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white/85 transition hover:bg-white/15 hover:text-white"
          >
            <X size={20} strokeWidth={2} aria-hidden />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-muted/40 px-4 py-4"
        >
          {messages.map((m) =>
            m.kind === 'bot' ? (
              <div key={m.id} className="flex max-w-[88%] items-start gap-2 self-start">
                <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-white shadow-md">
                  <Sparkles size={15} strokeWidth={2} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="rounded-2xl rounded-tl-md border border-border bg-card px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground shadow-sm">
                    {m.text}
                  </div>
                  {m.suggestions && m.suggestions.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {m.suggestions.map((s) => (
                        <button
                          key={s.code}
                          type="button"
                          onClick={() => void sendPrompt(s.text)}
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-card px-2.5 py-1 text-[11px] font-semibold text-accent shadow-sm transition hover:bg-accent/10 disabled:opacity-50"
                          title={s.text}
                        >
                          <Wand2 size={11} strokeWidth={2} className="shrink-0" aria-hidden />
                          {s.title}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex max-w-[88%] flex-col items-end self-end">
                <div className="rounded-2xl rounded-tr-md bg-primary px-3.5 py-2.5 text-[13px] leading-relaxed text-white shadow-sm">
                  {m.text}
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  {new Date(m.createdAt).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ),
          )}

          {busy ? (
            <div className="flex max-w-[88%] items-start gap-2 self-start">
              <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-white shadow-md">
                <Sparkles size={15} strokeWidth={2} aria-hidden />
              </div>
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-border bg-card px-3.5 py-3 shadow-sm">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
              </div>
            </div>
          ) : null}

          {needAuth ? (
            <a
              href="/auth"
              className="mt-1 inline-flex items-center justify-center gap-2 self-stretch rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-[13px] font-semibold text-primary transition hover:bg-primary/15"
            >
              <HelpCircle size={16} strokeWidth={2} aria-hidden />
              Войти, чтобы продолжить диалог
            </a>
          ) : null}
        </div>

        {/* Quick chips (FAQ shortcuts) */}
        {faqChips.length > 0 ? (
          <div className="shrink-0 border-t border-border bg-card px-3 pt-2 pb-1">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Частые темы:
              </span>
              {faqChips.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  disabled={busy}
                  onClick={() => void sendPrompt(c.text)}
                  className="shrink-0 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] font-semibold text-foreground transition hover:border-primary/30 hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                >
                  {c.title}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Composer */}
        <div className="shrink-0 border-t border-border bg-card px-3 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendPrompt(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Опишите вопрос…"
              className="flex-1 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary/40 focus:bg-card focus:ring-2 focus:ring-primary/25"
              maxLength={2000}
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy || input.trim().length === 0}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-lg shadow-primary/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Отправить"
            >
              {busy ? (
                <Loader2 size={18} strokeWidth={2} className="animate-spin" aria-hidden />
              ) : (
                <Send size={18} strokeWidth={2} aria-hidden />
              )}
            </button>
          </form>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            Ответы генерируются AI и не заменяют решения поддержки. Для жалоб и споров{' '}
            <a href="/support" className="font-semibold text-primary hover:underline">
              создайте обращение
            </a>
            .
          </p>
        </div>
      </div>

      {/* Локальная анимация — без добавления в globals.css */}
      <style jsx>{`
        @keyframes support-sheet-in {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
