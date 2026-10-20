/**
 * Only an actual photo from the listing associated with this chat is eligible
 * for the inbox thumbnail. The API returns the earliest image (by sortOrder)
 * as listing.previewImageUrl. A missing photo must remain a neutral placeholder.
 *
 * Important: category icons are navigation artwork and must never be shown
 * as if they were the seller's listing photos.
 */
export type ChatListingWithPhoto = {
  previewImageUrl?: string | null;
  category?: { title?: string | null } | null;
} | null | undefined;

export function getChatThumbnailSource(listing: ChatListingWithPhoto): string | null {
  const url = listing?.previewImageUrl?.trim();
  return url || null;
}
