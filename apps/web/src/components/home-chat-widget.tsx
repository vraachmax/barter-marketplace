'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';
import { SOCKET_URL, apiFetchJson, type ChatMessage, type ChatSummary } from '@/lib/api';

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HomeChatWidget() {
  const [collapsed, setCollapsed] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'need_auth' | 'error'>('loading');
  const [items, setItems] = useState<ChatSummary[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const selectedChatIdRef = useRef<string>('');

  function joinLoadedChats(list: ChatSummary[]) {
    const socket = socketRef.current;
    if (!socket) return;
    for (const c of list) {
      socket.emit('join-chat', { chatId: c.id });
    }
  }

  async function loadChats() {
    const res = await apiFetchJson<ChatSummary[]>('/chats');
    if (!res.ok) {
      if (res.status === 401) {
        setStatus('need_auth');
        return;
      }
      setStatus('error');
      return;
    }
    setItems(res.data);
    joinLoadedChats(res.data);
    setStatus('ready');
  }

  async function loadMessages(chatId: string) {
    const res = await apiFetchJson<ChatMessage[]>(`/chats/${chatId}/messages`);
    if (!res.ok) return;
    setMessages(res.data);
  }

  async function sendMessage() {
    if (!selectedChatId || text.trim().length === 0 || busy) return;
    setBusy(true);
    const payload = text.trim();
    const res = await apiFetchJson<ChatMessage>(`/chats/${selectedChatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text: payload }),
    });
    setBusy(false);
    if (!res.ok) return;
    setText('');
    await Promise.all([loadMessages(selectedChatId), loadChats()]);
  }

  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      withCredentials: true,
    });
    socketRef.current = socket;
    socket.on(
      'message-created',
      (incoming: ChatMessage & { chatId: string }) => {
        if (incoming.chatId === selectedChatIdRef.current) {
          void loadMessages(incoming.chatId);
        }
        void loadChats();
      },
    );

    void loadChats();

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (status !== 'ready') return;
    if (!selectedChatId && items[0]?.id) {
      setSelectedChatId(items[0].id);
    }
    if (selectedChatId && !items.some((x) => x.id === selectedChatId)) {
      setSelectedChatId(items[0]?.id ?? '');
    }
  }, [items, selectedChatId, status]);

  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedChatId);
    socketRef.current?.emit('join-chat', { chatId: selectedChatId });
  }, [selectedChatId]);

  const recent = useMemo(() => items.slice(0, 3), [items]);
  const selectedChat = useMemo(
    () => recent.find((x) => x.id === selectedChatId) ?? items.find((x) => x.id === selectedChatId) ?? null,
    [items, recent, selectedChatId],
  );

  return (
    <div
      className="fixed z-30 w-[min(100vw-1.5rem,360px)] overflow-hidden rounded-3xl border border-border bg-muted/50 shadow-xl backdrop-blur-md max-md:bottom-28 max-md:right-3 md:bottom-6 md:right-6"
      role="complementary"
      aria-label="Последние сообщения"
    >
      <div className={collapsed ? 'p-2.5' : 'p-2.5 pb-1.5'}>
        <div className="flex items-center justify-between gap-2.5 rounded-2xl bg-primary via-white px-3.5 py-3 shadow-sm ring-1 ring-primary/30">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary text-white shadow-md shadow-primary/20">
              <MessageCircle size={19} strokeWidth={1.8} className="text-white" aria-hidden />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold tracking-tight text-foreground">
                Последние сообщения
              </div>
              <p className="truncate text-[11px] font-medium leading-snug text-muted-foreground">
                Быстрый ответ, как в чатах маркетплейсов
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-border bg-card/90 text-muted-foreground shadow-sm transition hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Развернуть' : 'Свернуть'}
          >
            {collapsed ? <ChevronUp size={18} strokeWidth={1.8} aria-hidden /> : <ChevronDown size={18} strokeWidth={1.8} aria-hidden />}
          </button>
        </div>
      </div>

      {collapsed ? null : (
        <>
          {status === 'loading' ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">Загрузка чатов…</div>
          ) : null}

          {status === 'need_auth' ? (
            <div className="px-4 py-3 text-sm text-foreground">
              Чтобы видеть сообщения, войдите в аккаунт —{' '}
              <Link href="/auth" className="font-semibold text-primary underline underline-offset-2 hover:text-primary">
                войти
              </Link>
              .
            </div>
          ) : null}

          {status === 'error' ? (
            <div className="px-4 py-3 text-sm text-destructive">
              Не удалось загрузить сообщения.
              <button
                type="button"
                onClick={() => void loadChats()}
                className="ml-2 font-semibold text-primary underline underline-offset-2 hover:text-primary"
              >
                Повторить
              </button>
            </div>
          ) : null}

          {status === 'ready' ? (
            <div className="space-y-3 px-2.5 pb-4 pt-1">
              {recent.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/90 px-3 py-3 text-sm leading-relaxed text-muted-foreground">
                  Пока нет диалогов. Откройте объявление и напишите продавцу.
                </div>
              ) : (
                <div className="space-y-2">
                  {recent.map((chat) => {
                    const active = selectedChatId === chat.id;
                    return (
                      <button
                        key={chat.id}
                        type="button"
                        onClick={() => setSelectedChatId(chat.id)}
                        className={`block w-full rounded-2xl border px-3 py-2.5 text-left shadow-sm transition ${
 active
 ? 'border-primary/30 bg-primary/10 ring-1 ring-primary/30'
 : 'border-border bg-card hover:border-primary/30 hover:bg-primary/10'
 }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate text-xs font-bold text-foreground">
                            {chat.listing?.title ?? 'Диалог'}
                          </div>
                          <div className="inline-flex shrink-0 items-center gap-1.5">
                            {chat.unreadCount > 0 ? (
                              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white shadow-sm">
                                {chat.unreadCount}
                              </span>
                            ) : null}
                            <div className="text-[10px] font-medium tabular-nums text-muted-foreground">
                              {formatTime(chat.updatedAt)}
                            </div>
                          </div>
                        </div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">
                          {chat.lastMessage?.text ?? 'Сообщений пока нет'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedChat ? (
                <div className="rounded-2xl border border-border bg-card/90 p-3 shadow-sm">
                  <div className="mb-2 flex items-center gap-2 border-b border-border pb-2">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted text-xs font-bold text-foreground">
                      {(selectedChat.peer?.name ?? selectedChat.peer?.email ?? '?').slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1 truncate text-xs font-bold text-foreground">
                      {selectedChat.peer?.name ?? selectedChat.peer?.email ?? selectedChat.peer?.phone ?? 'Собеседник'}
                    </div>
                  </div>
                  <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto rounded-2xl border border-border bg-muted/50 p-2.5">
                    {messages.length === 0 ? (
                      <div className="py-2 text-center text-xs text-muted-foreground">Сообщений пока нет</div>
                    ) : (
                      messages.slice(-8).map((m) => {
                        const fromPeer = m.senderId === selectedChat.peer?.id;
                        return (
                          <div key={m.id} className={`flex w-full ${fromPeer ? 'justify-start' : 'justify-end'}`}>
                            <div
                              className={`max-w-[88%] px-2.5 py-1.5 text-xs leading-snug ${
 fromPeer
 ? 'rounded-2xl border border-border bg-card text-foreground'
 : 'rounded-3xl bg-primary font-medium text-white shadow-sm shadow-primary/20'
 }`}
                            >
                              {m.text}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="mt-2.5 flex gap-2">
                    <input
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void sendMessage();
                      }}
                      className="h-10 min-w-0 flex-1 rounded-2xl border border-border bg-card px-3 text-xs text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus:border-primary/30 focus:ring-2 focus:ring-primary/30"
                      placeholder="Ответить…"
                    />
                    <button
                      type="button"
                      onClick={() => void sendMessage()}
                      disabled={busy || text.trim().length === 0}
                      className="h-10 shrink-0 rounded-2xl bg-primary px-3.5 text-xs font-bold text-white shadow-md shadow-primary/20 transition disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy ? '…' : 'Отпр.'}
                    </button>
                  </div>
                </div>
              ) : null}

              <Link
                href="/messages"
                className="inline-flex items-center gap-1 text-xs font-bold text-primary underline underline-offset-2 transition hover:text-primary"
              >
                Открыть все сообщения
              </Link>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
