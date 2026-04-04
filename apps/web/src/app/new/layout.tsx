import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Подать объявление',
  description: 'Разместите бесплатное объявление на Barter. Фото, описание, цена — публикация за минуту.',
};

export default function NewListingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
