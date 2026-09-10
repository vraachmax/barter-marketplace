'use client';

import Link from 'next/link';
import { useEffect, useReducer, useRef, useState } from 'react';
import { Heart, Home, LoaderCircle, RefreshCw, Trash2 } from 'lucide-react';
import { API_URL, apiFetchJson, type FavoriteItem } from '@/lib/api';
import { favoritesReducer, initialFavoritesState } from '@/lib/favorites-state';
import { useAuth } from '@/components/auth-provider';
import { ListingCardComponent, ListingCardSkeleton } from '@/components/listing-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const linkClass = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-border bg-card px-5 text-base font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function FavoritesPage() {
  const { ready, token } = useAuth();
  const [attempt, setAttempt] = useState(0);
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <header className="glass-panel sticky top-0 z-30 border-b border-border/60 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-muted text-foreground">
              <Heart size={22} aria-hidden />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Избранное</h1>
              <p className="text-xs text-muted-foreground">Сохранённые объявления</p>
            </div>
          </div>
          <Link href="/" className={linkClass} aria-label="На главную">
            <Home size={18} aria-hidden /><span className="hidden sm:inline">На главную</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-32 pt-5 md:pb-12">
        {ready ? (
          <FavoritesContent key={`${token ?? 'guest'}:${attempt}`} onRetry={() => setAttempt((value) => value + 1)} />
        ) : <FavoritesLoading />}
      </main>
    </div>
  );
}

function FavoritesLoading() {
  return (
    <div role="status" aria-label="Загружаем избранное" aria-busy="true">
      <span className="sr-only">Загружаем избранное…</span>
      <div aria-hidden="true" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 6 }, (_, i) => <ListingCardSkeleton key={i} thumbHeight={160} />)}
      </div>
    </div>
  );
}

function FavoritesContent({ onRetry }: { onRetry: () => void }) {
  const [state, dispatch] = useReducer(favoritesReducer, initialFavoritesState);
  const requests = useRef(new Map<string, AbortController>());

  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    const activeRequests = requests.current;
    const timeout = setTimeout(() => controller.abort(), 15000);
    void apiFetchJson<FavoriteItem[]>('/favorites', { signal: controller.signal }).then((result) => {
      clearTimeout(timeout);
      if (disposed) return;
      dispatch(result.ok ? { type: 'loaded', items: result.data } : { type: 'load-failed', status: result.status });
    });
    return () => {
      disposed = true;
      clearTimeout(timeout);
      controller.abort();
      activeRequests.forEach((request) => request.abort());
      activeRequests.clear();
    };
  }, []);

  async function remove(id: string) {
    if (requests.current.has(id)) return;
    const controller = new AbortController();
    requests.current.set(id, controller);
    dispatch({ type: 'remove-start', id });
    const timeout = setTimeout(() => controller.abort(), 15000);
    const result = await apiFetchJson<{ ok: true }>(`/favorites/${encodeURIComponent(id)}`, {
      method: 'DELETE', signal: controller.signal,
    });
    clearTimeout(timeout);
    if (requests.current.get(id) !== controller) return;
    requests.current.delete(id);
    dispatch(result.ok ? { type: 'remove-done', id } : { type: 'remove-failed', id, status: result.status });
  }

  if (state.phase === 'loading') return <FavoritesLoading />;
  if (state.phase === 'unauthorized' || state.phase === 'error') {
    const needsLogin = state.phase === 'unauthorized';
    return (
      <Card className="mx-auto max-w-lg items-center rounded-3xl p-6 text-center md:p-10">
        <Heart className="text-[var(--mode-accent)]" size={32} aria-hidden />
        <h2 className="text-xl font-bold">{needsLogin ? 'Сохраните то, что понравилось' : 'Не удалось загрузить избранное'}</h2>
        <p role={needsLogin ? undefined : 'alert'} className="text-sm text-muted-foreground">
          {needsLogin ? 'Войдите в аккаунт, чтобы увидеть сохранённые объявления. После входа вернём вас сюда.' : 'Проверьте подключение и попробуйте ещё раз.'}
        </p>
        {needsLogin ? <Link href="/auth?next=%2Ffavorites" className={linkClass}>Войти в аккаунт</Link> : (
          <Button onClick={onRetry} size="lg"><RefreshCw size={18} aria-hidden />Попробовать снова</Button>
        )}
        <Link href="/" className={linkClass}>Посмотреть объявления</Link>
      </Card>
    );
  }

  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">{state.notice}</p>
      {state.items.length === 0 ? (
        <Card className="mx-auto max-w-lg items-center rounded-3xl p-6 text-center md:p-10">
          <span className="grid size-16 place-items-center rounded-2xl bg-[var(--mode-accent-soft)] text-[var(--mode-accent)]"><Heart size={32} aria-hidden /></span>
          <h2 className="text-xl font-bold">Здесь будут ваши находки</h2>
          <p className="text-sm text-muted-foreground">Откройте объявление и добавьте его в избранное, чтобы не потерять.</p>
          <Link href="/" className={linkClass}>Найти интересное</Link>
        </Card>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">Сохранено: {state.items.length}</p>
          <div className="grid grid-cols-2 items-start gap-x-3 gap-y-6 md:grid-cols-3 lg:grid-cols-4">
            {state.items.map((item) => {
              const id = item.listing.id;
              const pending = state.pending.includes(id);
              return (
                <div key={item.id} className="relative">
                  <ListingCardComponent data={item.listing} apiBase={API_URL} thumbHeight={160} />
                  <Button
                    variant="secondary" size="icon" disabled={pending} aria-busy={pending}
                    aria-label={`Удалить из избранного: ${item.listing.title}`}
                    onClick={() => void remove(id)}
                    className="absolute right-2 top-2 z-[3] size-11 rounded-full bg-background/95 shadow-sm hover:bg-destructive/10 hover:text-destructive"
                  >
                    {pending ? <LoaderCircle size={18} className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Trash2 size={18} aria-hidden />}
                  </Button>
                  {state.errors[id] ? <p role="alert" className="mt-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">{state.errors[id]}</p> : null}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
