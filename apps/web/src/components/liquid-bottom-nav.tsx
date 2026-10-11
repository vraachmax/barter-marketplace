'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Popover } from '@base-ui/react/popover';
import { Home, Heart, MessageCircle, UserRound, Plus, Tag, Repeat2, Layers2, Search, ClipboardList } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Лента', icon: Home, match: (p: string) => p === '/' || p === '/search' },
  { href: '/favorites', label: 'Избранное', icon: Heart, match: (p: string) => p === '/favorites' },
  { href: '/messages', label: 'Чаты', icon: MessageCircle, match: (p: string) => p.startsWith('/messages') },
  { href: '/profile', label: 'Профиль', icon: UserRound, match: (p: string) => p === '/listings' || p.startsWith('/profile') },
];
const CREATE_ITEMS = [
  { mode: 'sale', label: 'Продать', description: 'Предложите свою цену', icon: Tag },
  { mode: 'barter', label: 'Обменять', description: 'Найдите что-то интереснее', icon: Repeat2 },
  { mode: 'both', label: 'Продать или обменять', description: 'Одно объявление, две ленты', icon: Layers2 },
];
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** The approved prototype, adapted to real routes. No per-frame React renders. */
export function LiquidBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const visible = pathname !== '/new' && !pathname.startsWith('/games/barter-dash');
  const activeIndex = NAV_ITEMS.findIndex(item => item.match(pathname));
  const activeRef = useRef(activeIndex);
  const trackRef = useRef<HTMLDivElement>(null);
  const motionRef = useRef<((index: number) => void) | null>(null);
  const suppressClick = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    activeRef.current = activeIndex;
    motionRef.current?.(activeIndex);
    setMenuOpen(false);
  }, [activeIndex, pathname]);

  useEffect(() => {
    const track = trackRef.current;
    if (!visible || !track) return;
    const lens = track.querySelector<HTMLElement>('.liquid-nav__lens')!;
    const links = Array.from(track.querySelectorAll<HTMLAnchorElement>('.liquid-nav__link'));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = window.matchMedia('(min-width: 768px)');
    let slot = 0, x = 0, velocity = 0, target = 0;
    let press = 0, pressVelocity = 0, pressTarget = 0;
    let frame = 0, lastTime = 0, pointer: number | null = null, startX = 0, dragged = false;

    function highlight(index: number) {
      lens.style.opacity = index < 0 ? '0' : '1';
      links.forEach((link, i) => { link.dataset.selected = String(i === index); });
    }
    function paint() {
      const stretch = Math.min(Math.abs(velocity) / 2300, .19);
      lens.style.transform = `translate3d(${x}px,${-press * 1.4}px,0) scale(${1 + stretch + press * .045},${1 - stretch * .4 + press * .1})`;
      lens.style.setProperty('--liquid-light', String(.3 + press * .65));
      lens.style.setProperty('--liquid-light-x', `${clamp(velocity / 1400, -1, 1) * 30 + 50}%`);
      links.forEach((link, i) => {
        const proximity = slot ? Math.max(0, 1 - Math.abs(x - i * slot) / slot) : 0;
        link.style.setProperty('--liquid-icon-scale', String(1 + press * .13 * proximity));
        link.style.setProperty('--liquid-icon-y', `${-press * 1.8 * proximity}px`);
      });
    }
    function tick(now: number) {
      if (reduced.matches) {
        x = target; velocity = press = pressVelocity = 0; paint(); frame = 0; return;
      }
      const dt = Math.min((now - lastTime) / 1000 || 1 / 60, .032);
      lastTime = now;
      // Two stable substeps keep the same spring at 60 and 120 Hz.
      for (let n = 0; n < 2; n++) {
        const h = dt / 2;
        velocity += ((target - x) * (pointer !== null ? 680 : 440) - velocity * (pointer !== null ? 40 : 31)) * h;
        x += velocity * h;
        pressVelocity += ((pressTarget - press) * 560 - pressVelocity * 34) * h;
        press += pressVelocity * h;
      }
      paint();
      if (Math.abs(x - target) > .025 || Math.abs(velocity) > .03 || Math.abs(press - pressTarget) > .002 || Math.abs(pressVelocity) > .01) {
        frame = requestAnimationFrame(tick);
      } else { x = target; velocity = 0; frame = 0; paint(); }
    }
    function wake() {
      if (!frame && !document.hidden) { lastTime = performance.now(); frame = requestAnimationFrame(tick); }
    }
    function select(index: number) {
      target = Math.max(0, index) * slot; highlight(index); wake();
    }
    motionRef.current = select;
    function measure() {
      slot = Math.max(0, track!.clientWidth - 10) / NAV_ITEMS.length;
      lens.style.width = `${slot}px`;
      x = target = Math.max(0, activeRef.current) * slot; velocity = 0;
      highlight(activeRef.current); paint();
    }
    const position = (event: PointerEvent) => event.clientX - track!.getBoundingClientRect().left - 5 - slot / 2;
    const nearest = (event: PointerEvent) => clamp(Math.round(position(event) / slot), 0, NAV_ITEMS.length - 1);
    function down(event: PointerEvent) {
      if (!event.isPrimary || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      pointer = event.pointerId; startX = event.clientX; dragged = false; suppressClick.current = false;
      pressTarget = 1; setMenuOpen(false); select(nearest(event));
      // Capture only a drag, so ordinary taps still use native accessible Links.
    }
    function move(event: PointerEvent) {
      if (event.pointerId !== pointer) return;
      if (!dragged && Math.abs(event.clientX - startX) > 6) { dragged = true; track!.setPointerCapture(event.pointerId); }
      if (!dragged) return;
      const raw = position(event), end = (NAV_ITEMS.length - 1) * slot;
      target = raw < 0 ? -Math.sqrt(-raw) * 1.25 : raw > end ? end + Math.sqrt(raw - end) * 1.25 : raw;
      highlight(nearest(event)); wake();
    }
    function release(event: PointerEvent, cancelled = false) {
      if (event.pointerId !== pointer) return;
      pointer = null; pressTarget = 0;
      if (track!.hasPointerCapture(event.pointerId)) track!.releasePointerCapture(event.pointerId);
      if (cancelled) { suppressClick.current = dragged; select(activeRef.current); return; }
      const index = nearest(event); select(index);
      if (dragged) { suppressClick.current = true; router.push(NAV_ITEMS[index].href); }
    }
    const up = (event: PointerEvent) => release(event);
    const cancel = (event: PointerEvent) => release(event, true);
    function lostCapture() {
      if (pointer !== null) { pointer = null; pressTarget = 0; select(activeRef.current); }
    }
    function leave() {
      if (pointer !== null && !dragged) { pointer = null; pressTarget = 0; select(activeRef.current); }
    }
    function reset() {
      pointer = null; pressTarget = 0; setMenuOpen(false);
      if (frame) cancelAnimationFrame(frame);
      frame = 0; x = target = Math.max(0, activeRef.current) * slot;
      velocity = press = pressVelocity = 0; highlight(activeRef.current); paint();
    }
    track.addEventListener('pointerdown', down);
    track.addEventListener('pointermove', move);
    track.addEventListener('pointerup', up);
    track.addEventListener('pointercancel', cancel);
    track.addEventListener('lostpointercapture', lostCapture);
    track.addEventListener('pointerleave', leave);
    reduced.addEventListener('change', reset);
    desktop.addEventListener('change', reset);
    document.addEventListener('visibilitychange', reset);
    const observer = new ResizeObserver(measure);
    observer.observe(track); measure();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); motionRef.current = null;
      track.removeEventListener('pointerdown', down);
      track.removeEventListener('pointermove', move);
      track.removeEventListener('pointerup', up);
      track.removeEventListener('pointercancel', cancel);
      track.removeEventListener('lostpointercapture', lostCapture);
      track.removeEventListener('pointerleave', leave);
      reduced.removeEventListener('change', reset);
      desktop.removeEventListener('change', reset);
      document.removeEventListener('visibilitychange', reset);
    };
  }, [visible, router]);

  if (!visible) return null;
  return <nav className="magic-nav md:hidden" aria-label="Основная навигация">
    <div className="liquid-nav" ref={trackRef} onClickCapture={event => {
      if (suppressClick.current && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); }
      suppressClick.current = false;
    }}>
      <div className="liquid-nav__material" aria-hidden />
      <div className="liquid-nav__lens" aria-hidden />
      <ul className="liquid-nav__items">
        {NAV_ITEMS.map((item, index) => {
          const Icon = item.icon;
          return <li key={item.href}><Link href={item.href} className="liquid-nav__link"
            aria-current={index === activeIndex ? 'page' : undefined} data-selected={index === activeIndex}
            onNavigate={() => motionRef.current?.(index)} draggable={false}>
            <Icon className="liquid-nav__icon" size={23} strokeWidth={1.85} aria-hidden /><span>{item.label}</span>
          </Link></li>;
        })}
      </ul>
    </div>
    <Popover.Root open={menuOpen} onOpenChange={setMenuOpen}>
      <Popover.Trigger className="liquid-nav__add" aria-label="Добавить объявление"><Plus size={29} strokeWidth={2.2} aria-hidden /></Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" align="end" sideOffset={14} className="liquid-compose-positioner">
          <Popover.Popup className="liquid-compose">
            <Popover.Title className="liquid-compose__title">Новое объявление</Popover.Title>
            {CREATE_ITEMS.map(item => {
              const Icon = item.icon;
              return <Link key={item.mode} href={`/new?tradeMode=${item.mode}`} className="liquid-compose__choice" onNavigate={() => setMenuOpen(false)}>
                <Icon size={24} strokeWidth={1.8} aria-hidden /><span>{item.label}<small>{item.description}</small></span>
              </Link>;
            })}
            <div className="liquid-compose__shortcuts">
              <Link href="/search" onNavigate={() => setMenuOpen(false)}><Search size={18} aria-hidden />Поиск</Link>
              <Link href="/listings" onNavigate={() => setMenuOpen(false)}><ClipboardList size={18} aria-hidden />Мои объявления</Link>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  </nav>;
}
