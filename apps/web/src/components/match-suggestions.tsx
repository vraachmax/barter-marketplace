'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeftRight, Sparkles } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { resolveAssetUrl } from '@/lib/api';

type Match = {
  listingId: string;
  score: number;
  reasons: string[];
  cashGapRub: number | null;
  listing: {
    id: string;
    title: string;
    priceRub: number | null;
    city: string;
    owner: { id: string; name: string | null };
    images: Array<{ url: string }>;
  } | null;
};
type Response = { matches: Match[]; algorithmVersion: string };

export default function MatchSuggestions({
  listingId, sellerId, barterEnabled, active,
}: {
  listingId: string; sellerId: string; barterEnabled: boolean; active: boolean;
}) {
  const { ready, user, token } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const owner = ready && Boolean(user?.id && user.id === sellerId);
  useEffect(() => {
    if (!owner || !token || !barterEnabled || !active) return;
    const controller = new AbortController();
    fetch('/api/backend/match/listings/' + encodeURIComponent(listingId) + '?limit=8', {
      headers: { Authorization: 'Bearer ' + token },
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async response => {
        if (!response.ok) throw new Error('match_api_' + response.status);
        return response.json() as Promise<Response>;
      })
      .then(data => {
        if (controller.signal.aborted) return;
        setMatches(Array.isArray(data.matches) ? data.matches : []);
        setStatus('ready');
      })
      .catch(() => { if (!controller.signal.aborted) setStatus('error'); });
    return () => controller.abort();
  }, [owner, token, listingId, barterEnabled, active]);

  if (!owner || !barterEnabled || !active) return null;
  return (
    <section aria-labelledby="barter-match-heading" className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={20} className="text-orange-500" aria-hidden />
        <h2 id="barter-match-heading" className="text-lg font-semibold">Подходящие обмены</h2>
      </div>
      {status === 'loading' && <p role="status" className="text-sm text-muted-foreground">Подбираем взаимные предложения…</p>}
      {status === 'error' && <p role="status" className="text-sm text-muted-foreground">Не удалось загрузить подбор. Попробуйте открыть объявление позже.</p>}
      {status === 'ready' && matches.length === 0 && (
        <p className="text-sm text-muted-foreground">Взаимных совпадений пока нет. Проверьте пожелания к обмену в своём объявлении.</p>
      )}
      {status === 'ready' && matches.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {matches.filter(m => m.listing).map(match => {
            const card = match.listing!;
            const imageUrl = resolveAssetUrl(card.images?.[0]?.url);
            return (
              <Link key={match.listingId} href={'/listing/' + encodeURIComponent(card.id)}
                className="flex min-w-0 gap-3 rounded-xl bg-neutral-50 p-3 transition-colors hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-orange-500">
                {imageUrl ? (
                  // The API supports both external licensed demo images and local uploads.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="" loading="lazy" className="size-16 shrink-0 rounded-lg object-cover" />
                ) : <span aria-hidden className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-orange-100"><ArrowLeftRight size={22} className="text-orange-500" /></span>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{card.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{card.city} · {card.priceRub == null ? 'Цена не указана' : card.priceRub.toLocaleString('ru-RU') + ' ₽'}</span>
                  <span className="mt-1 block text-xs text-orange-700">Совпадение {Math.round(match.score)}%</span>
                  <span className="block line-clamp-2 text-xs text-muted-foreground">{match.reasons.join(' · ')}</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Рекомендации не означают согласие второй стороны. Обмен подтверждается отдельно.</p>
    </section>
  );
}
