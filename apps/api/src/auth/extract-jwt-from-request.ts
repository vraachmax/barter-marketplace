/** Извлечь JWT из cookie `token` или заголовка Authorization (как в JwtStrategy). */
export function extractJwtFromRequest(req: { cookies?: any; headers?: any }): string | null {
  const token = req?.cookies?.token;
  if (typeof token === 'string' && token.length > 0) return token;
  const auth = req?.headers?.authorization;
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7);
  }
  return null;
}
