export type ChatListFilter = 'all' | 'buyer' | 'seller' | 'unread';

type SearchableChat = {
  myRole?: 'buyer' | 'seller' | 'neutral';
  unreadCount: number;
  listing?: { title?: string | null } | null;
  peer?: { name?: string | null; email?: string | null; phone?: string | null } | null;
  lastMessage?: { text?: string | null } | null;
};

export function filterChatList<T extends SearchableChat>(chats: readonly T[], query: string, filter: ChatListFilter): T[] {
  const search = query.trim().toLocaleLowerCase('ru-RU');
  return chats.filter((chat) => {
    if (filter === 'unread' && chat.unreadCount <= 0) return false;
    if ((filter === 'buyer' || filter === 'seller') && chat.myRole !== filter) return false;
    if (!search) return true;
    return [chat.listing?.title, chat.peer?.name, chat.peer?.email, chat.peer?.phone, chat.lastMessage?.text]
      .some((value) => value?.toLocaleLowerCase('ru-RU').includes(search));
  });
}
