'use client';

import { MapPin } from 'lucide-react';

type Props = {
  latitude: number;
  longitude: number;
  city: string;
};

/**
 * Мини-карта — статичное превью через Яндекс Static Maps API (бесплатно, РФ-совместимо).
 * При клике открывает Яндекс.Карты.
 */
export function ListingMiniMap({ latitude, longitude, city }: Props) {
  const zoom = 14;
  const staticUrl = `https://static-maps.yandex.ru/v1?ll=${longitude},${latitude}&z=${zoom}&size=400,200&l=map&pt=${longitude},${latitude},pm2blm`;
  const yandexUrl = `https://yandex.ru/maps/?pt=${longitude},${latitude}&z=${zoom}&l=map`;

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <a
        href={yandexUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block aspect-[2/1] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={staticUrl}
          alt={`Карта: ${city}`}
          className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100 dark:brightness-[0.85] dark:contrast-110"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-sky-600 text-white shadow-lg shadow-sky-600/30 ring-4 ring-white/80 dark:ring-zinc-900/80">
            <MapPin size={22} strokeWidth={1.8} className="text-white" aria-hidden />
          </span>
        </div>
        <span className="absolute bottom-2 right-2 rounded-lg bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          Открыть на Яндекс.Картах
        </span>
      </a>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <MapPin size={14} strokeWidth={1.8} className="shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{city}</span>
      </div>
    </div>
  );
}
