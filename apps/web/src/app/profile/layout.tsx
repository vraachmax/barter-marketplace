import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Личный кабинет',
  description: 'Управляйте объявлениями, настройками и заказами в кабинете Barter.',
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
