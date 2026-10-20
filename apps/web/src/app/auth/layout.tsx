import type { Metadata } from 'next';
import './auth-reference.css';

export const metadata: Metadata = {
  title: 'Вход и регистрация',
  description: 'Войдите или зарегистрируйтесь на Barter — маркетплейсе объявлений.',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
