export type ThemePreference = 'SYSTEM' | 'LIGHT' | 'DARK';
export type AppliedTheme = 'light' | 'dark';

const STORAGE_KEY = 'barter_theme_pref';

function systemTheme(): AppliedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveTheme(preference: ThemePreference): AppliedTheme {
  if (preference === 'LIGHT') return 'light';
  if (preference === 'DARK') return 'dark';
  return systemTheme();
}

export function getStoredThemePreference(): ThemePreference | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === 'SYSTEM' || raw === 'LIGHT' || raw === 'DARK') return raw;
  return null;
}

export function applyThemePreference(preference: ThemePreference) {
  if (typeof window === 'undefined') return;
  const resolved = resolveTheme(preference);
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  root.classList.toggle('dark', resolved === 'dark');
  root.setAttribute('data-theme-pref', preference);
  window.localStorage.setItem(STORAGE_KEY, preference);
}

export function reapplyCurrentTheme() {
  if (typeof window === 'undefined') return;
  const prefAttr = document.documentElement.getAttribute('data-theme-pref');
  const pref: ThemePreference =
    prefAttr === 'LIGHT' || prefAttr === 'DARK' || prefAttr === 'SYSTEM' ? prefAttr : 'SYSTEM';
  applyThemePreference(pref);
}

