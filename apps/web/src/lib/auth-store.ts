/**
 * Хранилище JWT-токена.
 * localStorage — единственный источник правды; cookie дублируется для SSR-совместимости.
 */

const LS_KEY = 'barter_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LS_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_KEY, token);
  document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LS_KEY);
  document.cookie = 'token=; path=/; max-age=0';
}
