'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle,
  ChevronLeft,
  Lightbulb,
  Link2,
  Mail,
  MessageCircle,
  Search,
  SlidersHorizontal,
  Sparkles,
  Store,
  Wand2,
  X,
} from 'lucide-react';
import { io, type Socket } from 'socket.io-client';
import {
  API_URL,
  apiFetchJson,
  apiUploadFile,
  type AdviseResponse,
  type ChatMessage,
  type ChatSummary,
  type SupportTemplate,
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

/**
 * Определяет режим чата по связанному объявлению.
 * До Phase 13 `isBarter` в `ChatSummary['listing']` отсутствует — читаем
 * опционально. Все существующие чаты считаются «market» до миграции.
 */
function getChatMode(listing: ChatSummary['listing']): 'barter' | 'market' {
  const isBarter = (listing as { isBarter?: boolean } | null | undefined)?.isBarter;
  return isBarter ? 'barter' : 'market';
}

const MODE_COLOR: Record<'barter' | 'market', string> = {
  barter: '#E85D26', // Бартер — оранжевый
  market: '#00AAFF', // Маркет — синий (Avito 2026)
};

const MODE_LABEL: Record<'barter' | 'market', string> = {
  barter: 'Обмен',
  market: 'Продажа',
};

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
  const [quickRepliesBuyer, setQuickRepliesBuyer] = useState<SupportTemplate[]>([]);
  const [quickRepliesSeller, setQuickRepliesSeller] = useState<SupportTemplate[]>([]);
  const [advise, setAdvise] = useState<AdviseResponse | null>(null);
  const [adviseBusy, setAdviseBusy] = useState(false);
  const [adviseDismissed, setAdviseDismissed] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const selectedChatIdRef = useRef<string>('');
  const chatsRef = useRef<ChatSummary[]>([]);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerTypingResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLInputElement | null>(null);

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

  const myRole: 'buyer' | 'seller' | 'neutral' = selectedChat?.myRole ?? 'neutral';
  const quickReplies = myRole === 'seller' ? quickRepliesSeller : quickRepliesBuyer;

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
    if (!res.ok) {
      window.alert(`Не удалось отправить файл: ${res.message ?? 'ошибка сети'}`);
      return;
    }
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

  // Загрузка шаблонов быстрых ответов (одноразово — они редко меняются)
  useEffect(() => {
    let alive = true;
    (async () => {
      const [buyerRes, sellerRes] = await Promise.all([
        apiFetchJson<SupportTemplate[]>('/support/templates?category=QUICK_REPLY_BUYER'),
        apiFetchJson<SupportTemplate[]>('/support/templates?category=QUICK_REPLY_SELLER'),
      ]);
      if (!alive) return;
      if (buyerRes.ok) setQuickRepliesBuyer(buyerRes.data);
      if (sellerRes.ok) setQuickRepliesSeller(sellerRes.data);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // AI-ассистент: при смене чата запрашиваем подсказку
  useEffect(() => {
    if (!selectedChatId || !selectedChat) {
      setAdvise(null);
      return;
    }
    setAdviseDismissed(false);
    let alive = true;
    (async () => {
      setAdviseBusy(true);
      const res = await apiFetchJson<AdviseResponse>('/support/advise', {
        method: 'POST',
        body: JSON.stringify({
          role: myRole,
          listingId: selectedChat.listing?.id ?? undefined,
          chatId: selectedChatId,
        }),
      });
      if (!alive) return;
      setAdviseBusy(false);
      if (res.ok) setAdvise(res.data);
      else setAdvise(null);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChatId, myRole]);

  function insertQuickReply(template: SupportTemplate) {
    const current = text.trim();
    const next = current ? `${current} ${template.text}` : template.text;
    setText(next);
    emitTyping(true);
    // focus composer on next tick
    setTimeout(() => {
      composerRef.current?.focus();
    }, 0);
  }

  async function refreshAdvise(prompt?: string) {
    if (!selectedChatId || !selectedChat) return;
    setAdviseBusy(true);
    const res = await apiFetchJson<AdviseResponse>('/support/advise', {
      method: 'POST',
      body: JSON.stringify({
        role: myRole,
        listingId: selectedChat.listing?.id ?? undefined,
        chatId: selectedChatId,
        prompt,
      }),
    });
    setAdviseBusy(false);
    if (res.ok) {
      setAdvise(res.data);
      setAdviseDismissed(false);
    }
  }

  if (status === 'need_auth') {
    return (
      <div className="min-h-screen bg-muted text-foreground antialiased">
        <div className="border-b border-border bg-card">
          <div className="mx-auto max-w-lg px-4 py-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
            >
              <ChevronLeft size={20} strokeWidth={1.8} className="shrink-0" aria-hidden />
              На главную
            </Link>
          </div>
        </div>
        <div className="mx-auto max-w-lg px-4 py-10">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border bg-primary px-6 py-8 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-card shadow-md ring-1 ring-primary/30">
                <MessageCircle size={36} strokeWidth={1.8} aria-hidden />
              </div>
              <h1 className="mt-4 text-xl font-bold text-foreground">Сообщения</h1>
              <p className="mt-2 text-sm text-muted-foreground">Войдите, чтобы переписываться с продавцами и покупателями.</p>
            </div>
            <div className="p-6">
              <Link
                href="/auth"
                className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white shadow-lg shadow-primary/20"
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
    <div className="flex min-h-[100dvh] flex-col bg-muted text-foreground antialiased">
      {/* Top bar — desktop */}
      <header className="hidden shrink-0 border-b border-border bg-card md:block">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white shadow-sm">
              <MessageCircle size={20} strokeWidth={1.8} aria-hidden />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight text-foreground">Сообщения</h1>
              <p className="text-xs text-muted-foreground">Чаты по объявлениям</p>
            </div>
            {totalUnread > 0 ? (
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white">{totalUnread}</span>
            ) : null}
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground transition hover:text-primary"
          >
            На главную
          </Link>
        </div>
      </header>

      {/* Main split */}
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col md:my-4 md:min-h-[calc(100dvh-4.5rem)] md:max-h-[calc(100dvh-4.5rem)] md:flex-row md:gap-0 md:overflow-hidden md:rounded-2xl md:border md:border-border md:bg-card md:shadow-xl">
        {/* Sidebar — chat list */}
        <aside
          className={`flex min-h-0 w-full flex-col border-border bg-card md:w-[min(100%,380px)] md:shrink-0 md:border-r ${
 mobileThreadOpen ? 'hidden md:flex' : 'flex flex-1 md:flex-none'
 }`}
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 md:hidden">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <MessageCircle size={22} strokeWidth={1.8} className="shrink-0" aria-hidden />
              Чаты
              {totalUnread > 0 ? (
                <span className="rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">{totalUnread}</span>
              ) : null}
            </div>
            <Link href="/" className="text-xs font-medium text-primary">
              Главная
            </Link>
          </div>

          <div className="border-b border-border p-3">
            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2">
                <Search size={16} strokeWidth={1.8} className="opacity-60" aria-hidden />
              </span>
              <input
                type="search"
                value={listQuery}
                onChange={(e) => setListQuery(e.target.value)}
                placeholder="Поиск по чатам…"
                className="h-10 w-full rounded-xl border border-border bg-muted/50 pl-9 pr-3 text-sm outline-none transition focus:border-primary/30 focus:bg-card focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {status === 'loading' ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <span className="inline-block size-8 shrink-0 animate-spin rounded-full border-2 border-primary/30 border-t-transparent" aria-hidden />
                Загрузка диалогов…
              </div>
            ) : null}
            {status === 'error' ? (
              <div className="p-4 text-center text-sm text-destructive">Не удалось загрузить чаты</div>
            ) : null}

            <ul className="p-2">
              {filteredChats.map((c) => {
                const active = c.id === selectedChatId;
                const img = resolveAssetUrl(c.listing?.previewImageUrl ?? null);
                const peer = c.peer;
                const unread = c.unreadCount > 0;
                const chatMode = getChatMode(c.listing);
                const chatColor = MODE_COLOR[chatMode];
                const unreadCountLabel = c.unreadCount > 9 ? '9+' : String(c.unreadCount);
                return (
                  <li key={c.id} className="mb-1">
                    <button
                      type="button"
                      onClick={() => selectChat(c.id)}
                      style={{ borderLeft: `3px solid ${chatColor}` }}
                      className={`flex w-full gap-3 rounded-xl p-2.5 pl-3 text-left transition ${
 active
 ? 'bg-muted ring-1 ring-border'
 : 'hover:bg-muted/60'
 }`}
                    >
                      <div className="relative shrink-0">
                        <div className="listing-thumb-wrap h-14 w-14 overflow-hidden rounded-xl border border-border">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt="" className="listing-thumb-img h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                              <Store size={24} strokeWidth={1.8} aria-hidden />
                            </div>
                          )}
                        </div>
                        {unread ? (
                          <span
                            style={{ background: chatColor }}
                            className="absolute -right-0.5 -top-0.5 h-4 min-w-4 rounded-full px-1 text-center text-[10px] font-bold leading-4 text-white"
                          >
                            {unreadCountLabel}
                          </span>
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`line-clamp-1 text-sm ${
 unread
 ? 'font-bold text-foreground'
 : 'font-semibold text-foreground'
 }`}
                          >
                            {c.listing?.title ?? 'Без объявления'}
                          </span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {formatListTime(c.lastMessage?.createdAt ?? c.updatedAt)}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span
                            style={{
                              background: `${chatColor}1a`, // 10% opacity фон
                              color: chatColor,
                            }}
                            className="inline-flex h-[18px] shrink-0 items-center rounded px-1.5 text-[10px] font-bold tracking-wide uppercase"
                          >
                            {MODE_LABEL[chatMode]}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {peer?.name ?? peer?.email ?? peer?.phone ?? 'Собеседник'}
                          </span>
                        </div>
                        <div
                          className={`mt-1 line-clamp-2 text-xs ${
 unread ? 'font-medium text-foreground' : 'text-muted-foreground'
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
              <div className="mx-4 mt-6 rounded-2xl border border-dashed border-border bg-muted/50 p-6 text-center">
                <MessageCircle size={44} strokeWidth={1.8} className="mx-auto opacity-35" aria-hidden />
                <p className="mt-3 text-sm font-medium text-foreground">Пока нет диалогов</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Откройте объявление и нажмите «Написать в чат», чтобы начать переписку.
                </p>
                <Link
                  href="/"
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/20"
                >
                  К объявлениям
                </Link>
              </div>
            ) : null}

            {filteredChats.length === 0 && chats.length > 0 && status === 'ready' ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Ничего не найдено</div>
            ) : null}
          </div>
        </aside>

        {/* Thread */}
        <section
          className={`flex min-h-0 min-w-0 flex-1 flex-col bg-muted ${
 mobileThreadOpen ? 'flex flex-1' : 'hidden md:flex'
 }`}
        >
          {!selectedChat ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="grid h-20 w-20 place-items-center rounded-3xl bg-card shadow-md ring-1 ring-border">
                <MessageCircle size={44} strokeWidth={1.8} className="opacity-50" aria-hidden />
              </div>
              <p className="max-w-xs text-sm font-medium text-muted-foreground">Выберите диалог в списке слева</p>
              <p className="max-w-xs text-xs text-muted-foreground">Или откройте чат из карточки объявления</p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card/90 px-3 py-2.5 backdrop-blur-md md:px-4">
                <button
                  type="button"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-muted-foreground md:hidden"
                  onClick={() => setMobileThreadOpen(false)}
                  aria-label="Назад к списку"
                >
                  <ChevronLeft size={22} strokeWidth={1.8} aria-hidden />
                </button>
                <div className="listing-thumb-wrap h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-border">
                  {previewSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewSrc} alt="" className="listing-thumb-img h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                      <Store size={22} strokeWidth={1.8} aria-hidden />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-foreground">
                    {selectedChat.listing?.title ?? 'Диалог'}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
 peerTyping
 ? 'animate-pulse bg-primary'
 : selectedChat.peer?.id && onlineByUserId[selectedChat.peer.id]
 ? 'bg-success'
 : 'bg-muted-foreground/30'
 }`}
                      />
                      {selectedChat.peer?.name ?? selectedChat.peer?.email ?? 'Собеседник'}
                    </span>
                    <span className="text-foreground">·</span>
                    <span className={peerTyping ? 'font-medium text-primary' : ''}>{peerStatus}</span>
                  </div>
                </div>
                {listingHref ? (
                  <Link
                    href={listingHref}
                    className="hidden shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-primary shadow-sm transition hover:bg-primary/10 sm:inline-flex"
                  >
                    <Link2 size={16} strokeWidth={1.8} className="shrink-0" aria-hidden />
                    Объявление
                  </Link>
                ) : null}
                <button
                  type="button"
                  className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-muted-foreground md:grid"
                  aria-label="Меню"
                >
                  <SlidersHorizontal size={20} strokeWidth={1.8} aria-hidden />
                </button>
              </div>

              {listingHref ? (
                <Link
                  href={listingHref}
                  className="flex shrink-0 items-center justify-center gap-2 border-b border-border bg-card py-2 text-xs font-semibold text-primary sm:hidden"
                >
                  <Link2 size={14} strokeWidth={1.8} className="shrink-0" aria-hidden />
                  Открыть объявление
                </Link>
              ) : null}

              {/* Messages */}
              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-5">
                <div className="mx-auto max-w-3xl space-y-3">
                  {messages.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-card/60 py-12 text-center text-sm text-muted-foreground">
                      Напишите первое сообщение — обычно отвечают быстрее, если указать удобное время связи.
                    </div>
                  ) : null}
                  {messages.map((m) => {
                    if (m.isAssistant) {
                      return (
                        <div key={m.id} className="flex justify-center px-1">
                          <div className="max-w-[min(100%,560px)] rounded-2xl border border-accent/30 bg-primary px-4 py-3 text-sm text-accent shadow-sm">
                            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-accent">
                              <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent/10 text-white shadow-sm">
                                <Sparkles size={16} strokeWidth={1.8} aria-hidden />
                              </span>
                              Помощник площадки
                            </div>
                            {m.text ? (
                              <div className="whitespace-pre-wrap leading-relaxed text-accent/95">
                                {m.text}
                              </div>
                            ) : null}
                            <div className="mt-2 text-right text-[10px] text-accent/80">
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
                    // Пузырь «моих» сообщений красим в цвет режима чата:
                    // оранжевый — если объявление барт., синий — если маркет.
                    const myBubbleColor = MODE_COLOR[getChatMode(selectedChat.listing)];
                    return (
                      <div key={m.id} className={`flex ${isPeer ? 'justify-start' : 'justify-end'}`}>
                        <div
                          className={`flex max-w-[min(100%,520px)] gap-2 ${isPeer ? 'flex-row' : 'flex-row-reverse'}`}
                        >
                          {isPeer ? (
                            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-foreground">
                              {peerInitials(selectedChat.peer)}
                            </div>
                          ) : (
                            <div className="mt-1 h-8 w-8 shrink-0" aria-hidden />
                          )}
                          <div
                            style={isPeer ? undefined : { background: myBubbleColor }}
                            className={`min-w-0 rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
 isPeer
 ? 'rounded-tl-md border border-border bg-card text-foreground'
 : 'rounded-tr-md text-white'
 }`}
                          >
                            {mediaFull ? (
                              <div
                                className={`mb-2 overflow-hidden rounded-xl ${isPeer ? 'border border-border' : 'border border-white/20'}`}
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
 isPeer ? 'justify-end text-muted-foreground' : 'justify-end text-white/80'
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
                                  <CheckCircle size={14} strokeWidth={1.8} className="shrink-0 text-primary" aria-hidden />
                                ) : (
                                  <CheckCircle size={14} strokeWidth={1.8} className="shrink-0 opacity-70" aria-hidden />
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

              {/* AI подсказка */}
              {advise && !adviseDismissed && (advise.tip || advise.suggestions.length > 0) ? (
                <div className="shrink-0 border-t border-border bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 px-3 py-2.5 md:px-5">
                  <div className="mx-auto flex max-w-3xl items-start gap-2.5">
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent">
                      <Lightbulb size={16} strokeWidth={1.8} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-[11px] font-bold uppercase tracking-wide text-accent">
                          AI-подсказка {myRole === 'seller' ? 'для продавца' : myRole === 'buyer' ? 'для покупателя' : ''}
                        </div>
                        <button
                          type="button"
                          onClick={() => setAdviseDismissed(true)}
                          aria-label="Скрыть подсказку"
                          className="shrink-0 rounded-lg p-0.5 text-muted-foreground transition hover:bg-card hover:text-foreground"
                        >
                          <X size={14} strokeWidth={1.8} aria-hidden />
                        </button>
                      </div>
                      {advise.tip ? (
                        <p className="mt-1 text-xs leading-relaxed text-foreground/90">{advise.tip}</p>
                      ) : null}
                      {advise.suggestions.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {advise.suggestions.slice(0, 4).map((s) => (
                            <button
                              key={s.code}
                              type="button"
                              onClick={() => {
                                setText((prev) => (prev.trim() ? `${prev.trim()} ${s.text}` : s.text));
                                setTimeout(() => composerRef.current?.focus(), 0);
                              }}
                              className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-card px-2.5 py-1 text-[11px] font-medium text-accent shadow-sm transition hover:bg-accent/10"
                              title={s.text}
                            >
                              <Wand2 size={11} strokeWidth={1.8} className="shrink-0" aria-hidden />
                              {s.title}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {adviseBusy ? (
                      <span className="mt-1 inline-block size-3.5 shrink-0 animate-spin rounded-full border-2 border-accent/40 border-t-transparent" aria-hidden />
                    ) : (
                      <button
                        type="button"
                        onClick={() => void refreshAdvise()}
                        className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold text-accent hover:bg-accent/10"
                      >
                        Ещё
                      </button>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Composer */}
              <div className="shrink-0 border-t border-border bg-card p-3 md:p-4">
                {/* Quick replies chips */}
                {quickReplies.length > 0 ? (
                  <div className="mx-auto mb-2 flex max-w-3xl items-center gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Быстро:
                    </span>
                    {quickReplies.map((t) => (
                      <button
                        key={t.code}
                        type="button"
                        onClick={() => insertQuickReply(t)}
                        className="shrink-0 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                        title={t.text}
                      >
                        {t.title}
                      </button>
                    ))}
                  </div>
                ) : null}

                {selectedFile ? (
                  <div className="mb-2 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs">
                    <Camera size={18} strokeWidth={1.8} className="shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1 truncate font-medium text-primary">{selectedFile.name}</span>
                    <button
                      type="button"
                      className="shrink-0 rounded-lg px-2 py-1 font-semibold text-primary hover:bg-primary"
                      onClick={() => setSelectedFile(null)}
                    >
                      Убрать
                    </button>
                  </div>
                ) : null}
                <div className="mx-auto flex max-w-3xl items-end gap-2">
                  <label className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-border bg-muted/50 text-muted-foreground transition hover:border-primary/30 hover:bg-primary/10 hover:text-primary">
                    <Camera size={20} strokeWidth={1.8} aria-hidden />
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.currentTarget.files?.[0];
                        if (file) setSelectedFile(file);
                      }}
                      accept="image/*,video/*"
                    />
                  </label>
                  <input
                    ref={composerRef}
                    type="text"
                    className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm placeholder:text-muted-foreground shadow-sm transition focus:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Напишите сообщение..."
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      emitTyping(e.target.value.length > 0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (selectedFile) {
                          sendAttachment();
                        } else {
                          sendMessage();
                        }
                      }
                    }}
                    disabled={busy}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedFile) {
                        sendAttachment();
                      } else {
                        sendMessage();
                      }
                    }}
                    disabled={busy || (text.trim().length === 0 && !selectedFile)}
                    className="shrink-0 rounded-xl bg-primary px-4 py-2.5 font-semibold text-white shadow-lg shadow-primary/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {busy ? '...' : 'Отправить'}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
