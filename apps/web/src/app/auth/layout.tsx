import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Вход и регистрация',
  description: 'Войдите или зарегистрируйтесь на Barter — маркетплейсе объявлений.',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
