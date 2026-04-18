'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error('[Barter error boundary]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center bg-muted px-4 py-10">
      <div className="mx-auto w-full max-w-md space-y-6 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-primary shadow-lg">
          <AlertTriangle size={40} strokeWidth={1.8} className="text-accent" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Что-то пошло не так
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Произошла ошибка при загрузке страницы. Попробуйте обновить или вернитесь на главную.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted/50"
          >
            <RefreshCw size={18} strokeWidth={1.8} aria-hidden />
            Повторить
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:shadow-xl"
          >
            <Home size={18} strokeWidth={1.8} className="text-white" aria-hidden />
            На главную
          </Link>
        </div>

        {/* Diagnostic block — позволяет увидеть причину ошибки и сослаться на digest при обращении в поддержку */}
        <div className="mt-6 text-left">
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="text-xs font-semibold text-muted-foreground underline-offset-2 hover:underline"
          >
            {showDetails ? 'Скрыть подробности' : 'Подробности ошибки'}
          </button>
          {showDetails ? (
            <div className="mt-2 max-h-72 overflow-auto rounded-xl border border-border bg-card p-3 text-left">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Сообщение
              </div>
              <pre className="mt-1 break-words whitespace-pre-wrap text-xs text-foreground">
                {error?.message || '(без сообщения)'}
              </pre>
              {error?.digest ? (
                <>
                  <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Digest (для поддержки)
                  </div>
                  <pre className="mt-1 text-xs text-muted-foreground">{error.digest}</pre>
                </>
              ) : null}
              {error?.stack ? (
                <>
                  <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Stack
                  </div>
                  <pre className="mt-1 max-h-40 overflow-auto text-[10px] leading-snug text-muted-foreground">
                    {error.stack}
                  </pre>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
