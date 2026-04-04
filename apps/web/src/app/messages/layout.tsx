import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Сообщения',
  description: 'Ваши диалоги с продавцами и покупателями на Barter.',
};

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
