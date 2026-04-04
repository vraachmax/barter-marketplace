import Link from 'next/link';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 px-4 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-md space-y-6 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-sky-100 to-cyan-100 shadow-lg dark:from-sky-950/60 dark:to-cyan-950/40">
          <Search size={40} strokeWidth={1.8} className="text-sky-600 dark:text-sky-400" aria-hidden />
        </div>
        <div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">404</h1>
          <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">Страница не найдена</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
            Возможно, объявление было удалено или ссылка устарела.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-600/25 transition hover:shadow-xl hover:shadow-sky-600/30"
        >
          <Home size={20} strokeWidth={1.8} className="text-white" aria-hidden />
          На главную
        </Link>
      </div>
    </div>
  );
}
