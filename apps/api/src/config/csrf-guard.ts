/**
 * Cross-site request forgery guard for cookie-authenticated mutations.
 *
 * CORS is not CSRF protection. Reject forged requests before any controller
 * and before Multer parses the body. Bearer-only native clients are unaffected.
 */
export type RequestSecurityHeaders = Record<string, string | string[] | undefined>;
export function isUnsafeMethod(method: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method.toUpperCase());
}
function firstHeader(headers: RequestSecurityHeaders, key: string): string | undefined {
  const raw = headers[key];
  return typeof raw === 'string' ? raw.trim() : undefined;
}
function requestOrigin(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password)
      return null;
    return parsed.origin;
  } catch { return null; }
}
export function isAllowedCookieMutation(input: {
  method: string; headers: RequestSecurityHeaders;
  cookies?: Record<string, unknown>; allowedOrigins: ReadonlySet<string>;
  ownOrigin: string;
}): boolean {
  if (!isUnsafeMethod(input.method) || typeof input.cookies?.token !== 'string' ||
      !input.cookies.token) return true;
  const { headers } = input;
  const originHeader = firstHeader(headers,'origin');
  const fetchSite = firstHeader(headers,'sec-fetch-site');
  if (fetchSite === 'cross-site') return false;
  // Modern browsers send Origin on cross-origin and unsafe same-origin requests.
  // Missing origin is rejected for cookie-authenticated mutation even if Referer
  // is present: opaque/null origins must not silently acquire privileges.
  const origin = requestOrigin(originHeader);
  if (!origin) return false;
  return origin === input.ownOrigin || input.allowedOrigins.has(origin);
}
