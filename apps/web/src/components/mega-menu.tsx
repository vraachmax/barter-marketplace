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
    title: 'ÐÐ²ÑÐ¾',
    slug: 'auto',
    preset: { Icon: Car, from: '#f093fb', to: '#f5576c' },
    subcategories: [
      'ÐÐ²ÑÐ¾Ð¼Ð¾Ð±Ð¸Ð»Ð¸',
      'ÐÐ¾ÑÐ¾ÑÐ¸ÐºÐ»Ñ',
      'ÐÑÑÐ·Ð¾Ð²Ð¸ÐºÐ¸',
      'ÐÐ°Ð¿ÑÐ°ÑÑÐ¸',
      'Ð¡Ð¿ÐµÑÑÐµÑÐ½Ð¸ÐºÐ°',
      'ÐÐ¾Ð´Ð½ÑÐ¹ ÑÑÐ°Ð½ÑÐ¿Ð¾ÑÑ',
    ],
  },
  {
    title: 'ÐÐµÐ´Ð²Ð¸Ð¶Ð¸Ð¼Ð¾ÑÑÑ',
    slug: 'realty',
    preset: { Icon: Building2, from: '#fa709a', to: '#fee140' },
    subcategories: [
      'ÐÐ²Ð°ÑÑÐ¸ÑÑ',
      'ÐÐ¾Ð¼Ð° Ð¸ Ð´Ð°ÑÐ¸',
      'ÐÐ¾Ð¼Ð½Ð°ÑÑ',
      'ÐÐµÐ¼ÐµÐ»ÑÐ½ÑÐµ ÑÑÐ°ÑÑÐºÐ¸',
      'ÐÐ°ÑÐ°Ð¶Ð¸',
      'ÐÐ¾Ð¼Ð¼ÐµÑÑÐµÑÐºÐ°Ñ',
    ],
  },
  {
    title: 'Ð Ð°Ð±Ð¾ÑÐ°',
    slug: 'work',
    preset: { Icon: Briefcase, from: '#f59e0b', to: '#d97706' },
    subcategories: ['ÐÐ°ÐºÐ°Ð½ÑÐ¸Ð¸', 'Ð ÐµÐ·ÑÐ¼Ðµ', 'ÐÐ¾Ð´ÑÐ°Ð±Ð¾ÑÐºÐ°', 'Ð¡ÑÐ°Ð¶Ð¸ÑÐ¾Ð²ÐºÐ¸'],
  },
  {
    title: 'Ð£ÑÐ»ÑÐ³Ð¸',
    slug: 'services',
    preset: { Icon: Wrench, from: '#fb7185', to: '#e11d48' },
    subcategories: [
      'Ð ÐµÐ¼Ð¾Ð½Ñ Ð¸ ÑÑÑÐ¾Ð¸ÑÐµÐ»ÑÑÑÐ²Ð¾',
      'ÐÑÐ°ÑÐ¾ÑÐ° Ð¸ Ð·Ð´Ð¾ÑÐ¾Ð²ÑÐµ',
      'ÐÐ±ÑÑÐµÐ½Ð¸Ðµ',
      'ÐÐµÑÐµÐ²Ð¾Ð·ÐºÐ¸',
      'IT ÑÑÐ»ÑÐ³Ð¸',
      'Ð®ÑÐ¸Ð´Ð¸ÑÐµÑÐºÐ¸Ðµ',
    ],
  },
  {
    title: 'Ð­Ð»ÐµÐºÑÑÐ¾Ð½Ð¸ÐºÐ°',
    slug: 'electronics',
    preset: { Icon: Tv, from: '#30cfd0', to: '#667eea' },
    subcategories: [
      'Ð¢ÐµÐ»ÐµÑÐ¾Ð½Ñ',
      'ÐÐ¾ÑÑÐ±ÑÐºÐ¸',
      'ÐÐ»Ð°Ð½ÑÐµÑÑ',
      'Ð¤Ð¾ÑÐ¾ Ð¸ Ð²Ð¸Ð´ÐµÐ¾',
      'ÐÑÐ´Ð¸Ð¾',
      'ÐÐ³ÑÑ Ð¸ Ð¿ÑÐ¸ÑÑÐ°Ð²ÐºÐ¸',
    ],
  },
  {
    title: 'ÐÐ´ÐµÐ¶Ð´Ð° Ð¸ Ð¾Ð±ÑÐ²Ñ',
    slug: 'clothes',
    preset: { Icon: Shirt, from: '#a18cd1', to: '#fbc2eb' },
    subcategories: [
      'ÐÐµÐ½ÑÐºÐ°Ñ Ð¾Ð´ÐµÐ¶Ð´Ð°',
      'ÐÑÐ¶ÑÐºÐ°Ñ Ð¾Ð´ÐµÐ¶Ð´Ð°',
      'ÐÐµÑÑÐºÐ°Ñ Ð¾Ð´ÐµÐ¶Ð´Ð°',
      'ÐÐ±ÑÐ²Ñ',
      'ÐÐºÑÐµÑÑÑÐ°ÑÑ',
      'Ð¡ÑÐ¼ÐºÐ¸',
    ],
  },
  {
    title: 'ÐÐµÑÑÐºÐ¸Ðµ ÑÐ¾Ð²Ð°ÑÑ',
    slug: 'baby',
    preset: { Icon: Baby, from: '#4facfe', to: '#00f2fe' },
    subcategories: [
      'ÐÐ³ÑÑÑÐºÐ¸',
      'ÐÐ¾Ð»ÑÑÐºÐ¸',
      'ÐÐ²ÑÐ¾ÐºÑÐµÑÐ»Ð°',
      'Ð¨ÐºÐ¾Ð»ÑÐ½ÑÐµ ÑÐ¾Ð²Ð°ÑÑ',
      'ÐÐµÑÑÐºÐ°Ñ Ð¼ÐµÐ±ÐµÐ»Ñ',
    ],
  },
  {
    title: 'ÐÐ»Ñ Ð´Ð¾Ð¼Ð° Ð¸ Ð´Ð°ÑÐ¸',
    slug: 'home',
    preset: { Icon: Home, from: '#43e97b', to: '#38f9d7' },
    subcategories: [
      'ÐÐµÐ±ÐµÐ»Ñ',
      'ÐÑÑÐ¾Ð²Ð°Ñ ÑÐµÑÐ½Ð¸ÐºÐ°',
      'ÐÐ¾ÑÑÐ´Ð°',
      'Ð Ð°ÑÑÐµÐ½Ð¸Ñ',
      'ÐÐ½ÑÑÑÑÐ¼ÐµÐ½ÑÑ',
      'Ð¡ÑÑÐ¾Ð¹Ð¼Ð°ÑÐµÑÐ¸Ð°Ð»Ñ',
    ],
  },
  {
    title: 'Ð¥Ð¾Ð±Ð±Ð¸ Ð¸ Ð¾ÑÐ´ÑÑ',
    slug: 'hobby',
    preset: { Icon: Trophy, from: '#f6d365', to: '#fda085' },
    subcategories: [
      'Ð¡Ð¿Ð¾ÑÑ',
      'ÐÐµÐ»Ð¾ÑÐ¸Ð¿ÐµÐ´Ñ',
      'ÐÐ½Ð¸Ð³Ð¸',
      'ÐÑÐ·ÑÐºÐ°Ð»ÑÐ½ÑÐµ Ð¸Ð½ÑÑÑÑÐ¼ÐµÐ½ÑÑ',
      'ÐÑÐ¾ÑÐ° Ð¸ ÑÑÐ±Ð°Ð»ÐºÐ°',
    ],
  },
  {
    title: 'ÐÐ¸Ð²Ð¾ÑÐ½ÑÐµ',
    slug: 'animals',
    preset: { Icon: PawPrint, from: '#a8e063', to: '#56ab2f' },
    subcategories: [
      'Ð¡Ð¾Ð±Ð°ÐºÐ¸',
      'ÐÐ¾ÑÐºÐ¸',
      'ÐÑÐ¸ÑÑ',
      'ÐÑÑÐ·ÑÐ½Ñ',
      'Ð ÑÐ±Ñ',
      'ÐÐµÑÐµÑÐ¸Ð½Ð°ÑÐ¸Ñ',
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
            {/* Left column â category list */}
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

            {/* Right area â subcategories */}
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
                  Ð¡Ð¼Ð¾ÑÑÐµÑÑ Ð²ÑÐµ Ð² Â«{active.title}Â»
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
