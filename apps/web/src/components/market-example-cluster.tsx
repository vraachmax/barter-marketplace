'use client';

import Link from 'next/link';
import { Heart, MapPin, Phone } from 'lucide-react';

/**
 * Мок-кластер «Горячие предложения» — показывается только в режиме Маркет,
 * пока бэкенд не вернёт реальные объявления (seed тоже пополняется).
 * Рендерится как блок `.grid grid-cols-2 gap-3` под заголовком «Горячие
 * предложения». Внешне 1:1 с BarterExampleCluster: та же геометрия, но
 * внизу карточки кнопка «Показать номер» (Market-semantics), нет swap-
 * badge и нет оранжевой «Хочу:» строки.
 *
 * Скрывается из DOM в режиме Бартер через существующий CSS-фильтр
 * `html[data-mode="barter"] [data-market-only="true"] { display: none }`.
 */
type Example = {
  title: string;
  price: string; // "94 990 ₽" — готовая строка с символом ₽
  loc: string;
  img: string;
};

const EXAMPLES: Example[] = [
  {
    title: 'iPhone 15 Pro 256 ГБ, Natural Titanium',
    price: '94 990 ₽',
    loc: 'Басманный · 1,2 км',
    img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=70&auto=format&fit=crop',
  },
  {
    title: 'Nike Air Max 90, 43 размер, оригинал',
    price: '8 500 ₽',
    loc: 'Арбат · 3,5 км',
    img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=70&auto=format&fit=crop',
  },
  {
    title: 'Акустическая гитара Yamaha F310',
    price: '12 400 ₽',
    loc: 'Таганский · 2,8 км',
    img: 'https://images.unsplash.com/photo-1511556820780-d912e42b4980?w=400&q=70&auto=format&fit=crop',
  },
  {
    title: 'Диван-кровать велюровый, 2\u00a0года',
    price: '24 000 ₽',
    loc: 'Кунцево · 12 км',
    img: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=70&auto=format&fit=crop',
  },
  {
    title: 'Велосипед горный Stels Navigator 26"',
    price: '15 900 ₽',
    loc: 'Академический · 6 км',
    img: 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=400&q=70&auto=format&fit=crop',
  },
  {
    title: 'Книги по архитектуре, 12 штук',
    price: '3 200 ₽',
    loc: 'Хамовники · 4,1 км',
    img: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=70&auto=format&fit=crop',
  },
  {
    title: 'PlayStation 5 Slim, 1 ТБ, 2 геймпада',
    price: '46 500 ₽',
    loc: 'Мещанский · 2 км',
    img: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&q=70&auto=format&fit=crop',
  },
  {
    title: 'Коляска Cybex Balios S, бежевая',
    price: '34 000 ₽',
    loc: 'Останкинский · 8 км',
    img: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&q=70&auto=format&fit=crop',
  },
];

export function MarketExampleCluster() {
  return (
    <section data-market-only="true" className="mb-5 md:hidden">
      <div className="px-2 pt-1 pb-3">
        <h2 className="m-0 text-[20px] font-bold tracking-tight text-foreground">
          Горячие предложения
        </h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Подборка популярного · витрина до появления живых объявлений
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 px-2">
        {EXAMPLES.map((ex) => (
          <Link
            key={ex.title}
            href="/listings?mode=market"
            className="block overflow-hidden rounded-xl bg-background ring-1 ring-foreground/10 transition-shadow hover:shadow-md"
          >
            <div className="relative aspect-square overflow-hidden bg-muted">
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
            </div>
            <div className="flex flex-col px-3 pb-3 pt-2.5">
              <div className="text-[16px] leading-tight font-bold tracking-tight text-foreground">
                {ex.price}
              </div>
              <div className="mt-1 line-clamp-2 min-h-[36px] text-[13px] leading-snug text-foreground/85">
                {ex.title}
              </div>
              <div className="mt-1 flex items-center gap-1 text-[12px] text-muted-foreground">
                <MapPin size={11} strokeWidth={2} aria-hidden />
                <span className="truncate">{ex.loc}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="btn-show-phone mt-2"
              >
                <Phone size={12} strokeWidth={2.2} aria-hidden />
                Показать номер
              </button>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
