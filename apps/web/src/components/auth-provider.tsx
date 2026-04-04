'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getToken, setToken as storeToken, clearToken } from '@/lib/auth-store';
import type { AuthMe } from '@/lib/api';

type AuthState = {
  ready: boolean;
  user: AuthMe | null;
  token: string | null;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  ready: false,
  user: null,
  token: null,
  login: async () => {},
  logout: async () => {},
  refresh: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

async function fetchMe(token: string): Promise<AuthMe | null> {
  try {
    const res = await fetch('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthMe | null>(null);
  const [token, setTokenState] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const t = getToken();
    if (!t) {
      setUser(null);
      setTokenState(null);
      setReady(true);
      return;
    }
    setTokenState(t);
    const me = await fetchMe(t);
    if (me) {
      setUser(me);
    } else {
      clearToken();
      setUser(null);
      setTokenState(null);
    }
    setReady(true);
  }, []);

  const login = useCallback(async (newToken: string) => {
    storeToken(newToken);
    setTokenState(newToken);
    const me = await fetchMe(newToken);
    setUser(me);
    setReady(true);
  }, []);

  const logout = useCallback(async () => {
    clearToken();
    setUser(null);
    setTokenState(null);
    try { await fetch('/auth/logout', { method: 'POST' }); } catch {}
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ ready, user, token, login, logout, refresh }),
    [ready, user, token, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
