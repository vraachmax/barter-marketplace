'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle,
  ChevronLeft,
  Link2,
  Mail,
  MessageCircle,
  Search,
  SlidersHorizontal,
  Sparkles,
  Store,
} from 'lucide-react';
import { io, type Socket } from 'socket.io-client';
import {
  API_URL,
  apiFetchJson,
  apiUploadFile,
  type ChatMessage,
  type ChatSummary,
  SOCKET_URL,
} from '@/lib/api';

function resolveAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_URL}${url}`;
}

function peerInitials(peer: ChatSummary['peer']): string {
  const raw = peer?.name?.trim() || peer?.email?.trim() || peer?.phone?.trim() || '';
  if (!raw) return '?';
  const parts = raw.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? '';
  const b = parts[1]?.[0] ?? '';
  return (a + b).toUpperCase() || a.toUpperCase() || '?';
}

function formatListTime(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export default function MessagesPage() {
  const [listingId, setListingId] = useState<string | null>(null);
  const [preferredChatId, setPreferredChatId] = useState<string | null>(null);

  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'loading' | 'need_auth' | 'ready' | 'error'>('loading');
  const [busy, setBusy] = useState(false);
  const [onlineByUserId, setOnlineByUserId] = useState<Record<string, boolean>>({});
  const [lastSeenByUserId, setLastSeenByUserId] = useState<Record<string, string>>({});
  const [peerTyping, setPeerTyping] = useState(false);
  const [listQuery, setListQuery] = useState('');
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const selectedChatIdRef = useRef<string>('');
  const chatsRef = useRef<ChatSummary[]>([]);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerTypingResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  function joinLoadedChats(list: ChatSummary[]) {
    const socket = socketRef.current;
    if (!socket) return;
    for (const c of list) {
      socket.emit('join-chat', { chatId: c.id });
    }
  }

  const selectedChat = useMemo(
    () => chats.find((c) => c.id === selectedChatId) ?? null,
    [chats, selectedChatId],
  );

  const filteredChats = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((c) => {
      const title = (c.listing?.title ?? '').toLowerCase();
      const peer =
        `${c.peer?.name ?? ''} ${c.peer?.email ?? ''} ${c.peer?.phone ?? ''}`.toLowerCase();
      const last = (c.lastMessage?.text ?? '').toLowerCase();
      return title.includes(q) || peer.includes(q) || last.includes(q);
    });
  }, [chats, listQuery]);

  const totalUnread = useMemo(() => chats.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0), [chats]);

  const peerStatus = useMemo(() => {
    const peerId = selectedChat?.peer?.id;
    if (!peerId) return '';
    if (peerTyping) return 'печатает…';
    if (onlineByUserId[peerId]) return 'в сети';
    const seen = lastSeenByUserId[peerId];
    if (!seen) return 'не в сети';
    return `был(а) ${new Date(seen).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
  }, [lastSeenByUserId, onlineByUserId, peerTyping, selectedChat?.peer?.id]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    setPeerTyping(false);
  }, [selectedChatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedChatId, scrollToBottom]);

  function emitTyping(isTyping: boolean) {
    if (!selectedChatIdRef.current) return;
    socketRef.current?.emit('typing', { chatId: selectedChatIdRef.current, isTyping });
  }

  async function loadChats() {
    const res = await apiFetchJson<ChatSummary[]>('/chats');
    if (!res.ok) {
      if (res.status === 401) {
        setStatus('need_auth');
        return [];
      }
      setStatus('error');
      return [];
    }
    setChats(res.data);
    joinLoadedChats(res.data);
    setStatus('ready');
    return res.data;
  }

  async function openByListing(maybeListingId: string) {
    const res = await apiFetchJson<{ id: string }>(`/chats/by-listing/${maybeListingId}`, {
      method: 'POST',
    });
    if (!res.ok) return null;
    return res.data.id;
  }

  async function loadMessages(chatId: string) {
    const res = await apiFetchJson<ChatMessage[]>(`/chats/${chatId}/messages`);
    if (!res.ok) return;
    setMessages(res.data);
  }

  async function sendMessage() {
    if (!selectedChatId || text.trim().length === 0 || busy) return;
    setBusy(true);
    const currentText = text.trim();
    const res = await apiFetchJson<ChatMessage>(`/chats/${selectedChatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text: currentText }),
    });
    setBusy(false);
    if (res.ok) {
      setMessages((prev) => (prev.some((x) => x.id === res.data.id) ? prev : [...prev, res.data]));
      setText('');
      emitTyping(false);
    }
    const updated = await loadChats();
    if (updated.length > 0 && !updated.some((c) => c.id === selectedChatId)) {
      setSelectedChatId(updated[0].id);
    }
  }

  async function sendAttachment() {
    if (!selectedChatId || !selectedFile || busy) return;
    setBusy(true);
    const res = await apiUploadFile(`/chats/${selectedChatId}/media`, selectedFile, 'file', {
      text: text.trim(),
    });
    setBusy(false);
    if (!res.ok) return;
    setText('');
    setSelectedFile(null);
    await Promise.all([loadMessages(selectedChatId), loadChats()]);
  }

  function selectChat(id: string) {
    setSelectedChatId(id);
    setMobileThreadOpen(true);
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const qp = new URLSearchParams(window.location.search);
    setListingId(qp.get('listingId'));
    setPreferredChatId(qp.get('chatId'));
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      withCredentials: true,
    });
    socketRef.current = socket;
    socket.on(
      'message-created',
      (incoming: ChatMessage & { chatId: string }) => {
        if (incoming.chatId === selectedChatIdRef.current) {
          setMessages((prev) =>
            prev.some((x) => x.id === incoming.id) ? prev : [...prev, { ...incoming }],
          );
          void loadMessages(incoming.chatId);
        }
        void loadChats();
      },
    );
    socket.on('presence-snapshot', (payload: { onlineUserIds?: string[]; lastSeenByUser?: Record<string, string> } | null | undefined) => {
      if (!payload) return;
      const onlineMap: Record<string, boolean> = {};
      for (const id of payload.onlineUserIds ?? []) onlineMap[id] = true;
      setOnlineByUserId(onlineMap);
      setLastSeenByUserId(payload.lastSeenByUser ?? {});
    });
    socket.on('presence-changed', (payload: { userId: string; online: boolean; lastSeenAt?: string }) => {
      if (!payload?.userId) return;
      setOnlineByUserId((prev) => ({ ...prev, [payload.userId]: payload.online }));
      if (!payload.online && payload.lastSeenAt) {
        setLastSeenByUserId((prev) => ({ ...prev, [payload.userId]: payload.lastSeenAt! }));
      }
    });
    socket.on('typing-changed', (payload: { chatId: string; userId: string; isTyping: boolean }) => {
      if (!payload || payload.chatId !== selectedChatIdRef.current) return;
      const peerId = chatsRef.current.find((c) => c.id === selectedChatIdRef.current)?.peer?.id;
      if (!peerId || payload.userId !== peerId) return;
      setPeerTyping(Boolean(payload.isTyping));
      if (peerTypingResetTimerRef.current) clearTimeout(peerTypingResetTimerRef.current);
      peerTypingResetTimerRef.current = setTimeout(() => setPeerTyping(false), 2500);
    });
    socket.on('chat-read', (payload: { chatId: string; userId: string }) => {
      if (!payload || payload.chatId !== selectedChatIdRef.current) return;
      const peerId = chatsRef.current.find((c) => c.id === selectedChatIdRef.current)?.peer?.id;
      if (!peerId || payload.userId !== peerId) return;
      void loadMessages(payload.chatId);
      void loadChats();
    });

    return () => {
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
      if (peerTypingResetTimerRef.current) clearTimeout(peerTypingResetTimerRef.current);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const list = await loadChats();
      if (!alive) return;

      let targetChatId =
        preferredChatId && list.some((c) => c.id === preferredChatId) ? preferredChatId : list[0]?.id ?? '';
      if (listingId) {
        const createdId = await openByListing(listingId);
        if (createdId) {
          const updated = await loadChats();
          targetChatId = createdId || updated[0]?.id || '';
        }
      }
      if (targetChatId) {
        setSelectedChatId(targetChatId);
        await loadMessages(targetChatId);
        if (listingId || preferredChatId) {
          setMobileThreadOpen(true);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [listingId, preferredChatId]);

  useEffect(() => {
    if (!selectedChatId) return;
    void (async () => {
      await loadMessages(selectedChatId);
      await loadChats();
    })();
    socketRef.current?.emit('join-chat', { chatId: selectedChatId });
    socketRef.current?.emit('read-chat', { chatId: selectedChatId });
    return () => {
      emitTyping(false);
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    };
  }, [selectedChatId]);

  if (status === 'need_auth') {
    return (
      <div className="min-h-screen bg-zinc-100 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/95">
          <div className="mx-auto max-w-lg px-4 py-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-sky-700 dark:text-zinc-400 dark:hover:text-sky-400"
            >
              <ChevronLeft size={20} strokeWidth={1.8} aria-hidden />
              На главную
            </Link>
          </div>
        </div>
        <div className="mx-auto max-w-lg px-4 py-10">
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-black/30">
            <div className="border-b border-zinc-100 bg-gradient-to-r from-sky-50 to-cyan-50 px-6 py-8 text-center dark:border-zinc-800 dark:from-sky-950/50 dark:to-cyan-950/40">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white shadow-md ring-1 ring-sky-100 dark:bg-zinc-900 dark:ring-sky-900/50">
                <MessageCircle size={36} strokeWidth={1.8} aria-hidden />
              </div>
              <h1 className="mt-4 text-xl font-bold text-zinc-900 dark:text-zinc-100">Сообщения</h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Войдите, чтобы переписываться с продавцами и покупателями.</p>
            </div>
            <div className="p-6">
              <Link
                href="/auth"
                className="flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 text-sm font-semibold text-white shadow-lg shadow-sky-600/20 hover:from-sky-700 hover:to-cyan-700"
              >
                Войти или зарегистрироваться
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const listingHref = selectedChat?.listing?.id ? `/listing/${selectedChat.listing.id}` : null;
  const previewSrc = resolveAssetUrl(selectedChat?.listing?.previewImageUrl ?? null);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-zinc-200/80 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
      {/* Top bar — desktop */}
      <header className="hidden shrink-0 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/95 md:block">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-sm">
              <MessageCircle size={20} strokeWidth={1.8} aria-hidden />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight text-zinc-900 dark:text-zinc-100">Сообщения</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Чаты по объявлениям</p>
            </div>
            {totalUnread > 0 ? (
              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white dark:bg-rose-600">{totalUnread}</span>
            ) : null}
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-zinc-500 transition hover:text-sky-700 dark:text-zinc-400 dark:hover:text-sky-400"
          >
            На главную
          </Link>
        </div>
      </header>

      {/* Main split */}
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col md:my-4 md:min-h-[calc(100dvh-4.5rem)] md:max-h-[calc(100dvh-4.5rem)] md:flex-row md:gap-0 md:overflow-hidden md:rounded-2xl md:border md:border-zinc-200 md:bg-white md:shadow-xl dark:md:border-zinc-800 dark:md:bg-zinc-900/90 dark:md:shadow-black/40">
        {/* Sidebar — chat list */}
        <aside
          className={`flex min-h-0 w-full flex-col border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:w-[min(100%,380px)] md:shrink-0 md:border-r ${
            mobileThreadOpen ? 'hidden md:flex' : 'flex flex-1 md:flex-none'
          }`}
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-100 px-4 dark:border-zinc-800 md:hidden">
            <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
              <MessageCircle size={22} strokeWidth={1.8} aria-hidden />
              Чаты
              {totalUnread > 0 ? (
                <span className="rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white dark:bg-rose-600">{totalUnread}</span>
              ) : null}
            </div>
            <Link href="/" className="text-xs font-medium text-sky-700 dark:text-sky-400">
              Главная
            </Link>
          </div>

          <div className="border-b border-zinc-100 p-3 dark:border-zinc-800">
            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2">
                <Search size={16} strokeWidth={1.8} className="opacity-60" aria-hidden />
              </span>
              <input
                type="search"
                value={listQuery}
                onChange={(e) => setListQuery(e.target.value)}
                placeholder="Поиск по чатам…"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-sky-500 dark:focus:bg-zinc-900"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {status === 'loading' ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-zinc-500 dark:text-zinc-400">
                <span className="inline-block size-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent dark:border-cyan-400 dark:border-t-transparent" aria-hidden />
                Загрузка диалогов…
              </div>
            ) : null}
            {status === 'error' ? (
              <div className="p-4 text-center text-sm text-red-600 dark:text-rose-400">Не удалось загрузить чаты</div>
            ) : null}

            <ul className="p-2">
              {filteredChats.map((c) => {
                const active = c.id === selectedChatId;
                const img = resolveAssetUrl(c.listing?.previewImageUrl ?? null);
                const peer = c.peer;
                const unread = c.unreadCount > 0;
                return (
                  <li key={c.id} className="mb-1">
                    <button
                      type="button"
                      onClick={() => selectChat(c.id)}
                      className={`flex w-full gap-3 rounded-xl p-2.5 text-left transition ${
                        active
                          ? 'bg-sky-50 ring-1 ring-sky-200/80 dark:bg-sky-950/40 dark:ring-sky-800/60'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-900'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className="listing-thumb-wrap h-14 w-14 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt="" className="listing-thumb-img h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                              <Store size={24} strokeWidth={1.8} aria-hidden />
                            </div>
                          )}
                        </div>
                        {unread ? (
                          <span className="absolute -right-0.5 -top-0.5 h-4 min-w-4 rounded-full bg-sky-600 px-1 text-center text-[10px] font-bold leading-4 text-white">
                            {c.unreadCount > 9 ? '9+' : c.unreadCount}
                          </span>
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`line-clamp-1 text-sm ${
                              unread
                                ? 'font-bold text-zinc-900 dark:text-zinc-100'
                                : 'font-semibold text-zinc-800 dark:text-zinc-200'
                            }`}
                          >
                            {c.listing?.title ?? 'Без объявления'}
                          </span>
                          <span className="shrink-0 text-[11px] text-zinc-400 dark:text-zinc-500">
                            {formatListTime(c.lastMessage?.createdAt ?? c.updatedAt)}
                          </span>
                        </div>
                        <div className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {peer?.name ?? peer?.email ?? peer?.phone ?? 'Собеседник'}
                        </div>
                        <div
                          className={`mt-0.5 line-clamp-2 text-xs ${
                            unread ? 'font-medium text-zinc-700 dark:text-zinc-300' : 'text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {c.lastMessage?.text?.trim() ? c.lastMessage.text : 'Нет сообщений'}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            {chats.length === 0 && status === 'ready' ? (
              <div className="mx-4 mt-6 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 p-6 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
                <MessageCircle size={44} strokeWidth={1.8} className="mx-auto opacity-35" aria-hidden />
                <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-200">Пока нет диалогов</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Откройте объявление и нажмите «Написать в чат», чтобы начать переписку.
                </p>
                <Link
                  href="/"
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-600/25 hover:from-sky-700 hover:to-cyan-700"
                >
                  К объявлениям
                </Link>
              </div>
            ) : null}

            {filteredChats.length === 0 && chats.length > 0 && status === 'ready' ? (
              <div className="p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">Ничего не найдено</div>
            ) : null}
          </div>
        </aside>

        {/* Thread */}
        <section
          className={`flex min-h-0 min-w-0 flex-1 flex-col bg-zinc-100 md:bg-gradient-to-b md:from-zinc-50 md:to-sky-50/30 dark:bg-zinc-950 dark:md:from-zinc-950 dark:md:to-sky-950/20 ${
            mobileThreadOpen ? 'flex flex-1' : 'hidden md:flex'
          }`}
        >
          {!selectedChat ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="grid h-20 w-20 place-items-center rounded-3xl bg-white shadow-md ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
                <MessageCircle size={44} strokeWidth={1.8} className="opacity-50" aria-hidden />
              </div>
              <p className="max-w-xs text-sm font-medium text-zinc-600 dark:text-zinc-300">Выберите диалог в списке слева</p>
              <p className="max-w-xs text-xs text-zinc-400 dark:text-zinc-500">Или откройте чат из карточки объявления</p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="flex shrink-0 items-center gap-3 border-b border-zinc-200/80 bg-white/90 px-3 py-2.5 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90 md:px-4">
                <button
                  type="button"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 md:hidden"
                  onClick={() => setMobileThreadOpen(false)}
                  aria-label="Назад к списку"
                >
                  <ChevronLeft size={22} strokeWidth={1.8} aria-hidden />
                </button>
                <div className="listing-thumb-wrap h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
                  {previewSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewSrc} alt="" className="listing-thumb-img h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                      <Store size={22} strokeWidth={1.8} aria-hidden />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {selectedChat.listing?.title ?? 'Диалог'}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="inline-flex items-center gap-1">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          peerTyping
                            ? 'animate-pulse bg-sky-500'
                            : selectedChat.peer?.id && onlineByUserId[selectedChat.peer.id]
                              ? 'bg-emerald-500'
                              : 'bg-zinc-300 dark:bg-zinc-600'
                        }`}
                      />
                      {selectedChat.peer?.name ?? selectedChat.peer?.email ?? 'Собеседник'}
                    </span>
                    <span className="text-zinc-300 dark:text-zinc-600">·</span>
                    <span className={peerTyping ? 'font-medium text-sky-600 dark:text-sky-400' : ''}>{peerStatus}</span>
                  </div>
                </div>
                {listingHref ? (
                  <Link
                    href={listingHref}
                    className="hidden shrink-0 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-sky-400 dark:hover:bg-sky-950/50 sm:inline-flex"
                  >
                    <Link2 size={16} strokeWidth={1.8} aria-hidden />
                    Объявление
                  </Link>
                ) : null}
                <button
                  type="button"
                  className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 md:grid"
                  aria-label="Меню"
                >
                  <SlidersHorizontal size={20} strokeWidth={1.8} aria-hidden />
                </button>
              </div>

              {listingHref ? (
                <Link
                  href={listingHref}
                  className="flex shrink-0 items-center justify-center gap-2 border-b border-zinc-100 bg-white py-2 text-xs font-semibold text-sky-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-sky-400 sm:hidden"
                >
                  <Link2 size={14} strokeWidth={1.8} aria-hidden />
                  Открыть объявление
                </Link>
              ) : null}

              {/* Messages */}
              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-5">
                <div className="mx-auto max-w-3xl space-y-3">
                  {messages.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/60 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
                      Напишите первое сообщение — обычно отвечают быстрее, если указать удобное время связи.
                    </div>
                  ) : null}
                  {messages.map((m) => {
                    if (m.isAssistant) {
                      return (
                        <div key={m.id} className="flex justify-center px-1">
                          <div className="max-w-[min(100%,560px)] rounded-2xl border border-violet-200/90 bg-gradient-to-br from-violet-50/95 to-sky-50/90 px-4 py-3 text-sm text-violet-950 shadow-sm dark:border-violet-900/50 dark:from-violet-950/50 dark:to-sky-950/40 dark:text-violet-100">
                            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                              <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-600 text-white shadow-sm">
                                <Sparkles size={16} strokeWidth={1.8} aria-hidden />
                              </span>
                              Помощник площадки
                            </div>
                            {m.text ? (
                              <div className="whitespace-pre-wrap leading-relaxed text-violet-900/95 dark:text-violet-100/95">
                                {m.text}
                              </div>
                            ) : null}
                            <div className="mt-2 text-right text-[10px] text-violet-600/80 dark:text-violet-400/80">
                              {new Date(m.createdAt).toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    const isPeer = m.senderId === selectedChat.peer?.id;
                    const mediaFull = resolveAssetUrl(m.mediaUrl);
                    return (
                      <div key={m.id} className={`flex ${isPeer ? 'justify-start' : 'justify-end'}`}>
                        <div
                          className={`flex max-w-[min(100%,520px)] gap-2 ${isPeer ? 'flex-row' : 'flex-row-reverse'}`}
                        >
                          {isPeer ? (
                            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 text-[11px] font-bold text-zinc-700 dark:from-zinc-700 dark:to-zinc-600 dark:text-zinc-100">
                              {peerInitials(selectedChat.peer)}
                            </div>
                          ) : (
                            <div className="mt-1 h-8 w-8 shrink-0" aria-hidden />
                          )}
                          <div
                            className={`min-w-0 rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                              isPeer
                                ? 'rounded-tl-md border border-zinc-100 bg-white text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'
                                : 'rounded-tr-md bg-gradient-to-br from-sky-600 to-cyan-600 text-white'
                            }`}
                          >
                            {mediaFull ? (
                              <div
                                className={`mb-2 overflow-hidden rounded-xl ${isPeer ? 'border border-zinc-100' : 'border border-white/20'}`}
                              >
                                {m.mediaType === 'VIDEO' ? (
                                  <video src={mediaFull} controls className="max-h-64 w-full object-contain" />
                                ) : (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={mediaFull} alt="Вложение" className="max-h-64 w-full object-contain" />
                                )}
                              </div>
                            ) : null}
                            {m.text ? <div className="break-words whitespace-pre-wrap leading-relaxed">{m.text}</div> : null}
                            <div
                              className={`mt-1.5 flex items-center gap-2 text-[10px] ${
                                isPeer ? 'justify-end text-zinc-400 dark:text-zinc-500' : 'justify-end text-white/80'
                              }`}
                            >
                              <span>
                                {new Date(m.createdAt).toLocaleTimeString('ru-RU', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {!isPeer ? (
                                m.isReadByPeer ? (
                                  <CheckCircle size={14} strokeWidth={1.8} className="text-sky-100" aria-hidden />
                                ) : (
                                  <CheckCircle size={14} strokeWidth={1.8} className="opacity-70" aria-hidden />
                                )
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Composer */}
              <div className="shrink-0 border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950 md:p-4">
                {selectedFile ? (
                  <div className="mb-2 flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs dark:border-sky-800 dark:bg-sky-950/40">
                    <Camera size={18} strokeWidth={1.8} className="shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1 truncate font-medium text-sky-900 dark:text-sky-100">{selectedFile.name}</span>
                    <button
                      type="button"
                      className="shrink-0 rounded-lg px-2 py-1 font-semibold text-sky-800 hover:bg-sky-100 dark:text-sky-200 dark:hover:bg-sky-900/50"
                      onClick={() => setSelectedFile(null)}
                    >
                      Убрать
                    </button>
                  </div>
                ) : null}
                <div className="mx-auto flex max-w-3xl items-end gap-2">
                  <label className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-sky-600 dark:hover:bg-sky-950/50 dark:hover:text-sky-300">
                    <Link2 size={20} strokeWidth={1.8} aria-hidden />
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <textarea
                    ref={composerRef}
                    rows={1}
                    className="max-h-36 min-h-11 flex-1 resize-none rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm leading-snug outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-sky-500 dark:focus:bg-zinc-900"
                    placeholder={
                      selectedFile ? `Подпись к файлу (${selectedFile.name})…` : 'Напишите сообщение…'
                    }
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      if (e.target.value.trim().length === 0) {
                        emitTyping(false);
                        if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
                        return;
                      }
                      emitTyping(true);
                      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
                      typingStopTimerRef.current = setTimeout(() => emitTyping(false), 1200);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void (selectedFile ? sendAttachment() : sendMessage());
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-600 to-cyan-600 text-white shadow-md shadow-sky-600/25 transition hover:from-sky-700 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={busy || (text.trim().length === 0 && !selectedFile)}
                    onClick={() => void (selectedFile ? sendAttachment() : sendMessage())}
                    aria-label={selectedFile ? 'Отправить файл' : 'Отправить'}
                  >
                    {busy ? (
                      <span className="inline-block size-5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
                    ) : (
                      <Mail size={20} strokeWidth={1.8} className="ml-0.5" aria-hidden />
                    )}
                  </button>
                </div>
                <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-zinc-400 dark:text-zinc-500">
                  Enter — отправить · Shift+Enter — новая строка
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
