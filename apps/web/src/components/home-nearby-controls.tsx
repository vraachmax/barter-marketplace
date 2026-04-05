'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { useCallback, useState } from 'react';

const RADIUS_OPTIONS = [
  { value: '5', label: '5 ÐºÐ¼' },
  { value: '10', label: '10 ÐºÐ¼' },
  { value: '25', label: '25 ÐºÐ¼' },
  { value: '50', label: '50 ÐºÐ¼' },
  { value: '100', label: '100 ÐºÐ¼' },
];

type Props = {
  /** Ð¢ÐµÐºÑÑÐ¸Ð¹ ÑÐ°Ð´Ð¸ÑÑ Ð¸Ð· URL (ÑÑÑÐ¾ÐºÐ°) */
  radiusKm: string;
  /** ÐÑÑÑ Ð»Ð¸ Ð²Ð°Ð»Ð¸Ð´Ð½ÑÐµ ÐºÐ¾Ð¾ÑÐ´Ð¸Ð½Ð°ÑÑ Ð´Ð»Ñ ÑÐµÐ¶Ð¸Ð¼Ð° Â«ÑÑÐ´Ð¾Ð¼Â» */
  geoActive: boolean;
};

/**
 * ÐÐ½Ð¾Ð¿ÐºÐ° Ð³ÐµÐ¾Ð»Ð¾ÐºÐ°ÑÐ¸Ð¸ + Ð²ÑÐ±Ð¾Ñ ÑÐ°Ð´Ð¸ÑÑÐ° Ð´Ð»Ñ sort=nearby (ÑÐ¾ÑÑÐ°Ð½ÑÐµÑ Ð¾ÑÑÐ°Ð»ÑÐ½ÑÐµ query-Ð¿Ð°ÑÐ°Ð¼ÐµÑÑÑ Ð³Ð»Ð°Ð²Ð½Ð¾Ð¹).
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
      setErr('ÐÐµÐ¾Ð»Ð¾ÐºÐ°ÑÐ¸Ñ Ð½Ðµ Ð¿Ð¾Ð´Ð´ÐµÑÐ¶Ð¸Ð²Ð°ÐµÑÑÑ Ð±ÑÐ°ÑÐ·ÐµÑÐ¾Ð¼');
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
        setErr('ÐÐµ ÑÐ´Ð°Ð»Ð¾ÑÑ Ð¿Ð¾Ð»ÑÑÐ¸ÑÑ ÐºÐ¾Ð¾ÑÐ´Ð¸Ð½Ð°ÑÑ. ÐÑÐ¾Ð²ÐµÑÑÑÐµ ÑÐ°Ð·ÑÐµÑÐµÐ½Ð¸Ñ Ð´Ð»Ñ ÑÐ°Ð¹ÑÐ°.');
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
        <span className="inline-flex items-center gap-1.5 rounded-md bg-[#007AFF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          <MapPin size={14} strokeWidth={1.8} className="shrink-0" aria-hidden />
          Ð ÑÐ´Ð¾Ð¼
        </span>
        <span className="text-[#6b7280] text-xs">ÐÐ±ÑÑÐ²Ð»ÐµÐ½Ð¸Ñ Ð² ÑÐ°Ð´Ð¸ÑÑÐµ Ð¾Ñ Ð²Ð°Ñ, ÑÐ¾ÑÑÐ¸ÑÐ¾Ð²ÐºÐ° Ð¿Ð¾ ÑÐ°ÑÑÑÐ¾ÑÐ½Ð¸Ñ.</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-[#6b7280]">
          <span>Ð Ð°Ð´Ð¸ÑÑ</span>
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
          className="h-9 rounded-lg bg-[#007AFF] px-3 text-xs font-semibold text-white transition hover:bg-[#0066DD] disabled:opacity-60"
        >
          {busy ? 'ÐÐ¿ÑÐµÐ´ÐµÐ»ÑÐµÐ¼â¦' : 'ÐÐ¾Ñ Ð¼ÐµÑÑÐ¾Ð¿Ð¾Ð»Ð¾Ð¶ÐµÐ½Ð¸Ðµ'}
        </button>
      </div>
      {err ? <p className="text-xs text-red-600 dark:text-red-400 md:w-full">{err}</p> : null}
      {!geoActive && searchParams.get('sort') === 'nearby' ? (
        <p className="text-xs text-[#6b7280] md:w-full">
          ÐÑÐ±ÐµÑÐ¸ÑÐµ Â«ÐÐ¾Ñ Ð¼ÐµÑÑÐ¾Ð¿Ð¾Ð»Ð¾Ð¶ÐµÐ½Ð¸ÐµÂ» Ð¸Ð»Ð¸ ÑÐºÐ°Ð¶Ð¸ÑÐµ lat/lon Ð² ÑÑÑÐ»ÐºÐµ â Ð¸Ð½Ð°ÑÐµ Ð»ÐµÐ½ÑÐ° Ð¿Ð¾ÐºÐ°Ð·ÑÐ²Ð°ÐµÑÑÑ Ð±ÐµÐ· Ð³ÐµÐ¾ÑÐ¾ÑÑÐ¸ÑÐ¾Ð²ÐºÐ¸.
        </p>
      ) : null}
    </div>
  );
}
