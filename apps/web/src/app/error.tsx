'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Barter error boundary]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center bg-zinc-100 px-4 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-md space-y-6 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-amber-100 to-orange-100 shadow-lg dark:from-amber-950/60 dark:to-orange-950/40">
          <AlertTriangle size={40} strokeWidth={1.8} className="text-amber-600 dark:text-amber-400" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
            Что-то пошло не так
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Произошла ошибка при загрузке страницы. Попробуйте обновить или вернитесь на главную.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <RefreshCw size={18} strokeWidth={1.8} aria-hidden />
            Повторить
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-600/25 transition hover:shadow-xl"
          >
            <Home size={18} strokeWidth={1.8} className="text-white" aria-hidden />
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
