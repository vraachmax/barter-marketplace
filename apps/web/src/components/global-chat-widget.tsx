'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { io, type Socket } from 'socket.io-client';
import { SOCKET_URL, type ChatSummary } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';
import { getToken } from '@/lib/auth-store';

export function GlobalChatWidget() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const fetchedRef = useRef(false);

  const loadChats = useCallback(() => {
    const token = getToken();
    if (!token) return;
    fetch('/chats', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: ChatSummary[]) => {
        setChats(list);
        setUnread(list.reduce((s, c) => s + (c.unreadCount ?? 0), 0));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user || fetchedRef.current) return;
    fetchedRef.current = true;
    loadChats();
  }, [user, loadChats]);

  useEffect(() => {
    if (!user) return;
    const socket = io(SOCKET_URL, { withCredentials: true, transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('message-created', () => {
      setUnread((p) => p + 1);
      loadChats();
    });
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [user, loadChats]);

  if (pathname?.startsWith('/messages')) return null;

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    } catch { return ''; }
  };

  if (!user) {
    return (
      <a
        href="/auth?mode=login"
        className="hidden md:flex"
        style={{ position: 'fixed', bottom: 80, right: 16, zIndex: 9999, width: 52, height: 52, borderRadius: '50%', background: '#0284c7', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(2,132,199,.4)', color: '#fff', textDecoration: 'none' }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
      </a>
    );
  }

  return (
    <div className="hidden md:block">
      {/* Кнопка */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'fixed', bottom: 80, right: 16, zIndex: 9999,
          width: 52, height: 52, borderRadius: '50%',
          background: open ? '#0f172a' : '#0284c7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,.3)', color: '#fff', border: 'none', cursor: 'pointer',
          transition: 'background 0.2s, transform 0.2s',
          transform: open ? 'rotate(90deg)' : 'rotate(0)',
        }}
        aria-label="Чат"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
        ) : (
          <>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
            {unread > 0 ? (
              <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', borderRadius: 10, background: '#ef4444', fontSize: 11, fontWeight: 700, border: '2px solid #fff' }}>
                {unread > 99 ? '99+' : unread}
              </span>
            ) : null}
          </>
        )}
      </button>

      {/* Мини-чат панель */}
      <div
        style={{
          position: 'fixed', bottom: 142, right: 16, zIndex: 9998,
          width: 340, maxHeight: 440,
          borderRadius: 20, overflow: 'hidden',
          background: '#fff', boxShadow: '0 8px 40px rgba(0,0,0,.2)',
          transform: open ? 'scale(1) translateY(0)' : 'scale(0) translateY(40px)',
          transformOrigin: 'bottom right',
          opacity: open ? 1 : 0,
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        {/* Шапка */}
        <div style={{ background: 'linear-gradient(135deg, #0284c7, #06b6d4)', padding: '14px 16px', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: 15 }}>Сообщения</span>
            <Link
              href="/messages"
              style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.8)', textDecoration: 'none' }}
            >
              Все чаты →
            </Link>
          </div>
          {unread > 0 ? (
            <span style={{ fontSize: 12, opacity: 0.85, marginTop: 2, display: 'block' }}>
              {unread} непрочитанных
            </span>
          ) : null}
        </div>

        {/* Список чатов */}
        <div style={{ maxHeight: 340, overflowY: 'auto' }}>
          {chats.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#a1a1aa', fontSize: 13 }}>
              Нет диалогов
            </div>
          ) : (
            chats.slice(0, 6).map((chat) => (
              <Link
                key={chat.id}
                href={`/messages?chatId=${chat.id}`}
                style={{ display: 'flex', gap: 10, padding: '10px 14px', borderBottom: '1px solid #f4f4f5', textDecoration: 'none', color: 'inherit', alignItems: 'center' }}
                onClick={() => setOpen(false)}
              >
                <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg, #e0f2fe, #cffafe)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>
                  💬
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#18181b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {chat.peer?.name ?? chat.listing?.title ?? 'Диалог'}
                    </span>
                    <span style={{ fontSize: 10, color: '#a1a1aa', flexShrink: 0 }}>
                      {chat.lastMessage ? formatTime(chat.lastMessage.createdAt) : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#71717a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                    {chat.lastMessage?.text ?? 'Нет сообщений'}
                  </div>
                </div>
                {(chat.unreadCount ?? 0) > 0 ? (
                  <span style={{ minWidth: 20, height: 20, borderRadius: 10, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0 }}>
                    {chat.unreadCount}
                  </span>
                ) : null}
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
