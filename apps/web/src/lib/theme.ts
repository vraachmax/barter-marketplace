export type ThemePreference = 'SYSTEM' | 'LIGHT' | 'DARK';
export type AppliedTheme = 'light' | 'dark';
export const THEME_EVENT = 'barter-theme-change';
const STORAGE_KEY = 'barter_theme_pref';

export function resolveTheme(preference: ThemePreference): AppliedTheme {
  if (preference === 'LIGHT') return 'light';
  if (preference === 'DARK') return 'dark';
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getStoredThemePreference(): ThemePreference | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === 'SYSTEM' || raw === 'LIGHT' || raw === 'DARK' ? raw : null;
  } catch { return null; }
}

export function getCurrentThemePreference(): ThemePreference {
  if (typeof document === 'undefined') return 'LIGHT';
  const value = document.documentElement.getAttribute('data-theme-pref');
  return value === 'SYSTEM' || value === 'DARK' || value === 'LIGHT' ? value : 'LIGHT';
}

export function applyThemePreference(preference: ThemePreference, persist = true) {
  if (typeof window === 'undefined') return;
  const resolved = resolveTheme(preference);
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  root.classList.toggle('dark', resolved === 'dark');
  root.setAttribute('data-theme-pref', preference);
  if (persist) {
    try { window.localStorage.setItem(STORAGE_KEY, preference); } catch { /* The current page still switches when storage is unavailable. */ }
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function subscribeTheme(listener: () => void) {
  window.addEventListener(THEME_EVENT, listener);
  return () => window.removeEventListener(THEME_EVENT, listener);
}

export function reapplyCurrentTheme() {
  applyThemePreference(getCurrentThemePreference(), false);
}

