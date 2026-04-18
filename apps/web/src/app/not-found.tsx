import Link from 'next/link';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted px-4">
      <div className="mx-auto w-full max-w-md space-y-6 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-primary shadow-lg">
          <Search size={40} strokeWidth={1.8} className="text-primary" aria-hidden />
        </div>
        <div>
          <h1 className="text-4xl font-black tracking-tight text-foreground">404</h1>
          <p className="mt-2 text-lg text-muted-foreground">Страница не найдена</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Возможно, объявление было удалено или ссылка устарела.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:shadow-xl hover:shadow-primary/20"
        >
          <Home size={20} strokeWidth={1.8} className="text-white" aria-hidden />
          На главную
        </Link>
      </div>
    </div>
  );
}
