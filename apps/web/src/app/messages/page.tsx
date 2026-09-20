'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  Camera,
  CheckCircle,
  ChevronLeft,
  Lightbulb,
  Link2,
  MessageCircle,
  Search,
  Send,
  CircleHelp,
  Sparkles,
  Store,
  Wand2,
  X,
} from 'lucide-react';
import { io, type Socket } from 'socket.io-client';
import {
  apiFetchJson,
  apiUploadFile,
  resolveAssetUrl,
  type AdviseResponse,
  type ChatMessage,
  type ChatSummary,
  type SupportTemplate,
  SOCKET_URL,
} from '@/lib/api';
import { filterChatList, type ChatListFilter } from '@/lib/chat-list';
import { Button } from '@/components/ui/button';
import { AccountScreenHeader } from '@/components/account-screen-header';
import { SupportSheet } from '@/components/support-sheet';

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
  barter: '#b84617', // Бартер — оранжевый
  market: '#006bd6', // Маркет — синий
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

function subscribeLocation(listener: () => void) {
  window.addEventListener('popstate', listener);
  return () => window.removeEventListener('popstate', listener);
}

export default function MessagesPage() {
  const query = useSyncExternalStore(subscribeLocation, () => window.location.search, () => '');
  const params = new URLSearchParams(query);
  const listingId = params.get('listingId');
  const preferredChatId = params.get('chatId');

  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { text: string; file: File | null }>>({});
  const text = drafts[selectedChatId]?.text ?? '';
  const selectedFile = drafts[selectedChatId]?.file ?? null;
  function setText(value: string | ((previous: string) => string)) {
    const id = selectedChatIdRef.current;
    setDrafts(previous => {
      const draft = previous[id] ?? { text: '', file: null };
      return { ...previous, [id]: { ...draft, text: (typeof value === 'function' ? value(draft.text) : value).slice(0, 4000) } };
    });
  }
  function setSelectedFile(file: File | null) {
    const id = selectedChatIdRef.current;
    setDrafts(previous => ({ ...previous, [id]: { text: previous[id]?.text ?? '', file } }));
  }
  const [threadStatus, setThreadStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [sendErrors, setSendErrors] = useState<Record<string, string>>({});
  const sendingRef = useRef(false);
  const textAttemptsRef = useRef<Record<string, { text: string; key: string }>>({});
  const mediaAttemptsRef = useRef<Record<string, { text: string; file: File; key: string }>>({});
  const messageRequestRef = useRef(0);
  const listRequestRef = useRef(0);
  const [status, setStatus] = useState<'loading' | 'need_auth' | 'ready' | 'error'>('loading');
  const [busy, setBusy] = useState(false);
  const [onlineByUserId, setOnlineByUserId] = useState<Record<string, boolean>>({});
  const [lastSeenByUserId, setLastSeenByUserId] = useState<Record<string, string>>({});
  const [peerTyping, setPeerTyping] = useState(false);
  const [listQuery, setListQuery] = useState('');
  const [listFilter, setListFilter] = useState<ChatListFilter>('all');
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [quickRepliesBuyer, setQuickRepliesBuyer] = useState<SupportTemplate[]>([]);
  const [quickRepliesSeller, setQuickRepliesSeller] = useState<SupportTemplate[]>([]);
  const [advise, setAdvise] = useState<AdviseResponse | null>(null);
  const [adviseBusy, setAdviseBusy] = useState(false);
  const [adviseDismissed, setAdviseDismissed] = useState(false);
  const [supportSheetOpen, setSupportSheetOpen] = useState(false);
  const [openError, setOpenError] = useState('');
  const [openAttempt, setOpenAttempt] = useState(0);

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

  const myRole: 'buyer' | 'seller' | 'neutral' = selectedChat?.myRole ?? 'neutral';
  const quickReplies = myRole === 'seller' ? quickRepliesSeller : quickRepliesBuyer;

  const filteredChats = useMemo(() => filterChatList(chats, listQuery, listFilter), [chats, listQuery, listFilter]);

  const totalUnread = useMemo(() => chats.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0), [chats]);

  // AI-подсказка показывается только если у меня в этом диалоге ЕЩЁ нет
  // отправленных сообщений. Как только я написал хоть что-то — подсказка
  // становится не нужна (Максим: «потом есть же быстрые ответы»).
  const hasMyMessages = useMemo(() => {
    const peerId = selectedChat?.peer?.id;
    if (!peerId) return false;
    return messages.some((m) => !m.isAssistant && m.senderId !== peerId);
  }, [messages, selectedChat?.peer?.id]);

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
    scrollToBottom();
  }, [messages, selectedChatId, scrollToBottom]);

  function stopTypingTimers() {
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    if (peerTypingResetTimerRef.current) clearTimeout(peerTypingResetTimerRef.current);
  }

  function emitTyping(isTyping: boolean) {
    if (!selectedChatIdRef.current) return;
    socketRef.current?.emit('typing', { chatId: selectedChatIdRef.current, isTyping });
  }

  const loadChats = useCallback(async (background = false) => {
    const request = ++listRequestRef.current;
    const res = await apiFetchJson<ChatSummary[]>('/chats', { signal: AbortSignal.timeout(15000) });
    if (request !== listRequestRef.current) return res.ok ? res.data : [];
    if (!res.ok) {
      if (background) return [];
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
  }, []);

  async function openByListing(maybeListingId: string) {
    const res = await apiFetchJson<{ id: string }>(`/chats/by-listing/${encodeURIComponent(maybeListingId)}`, {
      method: 'POST',
    });
    if (!res.ok) {
      if (res.status === 401) setStatus('need_auth');
      else setOpenError('Не удалось открыть чат по объявлению. Попробуйте ещё раз.');
      return null;
    }
    setOpenError('');
    return res.data.id;
  }

  async function loadMessages(chatId: string) {
    const request = ++messageRequestRef.current;
    const res = await apiFetchJson<ChatMessage[]>(`/chats/${encodeURIComponent(chatId)}/messages`, {
      signal: AbortSignal.timeout(15000),
    });
    if (selectedChatIdRef.current !== chatId || request !== messageRequestRef.current) return;
    if (!res.ok) { setThreadStatus('error'); return; }
    setMessages(res.data);
    setThreadStatus('ready');
  }

  async function sendMessage() {
    if (!selectedChatId || !text.trim() || sendingRef.current || threadStatus !== 'ready') return;
    await sendCurrentDraft(false);
  }

  async function sendAttachment() {
    if (!selectedChatId || !selectedFile || sendingRef.current || threadStatus !== 'ready') return;
    await sendCurrentDraft(true);
  }

  async function sendCurrentDraft(withFile: boolean) {
    const chatId = selectedChatId;
    const currentText = text;
    const file = selectedFile;
    // Keep the same key after an ambiguous failure, even across chat switches.
    // A confirmed send or a different payload starts a new logical operation.
    let attempt: { text: string; key: string } | undefined;
    if (!withFile) {
      const payload = currentText.trim();
      attempt = textAttemptsRef.current[chatId];
      if (!attempt || attempt.text !== payload) {
        attempt = { text: payload, key: crypto.randomUUID() };
        textAttemptsRef.current[chatId] = attempt;
      }
    }
    let mediaAttempt: { text: string; file: File; key: string } | undefined;
    if (withFile && file) {
      const payload = currentText.trim();
      mediaAttempt = mediaAttemptsRef.current[chatId];
      if (!mediaAttempt || mediaAttempt.text !== payload || mediaAttempt.file !== file) {
        mediaAttempt = { text: payload, file, key: crypto.randomUUID() };
        mediaAttemptsRef.current[chatId] = mediaAttempt;
      }
    }
    sendingRef.current = true;
    setBusy(true);
    setSendErrors(previous => ({ ...previous, [chatId]: '' }));
    try {
      const res = withFile && file
        ? await apiUploadFile(`/chats/${encodeURIComponent(chatId)}/media`, file, 'file', { text: currentText.trim(), clientMessageId: mediaAttempt!.key }, {
            // Uploads need more time than text; aborting does not prove the server did not save it.
            signal: AbortSignal.timeout(60000),
          })
        : await apiFetchJson<ChatMessage>(`/chats/${encodeURIComponent(chatId)}/messages`, {
            method: 'POST', body: JSON.stringify({ text: currentText.trim(), clientMessageId: attempt!.key }),
            signal: AbortSignal.timeout(20000),
          });
      if (!res.ok) {
        const message = res.status === 401 ? 'Сессия истекла. Войдите снова. Черновик сохранён в открытой странице.'
          : res.status === 0 || res.status >= 500
            ? 'Нет подтверждения отправки. Обновите переписку и проверьте, появилось ли сообщение, прежде чем отправлять снова.'
            : 'Не удалось отправить сообщение. Черновик сохранён, попробуйте ещё раз.';
        setSendErrors(previous => ({ ...previous, [chatId]: message }));
        return;
      }
      if (mediaAttempt && mediaAttemptsRef.current[chatId] === mediaAttempt) delete mediaAttemptsRef.current[chatId];
      if (attempt && textAttemptsRef.current[chatId] === attempt) delete textAttemptsRef.current[chatId];
      setDrafts(previous => {
        const draft = previous[chatId];
        if (!draft) return previous;
        return { ...previous, [chatId]: {
          text: draft.text === currentText ? '' : draft.text,
          file: draft.file === file ? null : draft.file,
        } };
      });
      socketRef.current?.emit('typing', { chatId, isTyping: false });
      if (selectedChatIdRef.current === chatId) {
        ++messageRequestRef.current;
        if (!withFile) setMessages(previous => previous.some(x => x.id === res.data.id) ? previous : [...previous, res.data]);
        else await loadMessages(chatId);
      }
      await loadChats(true);
    } finally { sendingRef.current = false; setBusy(false); }
  }

  const activateChat = useCallback((id: string) => {
    if (selectedChatIdRef.current === id) return;
    socketRef.current?.emit('typing', { chatId: selectedChatIdRef.current, isTyping: false });
    selectedChatIdRef.current = id;
    ++messageRequestRef.current;
    setSelectedChatId(id);
    setMessages([]);
    setThreadStatus('loading');
    setPeerTyping(false);
    setAdvise(null);
    setAdviseDismissed(false);
    setAdviseBusy(true);
  }, []);

  function navigateChat(id?: string) {
    const next = id ? '/messages?chatId=' + encodeURIComponent(id) : '/messages';
    window.history.pushState(null, '', next);
    window.dispatchEvent(new PopStateEvent('popstate'));
    setMobileThreadOpen(Boolean(id));
    if (id) activateChat(id);
  }

  function selectChat(id: string) { navigateChat(id); }


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
        void loadChats(true);
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
      void loadChats(true);
    });

    return () => {
      stopTypingTimers();
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

      if (preferredChatId && !list.some(c => c.id === preferredChatId)) {
        activateChat('');
        setMobileThreadOpen(false);
        setOpenError('Диалог недоступен. Обновите список или выберите другую переписку.');
        return;
      }
      setOpenError('');
      let targetChatId =
        preferredChatId && list.some((c) => c.id === preferredChatId) ? preferredChatId : list[0]?.id ?? '';
      if (listingId) {
        const createdId = await openByListing(listingId);
        if (!alive) return;
        if (!createdId) { activateChat(''); return; }
        if (createdId) {
          const updated = await loadChats();
          if (!alive) return;
          targetChatId = createdId || updated[0]?.id || '';
        }
      }
      if (targetChatId) {
        activateChat(targetChatId);
        setMobileThreadOpen(Boolean(listingId || preferredChatId));
      }
    })();

    return () => {
      alive = false;
    };
  }, [listingId, preferredChatId, openAttempt, loadChats, activateChat]);

  useEffect(() => {
    if (!selectedChatId) return;
    void (async () => {
      await loadMessages(selectedChatId);
      await loadChats(true);
    })();
    socketRef.current?.emit('join-chat', { chatId: selectedChatId });
    socketRef.current?.emit('read-chat', { chatId: selectedChatId });
    return () => {
      emitTyping(false);
      stopTypingTimers();
    };
  }, [selectedChatId, loadChats]);

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
    if (!selectedChatId || !selectedChat) return;
    let alive = true;
    (async () => {
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
    if (selectedChatIdRef.current !== selectedChatId) return;
    setAdviseBusy(false);
    if (res.ok) {
      setAdvise(res.data);
      setAdviseDismissed(false);
    }
  }

  if (status === 'need_auth') {
    return <div className="min-h-screen bg-background text-foreground">
      <AccountScreenHeader title="Сообщения" subtitle="Чаты по объявлениям" backHref="/" backLabel="Назад в ленту" />
      <main className="mx-auto max-w-lg px-4 py-8">
        <div className="rounded-3xl border border-border bg-card p-6 text-center">
          <MessageCircle className="mx-auto size-10 text-muted-foreground" aria-hidden />
          <h2 className="mt-4 text-xl font-semibold">Ваши переписки в одном месте</h2>
          <p className="mt-2 text-sm text-muted-foreground">Войдите, чтобы переписываться с продавцами и покупателями.</p>
          <Button size="lg" className="mt-6 w-full" render={<Link href={'/auth?next=' + encodeURIComponent('/messages' + query)} />}>Войти или зарегистрироваться</Button>
        </div>
      </main>
    </div>;
  }

  const listingHref = selectedChat?.listing?.id ? `/listing/${selectedChat.listing.id}` : null;
  const previewSrc = resolveAssetUrl(selectedChat?.listing?.previewImageUrl ?? null);

  return (
    <div
      className="flex h-[calc(100dvh-112px-env(safe-area-inset-bottom,0px))] min-h-0 flex-col bg-background text-foreground antialiased md:h-dvh"
    >
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
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col md:my-4 md:flex-row md:gap-0 md:overflow-hidden md:rounded-3xl md:border md:border-border md:bg-card md:shadow-sm">
        {/* Sidebar — chat list */}
        <aside
          className={`flex min-h-0 w-full flex-col border-border bg-card md:w-[340px] lg:w-[380px] md:shrink-0 md:border-r ${
 mobileThreadOpen ? 'hidden md:flex' : 'flex flex-1 md:flex-none'
 }`}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-5 pb-3">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight md:text-lg">Сообщения</h2>
              {totalUnread > 0 ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{totalUnread}</span> : null}
            </div>
            <button type="button" onClick={() => setSupportSheetOpen(true)} aria-label="Помощь и поддержка" className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground hover:text-foreground"><CircleHelp size={21} aria-hidden /></button>
          </div>
          {openError ? <div role="alert" className="px-4 pb-3 text-sm"><p>{openError}</p><Button variant="outline" className="mt-2" onClick={() => { setOpenError(''); setOpenAttempt(value => value + 1); }}>Повторить открытие</Button></div> : null}
          <div className="shrink-0 px-4 pb-3">
            <div className="relative">
              <Search size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input type="search" value={listQuery} onChange={(e) => setListQuery(e.target.value)} aria-label="Поиск по диалогам" placeholder="Имя, объявление или сообщение"
                className="h-12 w-full min-w-0 rounded-2xl border border-transparent bg-muted/60 pr-4 pl-11 text-base outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
            </div>
            <div aria-label="Фильтр диалогов" className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
              {([{ id: 'all', label: 'Все' }, { id: 'buyer', label: 'Покупаю' }, { id: 'seller', label: 'Продаю' }, { id: 'unread', label: 'Непрочитанные' }] as const).map((filter) => (
                <button key={filter.id} type="button" aria-pressed={listFilter === filter.id} onClick={() => setListFilter(filter.id)}
                  className="min-h-11 shrink-0 rounded-full bg-muted/50 px-3 text-xs font-semibold text-muted-foreground transition-colors aria-pressed:bg-primary/10 aria-pressed:text-primary">{filter.label}</button>
              ))}
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
              <div role="alert" className="p-4 text-center text-sm text-destructive">
                <p>Не удалось загрузить чаты</p>
                <Button variant="outline" className="mt-3" onClick={() => void loadChats()}>Повторить загрузку</Button>
              </div>
            ) : null}

            <ul className="p-2 pt-0">
              {filteredChats.map((c) => {
                const active = c.id === selectedChatId;
                const img = resolveAssetUrl(c.listing?.previewImageUrl ?? null);
                const peer = c.peer;
                const unread = c.unreadCount > 0;
                const chatMode = getChatMode(c.listing);
                const chatColor = MODE_COLOR[chatMode];
                const unreadCountLabel = c.unreadCount > 9 ? '9+' : String(c.unreadCount);
                return (
                  <li key={c.id} className="mb-0.5">
                    <button
                      type="button"
                      onClick={() => selectChat(c.id)}
                      aria-pressed={active}
                      className={`flex min-h-24 w-full items-center gap-3 rounded-2xl p-3 text-left transition ${
 active
 ? 'bg-primary/8 ring-1 ring-primary/15'
 : 'hover:bg-muted/60'
 }`}
                    >
                      <div className="relative shrink-0">
                        {/*
                          ВАЖНО: НЕ используем класс `.listing-thumb-wrap` —
                          в globals.css на мобилке он принудительно ставит
                          height: 140px !important (для крупных карточек
                          объявлений), и наш 44×44 thumb растягивается в
                          вытянутую пилюлю 44×140. Поэтому здесь plain div
                          с обычным `h-11 w-11`.
                        */}
                        <div className="h-14 w-14 overflow-hidden rounded-2xl border border-border bg-muted">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <Store size={20} strokeWidth={1.8} aria-hidden />
                            </div>
                          )}
                        </div>
                        {unread ? (
                          <span
                            style={{ background: chatColor }}
                            className="absolute -right-0.5 -top-0.5 h-3.5 min-w-3.5 rounded-full px-1 text-center text-[9px] font-bold leading-[14px] text-white ring-2 ring-card"
                          >
                            {unreadCountLabel}
                          </span>
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`line-clamp-1 text-[15px] leading-snug ${
 unread
 ? 'font-bold text-foreground'
 : 'font-semibold text-foreground'
 }`}
                          >
                            {peer?.name ?? peer?.email ?? peer?.phone ?? 'Собеседник'}
                          </span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {formatListTime(c.lastMessage?.createdAt ?? c.updatedAt)}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1">
                          <span
                            style={{
                              background: `${chatColor}1a`,
                              color: chatColor,
                            }}
                            className="inline-flex h-[14px] shrink-0 items-center rounded px-1 text-[9px] font-bold tracking-wide uppercase"
                          >
                            {MODE_LABEL[chatMode]}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {c.listing?.title ?? 'Без объявления'}
                          </span>
                        </div>
                        <div
                          className={`mt-1 line-clamp-1 text-[13px] leading-snug ${
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
              <div className="mx-4 mt-2 rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center">
                <MessageCircle size={40} strokeWidth={1.8} className="mx-auto opacity-35" aria-hidden />
                <p className="mt-3 text-sm font-medium text-foreground">
                  Пока нет диалогов с продавцами
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Откройте объявление и нажмите «Написать в чат», чтобы начать переписку. Если есть
                  вопрос к площадке, нажмите кнопку помощи рядом с заголовком.
                </p>
                <Link
                  href="/"
                  className="mt-4 inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-5 py-3 text-base font-semibold text-primary-foreground hover:bg-primary-hover"
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
          className={`flex min-h-0 min-w-0 flex-1 flex-col bg-card ${
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
              {/* Thread header — компактный для мобилки */}
              <div className="glass-panel flex min-h-20 shrink-0 items-center gap-3 border-b border-border px-3 py-3 md:px-5">
                <button
                  type="button"
                  className="grid size-11 shrink-0 place-items-center rounded-full text-foreground transition active:bg-muted md:hidden"
                  onClick={() => navigateChat()}
                  aria-label="Назад к списку"
                >
                  <ChevronLeft size={22} strokeWidth={2} aria-hidden />
                </button>
                {/*
                  То же самое, что в списке чатов: НЕ используем
                  `.listing-thumb-wrap` — иначе мобильный override в
                  globals.css растянет аватар объявления до 140px и
                  шапка диалога станет «громоздкой» (жалоба Максима).
                */}
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-border bg-muted md:h-11 md:w-11 md:rounded-xl">
                  {previewSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewSrc} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Store size={18} strokeWidth={1.8} aria-hidden />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold leading-tight text-foreground">
                    {selectedChat.listing?.title ?? 'Диалог'}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground md:text-xs">
                    <span
                      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
 peerTyping
 ? 'animate-pulse bg-primary'
 : selectedChat.peer?.id && onlineByUserId[selectedChat.peer.id]
 ? 'bg-success'
 : 'bg-muted-foreground/30'
 }`}
                    />
                    <span className="truncate">
                      {selectedChat.peer?.name ?? selectedChat.peer?.email ?? 'Собеседник'}
                      <span className="mx-1 text-muted-foreground/60">·</span>
                      <span className={peerTyping ? 'font-medium text-primary' : ''}>{peerStatus}</span>
                    </span>
                  </div>
                </div>
                {listingHref ? (
                  <Link
                    href={listingHref}
                    className="hidden min-h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted sm:inline-flex"
                  >
                    <Link2 size={16} strokeWidth={1.8} className="shrink-0" aria-hidden />
                    Объявление
                  </Link>
                ) : null}
                <button
                  type="button"
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-muted/60 text-muted-foreground"
                  onClick={() => setSupportSheetOpen(true)}
                  aria-label="Помощь и поддержка"
                >
                  <CircleHelp size={20} strokeWidth={1.8} aria-hidden />
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
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/30 px-3 py-5 md:px-5">
                <div className="mx-auto max-w-3xl space-y-3">
                  {threadStatus === 'loading' ? <p role="status" className="py-8 text-center text-sm text-muted-foreground">Загрузка переписки…</p> : null}
                  {threadStatus === 'error' ? <div role="alert" className="rounded-2xl border border-border bg-card p-4 text-sm"><p>Не удалось загрузить переписку</p><Button variant="outline" className="mt-3" onClick={() => void loadMessages(selectedChatId)}>Обновить переписку</Button></div> : null}
                  {threadStatus === 'ready' && messages.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-card/60 py-12 text-center text-sm text-muted-foreground">
                      Напишите первое сообщение — обычно отвечают быстрее, если указать удобное время связи.
                    </div>
                  ) : null}
                  {messages.map((m) => {
                    if (m.isAssistant) {
                      return (
                        <div key={m.id} className="flex justify-center px-1">
                          <div className="max-w-[min(100%,560px)] rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-[15px] text-foreground">
                            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-accent">
                              <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent/10 text-white shadow-sm">
                                <Sparkles size={16} strokeWidth={1.8} aria-hidden />
                              </span>
                              Помощник площадки
                            </div>
                            {m.text ? (
                              <div className="whitespace-pre-wrap leading-relaxed text-foreground [overflow-wrap:anywhere]">
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
                          className={`flex max-w-[88%] md:max-w-[min(80%,520px)] gap-2 ${isPeer ? 'flex-row' : 'flex-row-reverse'}`}
                        >
                          {/*
                            Для peer-сообщений — аватар с инициалами слева.
                            Для своих сообщений аватар/spacer НЕ рисуем
                            (раньше был пустой 32px div-«фантом» для
                            симметрии — из-за него мои пузыри отъезжали
                            от правого края экрана на лишние ~40px).
                          */}
                          {isPeer ? (
                            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-foreground">
                              {peerInitials(selectedChat.peer)}
                            </div>
                          ) : null}
                          <div
                            style={isPeer ? undefined : { background: myBubbleColor }}
                            className={`min-w-0 rounded-[22px] px-4 py-3 text-[15px] shadow-sm ${
 isPeer
 ? 'rounded-bl-md border border-border/60 bg-card text-foreground'
 : 'rounded-br-md text-white'
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
                            {m.text ? <div className="whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere]">{m.text}</div> : null}
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
                                  <CheckCircle size={14} strokeWidth={1.8} className="shrink-0 text-white" aria-hidden />
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

              {/*
                AI-подсказка показывается ТОЛЬКО для нового диалога:
                как только я отправил хотя бы одно сообщение в этот чат —
                подсказка скрывается (Максим: «потом есть же быстрые
                ответы, там подсказка уже не нужна»).
              */}
              {advise && !adviseDismissed && !hasMyMessages && (advise.tip || advise.suggestions.length > 0) ? (
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

              {/* Composer stays above the existing mobile navigation. */}
              <div className="glass-panel shrink-0 border-t border-border px-3 py-3 md:p-4">
                {sendErrors[selectedChatId] ? <div role="alert" className="mx-auto mb-3 max-w-3xl rounded-2xl border border-border bg-card p-3 text-sm">
                  <p>{sendErrors[selectedChatId]}</p>
                  {sendErrors[selectedChatId].startsWith('Сессия истекла') ? <Link className="mt-2 inline-flex min-h-11 items-center text-primary underline" href={'/auth?next=' + encodeURIComponent('/messages?chatId=' + selectedChatId)}>Войти снова</Link> : null}
                  <Button variant="outline" className="mt-2" disabled={busy} onClick={() => void loadMessages(selectedChatId)}>Обновить переписку</Button>
                </div> : null}
                {/* Quick replies chips */}
                {quickReplies.length > 0 ? (
                  <div className="mx-auto mb-1.5 flex max-w-3xl items-center gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Быстро:
                    </span>
                    {quickReplies.map((t) => (
                      <button
                        key={t.code}
                        type="button"
                        onClick={() => insertQuickReply(t)}
                        className="min-h-11 shrink-0 rounded-full border border-border bg-muted/50 px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                        title={t.text}
                      >
                        {t.title}
                      </button>
                    ))}
                  </div>
                ) : null}

                {selectedFile ? (
                  <div className="mb-1.5 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs">
                    <Camera size={16} strokeWidth={1.8} className="shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1 truncate font-medium text-primary">{selectedFile.name}</span>
                    <button
                      type="button"
                      className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/20"
                      onClick={() => setSelectedFile(null)}
                    >
                      Убрать
                    </button>
                  </div>
                ) : null}
                <div className="mx-auto flex max-w-3xl items-end gap-2">
                  <label className="relative grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-muted/60 text-muted-foreground transition focus-within:ring-2 focus-within:ring-primary hover:text-primary">
                    <Camera size={18} strokeWidth={1.8} aria-hidden />
                    <input
                      type="file"
                      aria-label="Прикрепить фото или видео"
                      disabled={busy}
                      className="absolute inset-0 w-full cursor-pointer opacity-0"
                      onChange={(e) => {
                        const file = e.currentTarget.files?.[0];
                        if (file) setSelectedFile(file);
                      }}
                      accept="image/*,video/*"
                    />
                  </label>
                  <textarea
                    ref={composerRef}
                    rows={2}
                    maxLength={4000}
                    aria-label="Сообщение"
                    className="max-h-32 min-h-11 min-w-0 flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-2.5 text-base leading-6 placeholder:text-muted-foreground transition focus:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Сообщение…"
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      emitTyping(e.target.value.length > 0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
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
                    disabled={busy || threadStatus !== 'ready' || (text.trim().length === 0 && !selectedFile)}
                    aria-label="Отправить"
                    className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 md:w-auto md:px-4"
                  >
                    {busy ? (
                      <span className="inline-block size-4 animate-spin rounded-full border-2 border-white/40 border-t-transparent" aria-hidden />
                    ) : (
                      <>
                        <Send size={18} strokeWidth={2} className="md:hidden" aria-hidden />
                        <span className="hidden text-sm font-semibold md:inline">Отправить</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {/* Закреплённый support-chat sheet */}
      <SupportSheet open={supportSheetOpen} onClose={() => setSupportSheetOpen(false)} />
    </div>
  );
}
