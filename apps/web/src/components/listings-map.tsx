'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { API_URL } from '@/lib/api';

type Pin = {
  id: string;
  title: string;
  priceRub: number | null;
  priceType?: string | null;
  city: string;
  lat: number;
  lon: number;
  category: string;
  imageUrl: string | null;
};

const PS: Record<string, string> = {
  per_day: '/сут', per_hour: '/ч', per_service: '/усл',
  per_sqm: '/м²', per_month: '/мес', per_shift: '/см',
};

function fmtPrice(v: number | null, pt?: string | null) {
  if (v == null) return 'Договорная';
  const s = PS[pt ?? ''];
  return `${v.toLocaleString('ru-RU')} ₽${s ? ' ' + s : ''}`;
}

function shortPrice(v: number | null) {
  if (v == null) return '?';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)} млн`;
  if (v >= 1_000) return `${Math.round(v / 1_000)} тыс`;
  return `${v} ₽`;
}

declare global { interface Window { ymaps?: any; } }

function loadYmaps(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (window.ymaps?.ready) { window.ymaps.ready(() => resolve(window.ymaps)); return; }
    const existing = document.querySelector('script[src*="api-maps.yandex.ru"]');
    if (existing) {
      const poll = () => { if (window.ymaps?.ready) window.ymaps.ready(() => resolve(window.ymaps)); else setTimeout(poll, 100); };
      poll(); return;
    }
    const s = document.createElement('script');
    s.src = 'https://api-maps.yandex.ru/2.1/?apikey=none&lang=ru_RU';
    s.async = true;
    s.onload = () => { const poll = () => { if (window.ymaps?.ready) window.ymaps.ready(() => resolve(window.ymaps)); else setTimeout(poll, 100); }; poll(); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

type Props = { center?: [number, number]; zoom?: number; categoryId?: string };

export default function ListingsMap({ center = [55.7558, 37.6173], zoom = 11, categoryId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [selected, setSelected] = useState<Pin | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadYmaps().then((ymaps) => {
      if (cancelled || !containerRef.current) return;
      const map = new ymaps.Map(containerRef.current, {
        center, zoom,
        type: 'yandex#map',
        controls: ['zoomControl'],
      }, {
        suppressMapOpenBlock: true,
        yandexMapDisablePoiInteractivity: true,
      });
      mapRef.current = map;
      map.controls.get('zoomControl').options.set({ position: { right: 10, top: 10 } });
      setMapReady(true);
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { cancelled = true; mapRef.current?.destroy(); mapRef.current = null; };
  }, []);

  const fetchPins = useCallback(async (bounds: number[][]) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const params = new URLSearchParams({
        swLat: String(bounds[0][0]), swLon: String(bounds[0][1]),
        neLat: String(bounds[1][0]), neLon: String(bounds[1][1]),
        limit: '300', ...(categoryId ? { categoryId } : {}),
      });
      try {
        const res = await fetch(`/listings/map?${params}`);
        const data = await res.json();
        setPins(data.pins ?? []);
      } catch { setPins([]); }
    }, 400);
  }, [categoryId]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const update = () => void fetchPins(map.getBounds());
    map.events.add('boundschange', update);
    update();
    return () => { map.events.remove('boundschange', update); };
  }, [mapReady, fetchPins]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.ymaps) return;
    const map = mapRef.current;
    const ymaps = window.ymaps;
    map.geoObjects.removeAll();

    for (const pin of pins) {
      const label = shortPrice(pin.priceRub);
      const Layout = ymaps.templateLayoutFactory.createClass(
        '<div style="' +
          'background:#0284c7;color:#fff;padding:4px 10px;border-radius:20px;' +
          'font-size:12px;font-weight:800;white-space:nowrap;' +
          'box-shadow:0 2px 10px rgba(0,0,0,.3);border:2.5px solid #fff;' +
          'cursor:pointer;transform:translate(-50%,-50%);position:absolute;' +
          'line-height:1.2;letter-spacing:-0.3px;' +
        '">' + label + '</div>'
      );
      const pm = new ymaps.Placemark([pin.lat, pin.lon], {}, {
        iconLayout: Layout,
        iconShape: { type: 'Rectangle', coordinates: [[-45, -18], [45, 18]] },
      });
      pm.events.add('click', () => {
        setSelected(pin);
        map.panTo([pin.lat, pin.lon], { duration: 300 });
      });
      map.geoObjects.add(pm);
    }
  }, [pins, mapReady]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      <div className="absolute left-3 top-3 z-[1000] rounded-xl bg-white/95 px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur-sm">
        {loading ? 'Загрузка…' : `${pins.length} объявлений`}
      </div>

      {selected ? (
        <div className="absolute bottom-4 left-1/2 z-[1000] w-[calc(100%-32px)] max-w-sm -translate-x-1/2 animate-[slideUp_0.25s_ease-out]">
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
            {selected.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`${API_URL}${selected.imageUrl}`}
                alt={selected.title}
                className="h-32 w-full object-cover"
              />
            ) : (
              <div className="flex h-20 items-center justify-center bg-gradient-to-br from-sky-50 to-cyan-50 text-xs text-sky-600">
                Нет фото
              </div>
            )}
            <div className="p-3.5">
              <h3 className="line-clamp-2 text-sm font-bold leading-snug text-zinc-900">{selected.title}</h3>
              <p className="mt-1 text-lg font-black text-sky-700">{fmtPrice(selected.priceRub, selected.priceType)}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{selected.city} · {selected.category}</p>
              <a
                href={`/listing/${selected.id}`}
                className="mt-3 block rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-2.5 text-center text-sm font-bold text-white shadow-md shadow-sky-600/25 transition hover:from-sky-700 hover:to-cyan-700"
              >
                Подробнее
              </a>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>
        </div>
      ) : null}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}
