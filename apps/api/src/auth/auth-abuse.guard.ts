import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Defense in depth on top of hosting/WAF. Instance-local counters are not
 * authoritative across replicas; production additionally needs shared rate
 * limiting at the ingress. Keys never contain raw identifiers or passwords.
 */
import { createHash } from 'node:crypto';
type Bucket = { count: number; expiresAt: number };
const attempts = new Map<string, Bucket>();
const WINDOW_MS = 15 * 60_000;
const MAX_PER_IDENTITY_AND_IP = 12;
const MAX_PER_IP = 150;

function key(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
function take(bucketKey: string, max: number, now: number): boolean {
  const current = attempts.get(bucketKey);
  if (!current || now >= current.expiresAt) {
    attempts.set(bucketKey,{count:1,expiresAt:now+WINDOW_MS});
    return true;
  }
  if (current.count >= max) return false;
  current.count += 1;
  return true;
}
export function checkAuthRateLimit(input: {
  address: string; identity: string; now?: number;
}): boolean {
  const now = input.now ?? Date.now();
  if (attempts.size > 10_000) {
    for (const [bucketKey,bucket] of attempts) {
      if (bucket.expiresAt <= now) attempts.delete(bucketKey);
    }
    // Fail closed on pathological key churn; never expand memory indefinitely.
    if (attempts.size > 20_000) return false;
  }
  const ip = input.address || 'unknown-ip';
  const normalized = input.identity.trim().toLowerCase().slice(0,320);
  const ipBucket = key('ip:' + ip);
  const identityBucket = key('identity:' + ip + ':' + normalized);
  const ipAllowed = take(ipBucket,MAX_PER_IP,now);
  const identityAllowed = take(identityBucket,MAX_PER_IDENTITY_AND_IP,now);
  return ipAllowed && identityAllowed;
}

@Injectable()
export class AuthAbuseGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const body = req.body as Record<string, unknown> | undefined;
    const email = typeof body?.email === 'string' ? body.email : '';
    const phone = typeof body?.phone === 'string' ? body.phone : '';
    if (checkAuthRateLimit({address:req.ip || req.socket.remoteAddress || 'unknown',
      identity:email || phone || 'anonymous'})) return true;
    throw new HttpException({statusCode:429,message:'auth_rate_limited'},429);
  }
}
