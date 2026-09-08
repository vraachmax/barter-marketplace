/** Only app-local destinations, never arbitrary URLs or auth loops. */
export function authReturnPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return '/';
  try {
    const url = new URL(value, 'https://barter.invalid');
    if (url.origin !== 'https://barter.invalid' || /^\/auth(?:\/|$)/.test(url.pathname)) return '/';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}
