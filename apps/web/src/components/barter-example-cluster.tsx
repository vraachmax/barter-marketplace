'use client';

import Link from 'next/link';
import { ArrowLeftRight, Heart, MapPin } from 'lucide-react';

/**
 * Мок-кластер «Примеры обмена» — показывается только в режиме Бартер,
 * пока backend `isBarter`/`wantInstead` (Phase 13) не готов.
 *
 * Рендерится как блок `.grid grid-cols-2 gap-3` под заголовком «Примеры обмена».
 * Внешне 1:1 с handoff-bundle/home.html — swap-badge в превью,
 * оранжевая «Хочу: X» строка и CTA «Хочу обменять».
 *
 * Скрывается из DOM в режиме Маркет через CSS-правило
 * `html:not([data-mode="barter"]) [data-barter-only="true"] { display: none }`.
 */
type Example = {
  title: string;
  swapBadge: string; // "Обмен" | "Обмен + 2 000 ₽"
  want: string; // "Хочу: iPad или MacBook"
  loc: string; // "Басманный · 1,2 км"
  img: string;
};

const EXAMPLES: Example[] = [
  {
    title: 'iPhone 13 128 ГБ, синий, отличное состояние',
    swapBadge: 'Обмен',
    want: 'Хочу: iPad или MacBook',
    loc: 'Басманный · 1,2 км',
    img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=70&auto=format&fit=crop',
  },
  {
    title: 'Nike Air Max 90, 43 размер, почти новые',
    swapBadge: 'Обмен + 2 000 ₽',
    want: 'Хочу: Adidas или New Balance',
    loc: 'Арбат · 3,5 км',
    img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=70&auto=format&fit=crop',
  },
  {
    title: 'Акустическая гитара Yamaha F310',
    swapBadge: 'Обмен',
    want: 'Хочу: электрогитару',
    loc: 'Таганский · 2,8 км',
    img: 'https://images.unsplash.com/photo-1511556820780-d912e42b4980?w=400&q=70&auto=format&fit=crop',
  },
  {
    title: 'Диван-кровать велюровый, 2\u00a0года',
    swapBadge: 'Обмен',
    want: 'Хочу: кресло и журн. столик',
    loc: 'Кунцево · 12 км',
    img: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=70&auto=format&fit=crop',
  },
  {
    title: 'Велосипед горный Stels Navigator 26"',
    swapBadge: 'Обмен',
    want: 'Хочу: самокат электрический',
    loc: 'Академический · 6 км',
    img: 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=400&q=70&auto=format&fit=crop',
  },
  {
    title: 'Книги по архитектуре, 12 штук',
    swapBadge: 'Обмен',
    want: 'Хочу: худ. альбомы',
    loc: 'Хамовники · 4,1 км',
    img: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=70&auto=format&fit=crop',
  },
  {
    title: 'PlayStation 5 Slim, 1 ТБ, 2 геймпада',
    swapBadge: 'Обмен',
    want: 'Хочу: Xbox Series X',
    loc: 'Мещанский · 2 км',
    img: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&q=70&auto=format&fit=crop',
  },
  {
    title: 'Коляска Cybex Balios S, бежевая',
    swapBadge: 'Обмен',
    want: 'Хочу: автокресло 1–3',
    loc: 'Останкинский · 8 км',
    img: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&q=70&auto=format&fit=crop',
  },
];

export function BarterExampleCluster() {
  return (
    <section data-barter-only="true" className="mb-5 md:hidden">
      <div className="px-2 pt-1 pb-3">
        <h2 className="m-0 text-[20px] font-bold tracking-tight text-foreground">
          Примеры обмена
        </h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Реальные предложения появятся после запуска · пока&nbsp;— витрина
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 px-2">
        {EXAMPLES.map((ex) => (
          <Link
            key={ex.title}
            href="/listings?mode=barter"
            className="block overflow-hidden rounded-xl bg-background ring-1 ring-foreground/10 transition-shadow hover:shadow-md"
          >
            <div className="relative aspect-square overflow-hidden bg-muted">
              {/* unsplash: дозволенный домен в next.config.ts; если нет — img всё равно работает */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ex.img}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                aria-label="В избранное"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="absolute right-2 top-2 z-[2] grid size-8 place-items-center rounded-full bg-background/92 text-foreground transition-colors"
              >
                <Heart size={16} strokeWidth={1.8} aria-hidden />
              </button>
              <span className="swap-badge">
                <ArrowLeftRight size={11} strokeWidth={2} aria-hidden />
                {ex.swapBadge}
              </span>
            </div>
            <div className="flex flex-col px-3 pb-3 pt-2.5">
              <div className="line-clamp-2 min-h-[36px] text-[14px] font-medium leading-tight text-foreground">
                {ex.title}
              </div>
              <div className="want-line mt-2.5">
                <ArrowLeftRight size={12} strokeWidth={2} aria-hidden />
                <span className="truncate">{ex.want}</span>
              </div>
              <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
                <MapPin size={11} strokeWidth={2} aria-hidden />
                <span className="truncate">{ex.loc}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="btn-swap"
              >
                Хочу обменять
              </button>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

