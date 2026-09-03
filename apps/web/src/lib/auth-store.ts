/**
 * Хранилище JWT-токена.
 * Клиент использует Bearer-токен из localStorage. Сервер выставляет отдельную
 * httpOnly cookie для запросов, где cookie-аутентификация уместна.
 */

const LS_KEY = "barter_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LS_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LS_KEY);
}
