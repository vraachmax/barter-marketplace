import type { ChatMessage } from './api';

/**
 * Group adjacent photos from the SAME sender into one gallery. A captioned
 * photo or a non-photo message is an explicit boundary. Never manufacture
 * photos to match illustrative mockups.
 */
export function collectThreadAlbums(messages: ChatMessage[]) {
  const starts = new Map<string, ChatMessage[]>();
  const hidden = new Set<string>();
  let index = 0;
  const eligible = (item: ChatMessage) =>
    !item.isAssistant && item.mediaType === 'IMAGE' &&
    Boolean(item.mediaUrl) && (!item.text.trim() || item.text.trim() === 'Фото');
  while (index < messages.length) {
    const first = messages[index];
    if (!eligible(first)) { index++; continue; }
    const batch: ChatMessage[] = [first];
    let cursor = index + 1;
    while (cursor < messages.length) {
      const next = messages[cursor];
      const previous = messages[cursor - 1];
      const timeGap = new Date(next.createdAt).getTime() - new Date(previous.createdAt).getTime();
      if (!eligible(next) || next.senderId !== first.senderId ||
          !Number.isFinite(timeGap) || timeGap < 0 || timeGap > 5 * 60 * 1000) break;
      batch.push(next);
      cursor++;
    }
    if (batch.length > 1) {
      starts.set(first.id, batch);
      for (const following of batch.slice(1)) hidden.add(following.id);
      index = cursor;
    } else index++;
  }
  return { starts, hidden };
}

export function threadDayLabel(iso: string, today = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (day === now) return 'Сегодня';
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).getTime();
  if (day === yesterday) return 'Вчера';
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function isNewThreadDay(iso: string, previousIso?: string): boolean {
  if (!previousIso) return true;
  const current = new Date(iso);
  const previous = new Date(previousIso);
  return current.getFullYear() !== previous.getFullYear()
    || current.getMonth() !== previous.getMonth()
    || current.getDate() !== previous.getDate();
}
