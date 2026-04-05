import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Избранное',
  description: 'Ваши сохранённые объявления на Barter.',
};

export default function FavoritesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
