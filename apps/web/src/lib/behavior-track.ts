import { API_URL } from '@/lib/api';
import { getOrCreateAnonymousId, getOrCreateSessionId } from '@/lib/behavior-context';

export type BehaviorEventType = 'view_item' | 'click_item' | 'add_to_favorites' | 'send_message';

/**
 * Пакетная отправка событий в Postgres (модуль аналитики API).
 * JWT в cookie опционален — тогда пишется anonymous_id.
 */
export async function trackBehaviorEvents(
  events: Array<{ type: BehaviorEventType; listingId: string; occurredAt?: string }>,
): Promise<void> {
  if (typeof window === 'undefined' || events.length === 0) return;
  const sessionId = getOrCreateSessionId();
  const anonymousId = getOrCreateAnonymousId();
  if (!sessionId || !anonymousId) return;

  try {
    await fetch(`${API_URL}/analytics/events`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, anonymousId, events }),
    });
  } catch {
    // не блокируем UX
  }
}
