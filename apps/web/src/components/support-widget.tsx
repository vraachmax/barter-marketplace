'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  ChevronUp,
  HelpCircle,
  LifeBuoy,
  Loader2,
  Send,
  X,
} from 'lucide-react';
import { apiFetchJson, type SupportTemplate } from '@/lib/api';

type Tab = 'faq' | 'ticket';

type TicketState = {
  topic: string;
  message: string;
  contact: string;
};

const EMPTY_TICKET: TicketState = { topic: '', message: '', contact: '' };

export function SupportWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('faq');
  const [faq, setFaq] = useState<SupportTemplate[]>([]);
  const [faqLoaded, setFaqLoaded] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [ticket, setTicket] = useState<TicketState>(EMPTY_TICKET);
  const [sending, setSending] = useState(false);
  const [sentOk, setSentOk] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const loadFaq = useCallback(async () => {
    const res = await apiFetchJson<SupportTemplate[]>('/support/faq');
    if (res.ok) {
      setFaq(res.data);
    }
    setFaqLoaded(true);
  }, []);

  useEffect(() => {
    if (!open || faqLoaded) return;
    void loadFaq();
  }, [open, faqLoaded, loadFaq]);

  // Скрываем виджет на страницах, где он мешает (например, в /messages)
  if (pathname?.startsWith('/messages')) return null;
  if (pathname?.startsWith('/auth')) return null;

  async function sendTicket() {
    if (sending) return;
    const topic = ticket.topic.trim();
    const message = ticket.message.trim();
    const contact = ticket.contact.trim();
    if (!topic || !message) {
      setSendError('Укажите тему и сообщение');
      return;
    }
    setSending(true);
    setSendError(null);
    const res = await apiFetchJson<{ id: string }>('/support/tickets', {
      method: 'POST',
      body: JSON.stringify({ topic, message, contact: contact || undefined }),
    });
    setSending(false);
    if (res.ok) {
      setSentOk(true);
      setTicket(EMPTY_TICKET);
    } else {
      setSendError(res.message ?? 'Не удалось отправить обращение');
    }
  }

  return (
    <>
      {/* Floating button — bottom-left на десктопе */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Закрыть помощь' : 'Открыть помощь'}
        className="group fixed bottom-20 left-4 z-[9999] hidden h-[52px] w-[52px] items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary text-white shadow-lg shadow-primary/30 transition hover:scale-[1.03] active:scale-[0.97] md:flex"
        style={{ transition: 'transform .2s ease' }}
      >
        {open ? (
          <X size={22} strokeWidth={2.2} aria-hidden />
        ) : (
          <LifeBuoy size={22} strokeWidth={2} aria-hidden />
        )}
      </button>

      {/* Popup panel */}
      <div
        role="dialog"
        aria-label="Поддержка"
        className={`fixed z-[9998] hidden flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl transition md:flex ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        style={{
          bottom: 142,
          left: 16,
          width: 360,
          maxHeight: 520,
          transform: open ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(20px)',
          transformOrigin: 'bottom left',
          transitionProperty: 'opacity, transform',
          transitionDuration: '.25s',
          transitionTimingFunction: 'cubic-bezier(.34,1.56,.64,1)',
        }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-2 bg-gradient-to-br from-primary to-accent px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur-sm">
              <LifeBuoy size={18} strokeWidth={2} aria-hidden />
            </div>
            <div>
              <div className="text-sm font-bold leading-tight">Поддержка Бартер</div>
              <div className="text-[11px] text-white/80">Поможем за пару минут</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Закрыть"
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 border-b border-border">
          <button
            type="button"
            onClick={() => setTab('faq')}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold transition ${
              tab === 'faq'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted/50'
            }`}
          >
            <HelpCircle size={14} strokeWidth={2} aria-hidden />
            Частые вопросы
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('ticket');
              setSentOk(false);
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold transition ${
              tab === 'ticket'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted/50'
            }`}
          >
            <Send size={14} strokeWidth={2} aria-hidden />
            Написать нам
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {tab === 'faq' ? (
            <div className="p-3">
              {!faqLoaded ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 size={18} strokeWidth={2} className="animate-spin" aria-hidden />
                </div>
              ) : faq.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-xs text-muted-foreground">
                  Пока нет опубликованных вопросов.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {faq.map((item) => {
                    const isExp = expanded === item.code;
                    return (
                      <li key={item.code} className="overflow-hidden rounded-xl border border-border bg-muted/30">
                        <button
                          type="button"
                          onClick={() => setExpanded((prev) => (prev === item.code ? null : item.code))}
                          className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-[13px] font-semibold text-foreground transition hover:bg-muted/50"
                        >
                          <span className="flex-1">{item.title}</span>
                          {isExp ? (
                            <ChevronUp size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
                          ) : (
                            <ChevronDown size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
                          )}
                        </button>
                        {isExp ? (
                          <div className="border-t border-border bg-card px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
                            {item.text}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="mt-4 rounded-xl bg-primary/5 p-3 text-center">
                <p className="text-[12px] text-muted-foreground">
                  Не нашли ответ?
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setTab('ticket');
                    setSentOk(false);
                  }}
                  className="mt-1.5 text-[12px] font-semibold text-primary hover:underline"
                >
                  Написать в поддержку →
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3">
              {sentOk ? (
                <div className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-center">
                  <div className="text-sm font-bold text-accent">Обращение отправлено</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ответим в течение рабочего дня. Проверьте указанный контакт.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSentOk(false)}
                    className="mt-3 text-xs font-semibold text-primary hover:underline"
                  >
                    Отправить ещё
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void sendTicket();
                  }}
                  className="space-y-2.5"
                >
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Тема
                    </label>
                    <input
                      type="text"
                      value={ticket.topic}
                      onChange={(e) => setTicket((p) => ({ ...p, topic: e.target.value }))}
                      placeholder="Коротко, в чём вопрос"
                      className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-[13px] outline-none transition focus:border-primary/40 focus:bg-card focus:ring-2 focus:ring-primary/20"
                      maxLength={120}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Сообщение
                    </label>
                    <textarea
                      value={ticket.message}
                      onChange={(e) => setTicket((p) => ({ ...p, message: e.target.value }))}
                      placeholder="Опишите ситуацию подробнее"
                      rows={5}
                      className="w-full resize-none rounded-xl border border-border bg-muted/30 px-3 py-2 text-[13px] outline-none transition focus:border-primary/40 focus:bg-card focus:ring-2 focus:ring-primary/20"
                      maxLength={2000}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Контакт для ответа{' '}
                      <span className="font-normal normal-case text-muted-foreground/60">(email / телефон)</span>
                    </label>
                    <input
                      type="text"
                      value={ticket.contact}
                      onChange={(e) => setTicket((p) => ({ ...p, contact: e.target.value }))}
                      placeholder="Необязательно, если вы вошли"
                      className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-[13px] outline-none transition focus:border-primary/40 focus:bg-card focus:ring-2 focus:ring-primary/20"
                      maxLength={160}
                    />
                  </div>
                  {sendError ? (
                    <div className="rounded-lg bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
                      {sendError}
                    </div>
                  ) : null}
                  <button
                    type="submit"
                    disabled={sending}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white shadow-md shadow-primary/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sending ? (
                      <Loader2 size={16} strokeWidth={2} className="animate-spin" aria-hidden />
                    ) : (
                      <Send size={16} strokeWidth={2} aria-hidden />
                    )}
                    Отправить
                  </button>
                  <p className="text-center text-[10px] text-muted-foreground">
                    Нажимая «Отправить», вы соглашаетесь с политикой обработки обращений.
                  </p>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
