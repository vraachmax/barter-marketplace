const ANON_KEY = 'barter_anon_id';
const SESS_KEY = 'barter_session_id';

function newId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

/** Стабильный анонимный профиль (localStorage) для склейки с user_id после логина. */
export function getOrCreateAnonymousId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id || id.length < 8) {
      id = newId();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

/** Сессия вкладки (sessionStorage). */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = sessionStorage.getItem(SESS_KEY);
    if (!id || id.length < 8) {
      id = newId();
      sessionStorage.setItem(SESS_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

/** Заголовки для API-запросов с браузера (чаты, избранное, просмотр с клиента). */
export function behaviorRequestHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const sessionId = getOrCreateSessionId();
  const anonymousId = getOrCreateAnonymousId();
  if (!sessionId || !anonymousId) return {};
  return {
    'x-session-id': sessionId,
    'x-anonymous-id': anonymousId,
  };
}
