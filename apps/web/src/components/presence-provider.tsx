'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/lib/api';

type PresenceContextValue = {
  onlineByUserId: Record<string, boolean>;
  lastSeenByUserId: Record<string, string>;
  refreshUser: (userId: string) => Promise<void>;
};

const PresenceContext = createContext<PresenceContextValue | null>(null);

export function usePresenceContext() {
  return useContext(PresenceContext);
}

/**
 * Держит WebSocket с JWT (как чаты), чтобы продавец считался «в сети», пока открыто приложение.
 * Не открывает чаты — только соединение для presence.
 */
export function PresenceProvider({ children }: { children: ReactNode }) {
  const [onlineByUserId, setOnlineByUserId] = useState<Record<string, boolean>>({});
  const [lastSeenByUserId, setLastSeenByUserId] = useState<Record<string, string>>({});

  const applySnapshot = useCallback(
    (payload: { onlineUserIds?: string[]; lastSeenByUser?: Record<string, string> } | null | undefined) => {
      if (!payload) return;
      const nextOnline: Record<string, boolean> = {};
      for (const id of payload.onlineUserIds ?? []) nextOnline[id] = true;
      setOnlineByUserId(nextOnline);
      if (payload.lastSeenByUser && Object.keys(payload.lastSeenByUser).length > 0) {
        setLastSeenByUserId((prev) => ({ ...prev, ...payload.lastSeenByUser }));
      }
    },
    [],
  );

  const refreshUser = useCallback(async (userId: string) => {
    try {
      const r = await fetch(`/presence/users/${userId}`);
      if (!r.ok) return;
      const j = (await r.json()) as { online: boolean; lastSeenAt: string | null };
      setOnlineByUserId((p) => ({ ...p, [userId]: j.online }));
      if (j.lastSeenAt) {
        setLastSeenByUserId((p) => ({ ...p, [userId]: j.lastSeenAt! }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let socket: Socket | null = null;
    let cancelled = false;

    void (async () => {
      const r = await fetch('/auth/me', { credentials: 'include' });
      if (!r.ok || cancelled) return;
      socket = io(SOCKET_URL, { withCredentials: true });
      socket.on('presence-snapshot', applySnapshot);
      socket.on('presence-changed', (payload: { userId: string; online: boolean; lastSeenAt?: string }) => {
        if (!payload?.userId) return;
        setOnlineByUserId((prev) => ({ ...prev, [payload.userId]: payload.online }));
        if (!payload.online && payload.lastSeenAt) {
          setLastSeenByUserId((prev) => ({ ...prev, [payload.userId]: payload.lastSeenAt! }));
        }
      });
    })();

    return () => {
      cancelled = true;
      socket?.removeAllListeners();
      socket?.disconnect();
    };
  }, [applySnapshot]);

  const value = useMemo<PresenceContextValue>(
    () => ({
      onlineByUserId,
      lastSeenByUserId,
      refreshUser,
    }),
    [onlineByUserId, lastSeenByUserId, refreshUser],
  );

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}
