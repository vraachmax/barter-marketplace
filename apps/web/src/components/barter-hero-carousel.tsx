'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';

/** Approved assets are individual, text-free images. All labels and CTAs are live HTML. */
const slides = [
  {
    id: 'intro', label: 'Знакомство с БАРТЕРОМ',
    image: '/visual-refresh/premium/hero-intro.webp', href: '/about/features',
    title: 'Меняй. Покупай. Открывай новое.',
    description: 'Нужные вещи. Новые возможности. Находи своё в БАРТЕРЕ.',
  },
  {
    id: 'exchange', label: 'Предложения обмена',
    image: '/visual-refresh/premium/hero-exchange.webp', href: '/about/features#exchange',
    title: 'Меняй вещи, находи своё.',
    description: 'Предлагай обмен на вещи из любых категорий.',
  },
  {
    id: 'both', label: 'Продажа и обмен вместе',
    image: '/visual-refresh/premium/hero-one-listing.webp', href: '/about/features#one-listing',
    title: 'Одно объявление. Два пути.',
    description: 'Покупка и обмен без повторной публикации.',
  },
  {
    id: 'messages', label: 'Договоритесь в сообщениях',
    image: '/visual-refresh/premium/hero-messages.webp', href: '/about/features#messages',
    title: 'Обсудите сделку внутри.',
    description: 'Чат, фотографии и детали сделки в одном месте.',
  },
] as const;

/** Accessible homepage hero, with pointer/keyboard navigation and reduced-motion support. */
export function BarterHeroCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const suppressClickUntil = useRef(0);

  useEffect(() => {
    if (paused || typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActive(index => (index + 1) % slides.length);
    }, 6800);
    return () => window.clearInterval(timer);
  }, [paused]);

  const change = (next: number) => {
    setActive((next + slides.length) % slides.length);
    setPaused(true);
  };

  return (
    <section className="barter-hero-carousel" aria-label="Возможности БАРТЕРА" aria-roledescription="Карусель">
      <div
        className="barter-hero-carousel__frame"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onTouchStart={event => { touchX.current = event.changedTouches[0]?.clientX ?? null; }}
        onTouchEnd={event => {
          if (touchX.current == null) return;
          const end = event.changedTouches[0]?.clientX ?? touchX.current;
          if (Math.abs(end - touchX.current) > 35) {
            suppressClickUntil.current = Date.now() + 650;
            change(active + (end < touchX.current ? 1 : -1));
          }
          touchX.current = null;
        }}
        onClickCapture={event => {
          if (Date.now() < suppressClickUntil.current) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onKeyDown={event => {
          if (event.key === 'ArrowLeft') { event.preventDefault(); change(active - 1); }
          if (event.key === 'ArrowRight') { event.preventDefault(); change(active + 1); }
        }}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className="barter-hero-carousel__slide"
            aria-hidden={active !== i}
            data-active={active === i}
            id={'barter-slide-' + slide.id}
          >
            <Link
              href={slide.href}
              tabIndex={active === i ? 0 : -1}
              className={'barter-hero-carousel__content barter-hero-carousel__content--' + slide.id +
                (slide.id === 'intro' ? ' barter-hero-carousel__intro' : '')}
            >
              {/* Each slide uses its own original illustration; no text is baked into the image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="barter-hero-carousel__art" src={slide.image}
                width={1600} height={740} alt="" aria-hidden="true" />
              <div className="barter-hero-carousel__copy">
                <span className="barter-hero-carousel__eyebrow">БАРТЕР · ВОЗМОЖНОСТИ</span>
                <h2>{slide.title}</h2>
                <p>{slide.description}</p>
                <span className="barter-hero-carousel__cta">Подробнее <ArrowRight size={15} aria-hidden="true" /></span>
              </div>
            </Link>
          </div>
        ))}
        <div className="barter-hero-carousel__dots" aria-label="Выбор слайда">
          {slides.map((slide, i) => (
            <button
              type="button"
              key={slide.id}
              aria-label={'Слайд ' + (i + 1) + ': ' + slide.label}
              aria-current={active === i ? 'true' : undefined}
              onClick={() => change(i)}
              className="barter-hero-carousel__dot-hit"
            >
              <span className="barter-hero-carousel__dot" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
