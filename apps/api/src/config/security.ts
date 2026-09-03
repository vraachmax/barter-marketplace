const LOCAL_JWT_SECRET = 'local-development-secret-do-not-use-in-production';

export function getJwtSecret(): string {
  const configured = process.env.JWT_SECRET?.trim();
  if (configured) return configured;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured in production');
  }

  return LOCAL_JWT_SECRET;
}

export function getAllowedCorsOrigins(): Set<string> {
  const configured = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

  if (configured.length > 0) return new Set(configured);
  if (process.env.NODE_ENV === 'production') return new Set();

  return new Set(['http://127.0.0.1:3000', 'http://localhost:3000']);
}
