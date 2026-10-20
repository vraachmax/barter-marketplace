export type ChatListFilter = 'all' | 'purchase' | 'barter' | 'buyer' | 'seller' | 'unread';

type SearchableChat = {
  myRole?: 'buyer' | 'seller' | 'neutral';
  unreadCount: number;
  listing?: { title?: string | null; barterEnabled?: boolean | null; isBarter?: boolean | null; saleEnabled?: boolean | null } | null;
  peer?: { name?: string | null; email?: string | null; phone?: string | null } | null;
  lastMessage?: { text?: string | null } | null;
};

export function filterChatList<T extends SearchableChat>(chats: readonly T[], query: string, filter: ChatListFilter): T[] {
  const search = query.trim().toLocaleLowerCase('ru-RU');
  return chats.filter((chat) => {
    if (filter === 'unread' && chat.unreadCount <= 0) return false;
    // Combined offers live in both streams; legacy listings are purchase-only.
    const isExchange = Boolean(chat.listing?.barterEnabled ?? chat.listing?.isBarter);
    const isPurchase = chat.listing?.saleEnabled ?? !isExchange;
    if (filter === 'purchase' && !isPurchase) return false;
    if (filter === 'barter' && !isExchange) return false;
    if ((filter === 'buyer' || filter === 'seller') && chat.myRole !== filter) return false;
    if (!search) return true;
    return [chat.listing?.title, chat.peer?.name, chat.peer?.email, chat.peer?.phone, chat.lastMessage?.text]
      .some((value) => value?.toLocaleLowerCase('ru-RU').includes(search));
  });
}
