'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { useCallback, useState } from 'react';

const RADIUS_OPTIONS = [
  { value: '5', label: '5 км' },
  { value: '10', label: '10 км' },
  { value: '25', label: '25 км' },
  { value: '50', label: '50 км' },
  { value: '100', label: '100 км' },
];

type Props = {
  /** Текущий радиус из URL (строка) */
  radiusKm: string;
  /** Есть ли валидные координаты для режима «рядом» */
  geoActive: boolean;
};

/**
 * Кнопка геолокации + выбор радиуса для sort=nearby (сохраняет остальные query-параметры главной).
 */
export function HomeNearbyControls({ radiusKm, geoActive }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pushWithGeo = useCallback(
    (lat: number, lon: number, radius: string) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set('sort', 'nearby');
      p.set('lat', String(lat));
      p.set('lon', String(lon));
      p.set('radiusKm', radius);
      router.push(`/?${p.toString()}`);
    },
    [router, searchParams],
  );

  const onLocate = () => {
    setErr(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setErr('Геолокация не поддерживается браузером');
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        const r = radiusKm && RADIUS_OPTIONS.some((o) => o.value === radiusKm) ? radiusKm : '25';
        pushWithGeo(pos.coords.latitude, pos.coords.longitude, r);
      },
      () => {
        setBusy(false);
        setErr('Не удалось получить координаты. Проверьте разрешения для сайта.');
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  };

  const onRadiusChange = (next: string) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('radiusKm', next);
    if (geoActive && p.get('lat') && p.get('lon')) {
      p.set('sort', 'nearby');
      router.push(`/?${p.toString()}`);
    } else {
      router.push(`/?${p.toString()}`);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-[#f0f0f0] p-3 dark:bg-zinc-900 md:flex-row md:items-center md:justify-between md:gap-4 md:p-3.5">
      <div className="flex flex-wrap items-center gap-2 text-sm text-[#1a1a1a] dark:text-zinc-100">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-[#00B4D8] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          <MapPin size={14} strokeWidth={1.8} className="shrink-0" aria-hidden />
          Рядом
        </span>
        <span className="text-[#6b7280] text-xs">Объявления в радиусе от вас, сортировка по расстоянию.</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-[#6b7280]">
          <span>Радиус</span>
          <select
            value={RADIUS_OPTIONS.some((o) => o.value === radiusKm) ? radiusKm : '25'}
            onChange={(e) => onRadiusChange(e.target.value)}
            className="h-9 rounded-lg bg-[#f7f7f7] px-2 text-sm font-medium text-[#1a1a1a] dark:bg-zinc-950 dark:text-zinc-100"
          >
            {RADIUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={onLocate}
          className="h-9 rounded-lg bg-[#00B4D8] px-3 text-xs font-semibold text-white transition hover:bg-[#0096b5] disabled:opacity-60"
        >
          {busy ? 'Определяем…' : 'Моё местоположение'}
        </button>
      </div>
      {err ? <p className="text-xs text-red-600 dark:text-red-400 md:w-full">{err}</p> : null}
      {!geoActive && searchParams.get('sort') === 'nearby' ? (
        <p className="text-xs text-[#6b7280] md:w-full">
          Выберите «Моё местоположение» или укажите lat/lon в ссылке — иначе лента показывается без геосортировки.
        </p>
      ) : null}
    </div>
  );
}
