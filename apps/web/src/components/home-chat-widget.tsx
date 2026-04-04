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
      className="fixed z-30 w-[min(100vw-1.5rem,360px)] overflow-hidden rounded-3xl border border-zinc-200/90 bg-zinc-50/80 shadow-xl shadow-zinc-300/40 backdrop-blur-md max-md:bottom-28 max-md:right-3 md:bottom-6 md:right-6 dark:border-zinc-700/80 dark:bg-zinc-950 dark:shadow-black/50"
      role="complementary"
      aria-label="Последние сообщения"
    >
      <div className={collapsed ? 'p-2.5' : 'p-2.5 pb-1.5'}>
        <div className="flex items-center justify-between gap-2.5 rounded-2xl bg-gradient-to-r from-sky-50 via-white to-cyan-50/95 px-3.5 py-3 shadow-sm ring-1 ring-sky-100/70 dark:from-sky-950/50 dark:via-zinc-900 dark:to-cyan-950/35 dark:ring-sky-900/40">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-md shadow-sky-500/30">
              <MessageCircle size={19} strokeWidth={1.8} className="text-white" aria-hidden />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Последние сообщения
              </div>
              <p className="truncate text-[11px] font-medium leading-snug text-zinc-500 dark:text-zinc-400">
                Быстрый ответ, как в чатах маркетплейсов
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-zinc-200/90 bg-white/90 text-zinc-600 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800 dark:border-zinc-600 dark:bg-zinc-800/90 dark:text-zinc-300 dark:hover:border-sky-600 dark:hover:bg-sky-950/60 dark:hover:text-sky-200"
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
            <div className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">Загрузка чатов…</div>
          ) : null}

          {status === 'need_auth' ? (
            <div className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
              Чтобы видеть сообщения, войдите в аккаунт —{' '}
              <Link href="/auth" className="font-semibold text-sky-600 underline decoration-sky-600/30 underline-offset-2 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300">
                войти
              </Link>
              .
            </div>
          ) : null}

          {status === 'error' ? (
            <div className="px-4 py-3 text-sm text-red-700 dark:text-red-400">
              Не удалось загрузить сообщения.
              <button
                type="button"
                onClick={() => void loadChats()}
                className="ml-2 font-semibold text-sky-600 underline decoration-sky-600/30 underline-offset-2 hover:text-sky-700 dark:text-sky-400"
              >
                Повторить
              </button>
            </div>
          ) : null}

          {status === 'ready' ? (
            <div className="space-y-3 px-2.5 pb-4 pt-1">
              {recent.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/90 px-3 py-3 text-sm leading-relaxed text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-400">
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
                            ? 'border-sky-300 bg-sky-50 ring-1 ring-sky-200 dark:border-sky-700 dark:bg-sky-950/40 dark:ring-sky-800'
                            : 'border-zinc-200/90 bg-white hover:border-sky-200/60 hover:bg-sky-50/50 dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:border-sky-800 dark:hover:bg-sky-950/25'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            {chat.listing?.title ?? 'Диалог'}
                          </div>
                          <div className="inline-flex shrink-0 items-center gap-1.5">
                            {chat.unreadCount > 0 ? (
                              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-red-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
                                {chat.unreadCount}
                              </span>
                            ) : null}
                            <div className="text-[10px] font-medium tabular-nums text-zinc-500 dark:text-zinc-400">
                              {formatTime(chat.updatedAt)}
                            </div>
                          </div>
                        </div>
                        <div className="mt-1 truncate text-xs text-zinc-600 dark:text-zinc-400">
                          {chat.lastMessage?.text ?? 'Сообщений пока нет'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedChat ? (
                <div className="rounded-2xl border border-zinc-200/90 bg-white/90 p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
                  <div className="mb-2 flex items-center gap-2 border-b border-zinc-200/80 pb-2 dark:border-zinc-700">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-zinc-200 text-xs font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                      {(selectedChat.peer?.name ?? selectedChat.peer?.email ?? '?').slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1 truncate text-xs font-bold text-zinc-800 dark:text-zinc-100">
                      {selectedChat.peer?.name ?? selectedChat.peer?.email ?? selectedChat.peer?.phone ?? 'Собеседник'}
                    </div>
                  </div>
                  <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto rounded-2xl border border-zinc-200/60 bg-zinc-50/80 p-2.5 dark:border-zinc-700 dark:bg-zinc-950/90">
                    {messages.length === 0 ? (
                      <div className="py-2 text-center text-xs text-zinc-500 dark:text-zinc-500">Сообщений пока нет</div>
                    ) : (
                      messages.slice(-8).map((m) => {
                        const fromPeer = m.senderId === selectedChat.peer?.id;
                        return (
                          <div key={m.id} className={`flex w-full ${fromPeer ? 'justify-start' : 'justify-end'}`}>
                            <div
                              className={`max-w-[88%] px-2.5 py-1.5 text-xs leading-snug ${
                                fromPeer
                                  ? 'rounded-2xl border border-zinc-200/80 bg-white text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100'
                                  : 'rounded-3xl bg-gradient-to-r from-sky-600 to-cyan-600 font-medium text-white shadow-sm shadow-sky-600/25'
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
                      className="h-10 min-w-0 flex-1 rounded-2xl border border-zinc-200 bg-white px-3 text-xs text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 dark:border-zinc-600 dark:bg-slate-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-cyan-500 dark:focus:ring-cyan-500/20"
                      placeholder="Ответить…"
                    />
                    <button
                      type="button"
                      onClick={() => void sendMessage()}
                      disabled={busy || text.trim().length === 0}
                      className="h-10 shrink-0 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-600 px-3.5 text-xs font-bold text-white shadow-md shadow-sky-600/25 transition hover:from-sky-700 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy ? '…' : 'Отпр.'}
                    </button>
                  </div>
                </div>
              ) : null}

              <Link
                href="/messages"
                className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 underline decoration-sky-600/25 underline-offset-2 transition hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300"
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
