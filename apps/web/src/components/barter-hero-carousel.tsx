'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';

const slides = [
  { id: 'intro', label: 'Знакомство с БАРТЕРОМ', href: '/about/features' },
  { id: 'exchange', label: 'Предложения обмена', href: '/about/features#exchange' },
  { id: 'both', label: 'Продажа и обмен вместе', href: '/about/features#one-listing' },
  { id: 'messages', label: 'Договоритесь в сообщениях', href: '/about/features#messages' },
] as const;

/** Interactive and keyboard/swipe-accessible homepage hero.
 * Slide one reuses the EXACT approved artwork; the artwork includes its own CTA.
 */
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
      <div className="barter-hero-carousel__frame"
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
          <div className="barter-hero-carousel__slide" key={slide.id} aria-hidden={active !== i}
            data-active={active === i} id={'barter-slide-' + slide.id}>
            {slide.id === 'intro' ? (
              <Link href={slide.href} tabIndex={active === i ? 0 : -1}
                className="barter-hero-carousel__intro"
                aria-label="Открыть возможности Barter: Меняй. Покупай. Открывай новое.">
                {/* Original artwork contains the headline and the CTA. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="barter-hero-carousel__light" src="/visual-refresh/claude-banner-light.jpg" alt="" width={643} height={320} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="barter-hero-carousel__dark" src="/visual-refresh/claude-banner-dark.jpg" alt="" width={652} height={319} />
              </Link>
            ) : (
              <Link href={slide.href} tabIndex={active === i ? 0 : -1}
                className={`barter-hero-carousel__content barter-hero-carousel__content--${slide.id}`}>
                {/* Three generated photographic slide artworks share one optimized asset. */}
                <span className={`barter-hero-carousel__art barter-hero-carousel__art--${slide.id}`} aria-hidden />
                <div className="barter-hero-carousel__copy">
                  <span className="barter-hero-carousel__eyebrow">БАРТЕР · ВОЗМОЖНОСТИ</span>
                  <h2>{slide.id === 'exchange' ? 'Меняй вещи, находи своё.' : slide.id === 'both' ? 'Одно объявление. Два пути.' : 'Обсудите сделку внутри.'}</h2>
                  <p>{slide.id === 'exchange'
                    ? 'Предлагай обмен на вещи из любых категорий.'
                    : slide.id === 'both'
                      ? 'Покупка и обмен без повторной публикации.'
                      : 'Чат, фотографии и детали сделки в одном месте.'}</p>
                  <span className="barter-hero-carousel__cta">Подробнее <ArrowRight size={15} aria-hidden /></span>
                </div>

              </Link>
            )}
          </div>
        ))}
        <div className="barter-hero-carousel__dots" aria-label="Выбор слайда">
          {slides.map((slide, i) => (
            <button type="button" key={slide.id}
              aria-label={`Слайд ${i + 1}: ${slide.label}`}
              aria-current={active === i ? 'true' : undefined}
              onClick={() => change(i)}
              className="barter-hero-carousel__dot-hit">
              <span className="barter-hero-carousel__dot" aria-hidden />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
