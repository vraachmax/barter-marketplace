'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import {
  CategoryGradientSquare,
  type CategoryGradientPreset,
} from '@/components/category-gradient-icon';
import type { LucideIcon } from 'lucide-react';
import {
  Car,
  Building2,
  Briefcase,
  Wrench,
  Tv,
  Shirt,
  Baby,
  Home,
  Trophy,
  PawPrint,
} from 'lucide-react';

type MegaCategory = {
  title: string;
  slug: string;
  preset: CategoryGradientPreset;
  subcategories: string[];
};

const MEGA_CATEGORIES: MegaCategory[] = [
  {
    title: 'Авто',
    slug: 'auto',
    preset: { Icon: Car, from: '#f093fb', to: '#f5576c' },
    subcategories: [
      'Автомобили',
      'Мотоциклы',
      'Грузовики',
      'Запчасти',
      'Спецтехника',
      'Водный транспорт',
    ],
  },
  {
    title: 'Недвижимость',
    slug: 'realty',
    preset: { Icon: Building2, from: '#fa709a', to: '#fee140' },
    subcategories: [
      'Квартиры',
      'Дома и дачи',
      'Комнаты',
      'Земельные участки',
      'Гаражи',
      'Коммерческая',
    ],
  },
  {
    title: 'Работа',
    slug: 'work',
    preset: { Icon: Briefcase, from: '#f59e0b', to: '#d97706' },
    subcategories: ['Вакансии', 'Резюме', 'Подработка', 'Стажировки'],
  },
  {
    title: 'Услуги',
    slug: 'services',
    preset: { Icon: Wrench, from: '#fb7185', to: '#e11d48' },
    subcategories: [
      'Ремонт и строительство',
      'Красота и здоровье',
      'Обучение',
      'Перевозки',
      'IT услуги',
      'Юридические',
    ],
  },
  {
    title: 'Электроника',
    slug: 'electronics',
    preset: { Icon: Tv, from: '#30cfd0', to: '#667eea' },
    subcategories: [
      'Телефоны',
      'Ноутбуки',
      'Планшеты',
      'Фото и видео',
      'Аудио',
      'Игры и приставки',
    ],
  },
  {
    title: 'Одежда и обувь',
    slug: 'clothes',
    preset: { Icon: Shirt, from: '#a18cd1', to: '#fbc2eb' },
    subcategories: [
      'Женская одежда',
      'Мужская одежда',
      'Детская одежда',
      'Обувь',
      'Аксессуары',
      'Сумки',
    ],
  },
  {
    title: 'Детские товары',
    slug: 'baby',
    preset: { Icon: Baby, from: '#4facfe', to: '#00f2fe' },
    subcategories: [
      'Игрушки',
      'Коляски',
      'Автокресла',
      'Школьные товары',
      'Детская мебель',
    ],
  },
  {
    title: 'Для дома и дачи',
    slug: 'home',
    preset: { Icon: Home, from: '#43e97b', to: '#38f9d7' },
    subcategories: [
      'Мебель',
      'Бытовая техника',
      'Посуда',
      'Растения',
      'Инструменты',
      'Стройматериалы',
    ],
  },
  {
    title: 'Хобби и отдых',
    slug: 'hobby',
    preset: { Icon: Trophy, from: '#f6d365', to: '#fda085' },
    subcategories: [
      'Спорт',
      'Велосипеды',
      'Книги',
      'Музыкальные инструменты',
      'Охота и рыбалка',
    ],
  },
  {
    title: 'Животные',
    slug: 'animals',
    preset: { Icon: PawPrint, from: '#a8e063', to: '#56ab2f' },
    subcategories: [
      'Собаки',
      'Кошки',
      'Птицы',
      'Грызуны',
      'Рыбы',
      'Ветеринария',
    ],
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export function MegaMenu({ open, onClose }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  // Reset to first category when opening
  useEffect(() => {
    if (open) setHoveredIdx(0);
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const active = MEGA_CATEGORIES[hoveredIdx];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/30"
        onClick={onClose}
        style={{ animation: 'megaFadeIn 150ms ease-out' }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed left-0 right-0 z-[201]"
        style={{
          top: 56,
          animation: 'megaSlideIn 150ms ease-out',
        }}
      >
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div
            className="flex overflow-hidden bg-white dark:bg-zinc-950"
            style={{
              borderRadius: '0 0 16px 16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              maxHeight: 480,
            }}
          >
            {/* Left column — category list */}
            <div
              className="shrink-0 overflow-y-auto border-r border-[#f0f0f0] py-2 dark:border-zinc-800"
              style={{ width: 220, background: '#f7f7f7' }}
            >
              {MEGA_CATEGORIES.map((cat, i) => (
                <button
                  key={cat.slug}
                  type="button"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onClick={() => {
                    onClose();
                  }}
                  className={`group flex w-full items-center gap-3 px-4 py-[11px] text-left text-sm transition-colors ${
                    i === hoveredIdx
                      ? 'bg-[#E8F2FF] text-[#007AFF]'
                      : 'text-[#111] hover:bg-[#E8F2FF]'
                  }`}
                >
                  <CategoryGradientSquare
                    preset={cat.preset}
                    boxSize={32}
                    iconSize={18}
                    radius={8}
                  />
                  <span className={`flex-1 truncate ${i === hoveredIdx ? 'font-medium' : ''}`}>
                    {cat.title}
                  </span>
                  <ChevronRight
                    size={14}
                    strokeWidth={1.8}
                    className={`shrink-0 transition-colors ${
                      i === hoveredIdx ? 'text-[#007AFF]' : 'text-[#c0c0c0]'
                    }`}
                    aria-hidden
                  />
                </button>
              ))}
            </div>

            {/* Right area — subcategories */}
            <div className="flex-1 overflow-y-auto p-5 px-7">
              <h3 className="mb-4 border-b border-[#f0f0f0] pb-3 text-lg font-bold text-[#111] dark:border-zinc-800 dark:text-zinc-100">
                {active.title}
              </h3>
              <div className="grid grid-cols-3 gap-x-8 gap-y-1">
                {active.subcategories.map((sub) => (
                  <Link
                    key={sub}
                    href={`/?categoryId=${active.slug}&sub=${encodeURIComponent(sub)}`}
                    onClick={onClose}
                    className="rounded-md py-[7px] text-sm text-[#111] transition-colors hover:text-[#007AFF] dark:text-zinc-300 dark:hover:text-[#007AFF]"
                  >
                    {sub}
                  </Link>
                ))}
              </div>
              <div className="mt-6">
                <Link
                  href={`/?categoryId=${active.slug}`}
                  onClick={onClose}
                  className="inline-flex items-center gap-1 text-sm font-medium text-[#007AFF] hover:underline"
                >
                  Смотреть все в «{active.title}»
                  <ChevronRight size={16} strokeWidth={1.8} aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
