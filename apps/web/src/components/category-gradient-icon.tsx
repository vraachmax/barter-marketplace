import type { LucideIcon } from 'lucide-react';
import {
  LayoutGrid,
  Car,
  Baby,
  Home,
  Building2,
  Shirt,
  Briefcase,
  Wrench,
  Trophy,
  Tv,
  Flower2,
  Package,
} from 'lucide-react';

export type CategoryGradientPreset = {
  Icon: LucideIcon;
  from: string;
  to: string;
  iconColor?: string;
};

const ALL: CategoryGradientPreset = {
  Icon: LayoutGrid,
  from: '#667eea',
  to: '#764ba2',
};

const PRESETS = {
  all: ALL,
  auto: { Icon: Car, from: '#f093fb', to: '#f5576c' },
  baby: { Icon: Baby, from: '#4facfe', to: '#00f2fe' },
  homeGarden: { Icon: Home, from: '#43e97b', to: '#38f9d7' },
  plants: { Icon: Flower2, from: '#43e97b', to: '#38f9d7' },
  realty: { Icon: Building2, from: '#fa709a', to: '#fee140' },
  clothes: { Icon: Shirt, from: '#a18cd1', to: '#fbc2eb' },
  work: { Icon: Briefcase, from: '#f59e0b', to: '#d97706' },
  services: { Icon: Wrench, from: '#fb7185', to: '#e11d48' },
  hobby: { Icon: Trophy, from: '#f6d365', to: '#fda085' },
  electronics: { Icon: Tv, from: '#30cfd0', to: '#667eea' },
  goods: { Icon: Package, from: '#43e97b', to: '#38f9d7' },
} as const satisfies Record<string, CategoryGradientPreset>;

/** Декоративная сетка на баннере главной */
export const HERO_CATEGORY_PRESETS: CategoryGradientPreset[] = [
  PRESETS.auto,
  PRESETS.realty,
  PRESETS.electronics,
  PRESETS.homeGarden,
  PRESETS.hobby,
  PRESETS.clothes,
];

/** Иконка + градиент для категории по названию/slug (как в ленте). */
export function resolveCategoryPreset(title: string, slug: string): CategoryGradientPreset {
  const v = `${title} ${slug}`.toLowerCase();
  if (v.includes('авто') || v.includes('мото') || v.includes('транспорт')) return PRESETS.auto;
  if (v.includes('недвиж') || v.includes('кварт')) return PRESETS.realty;
  if (v.includes('работ')) return PRESETS.work;
  if (v.includes('услуг')) return PRESETS.services;
  if (
    v.includes('электро') ||
    v.includes('тех') ||
    v.includes('комп') ||
    v.includes('телеф') ||
    v.includes('ноут')
  )
    return PRESETS.electronics;
  if (v.includes('одеж') || v.includes('обув') || v.includes('мод')) return PRESETS.clothes;
  if (v.includes('детск') || v.includes('игруш')) return PRESETS.baby;
  if (v.includes('дач') || v.includes('сад') || v.includes('растен')) return PRESETS.plants;
  if (v.includes('мебел')) return PRESETS.homeGarden;
  if (v.includes('продукт') || v.includes('еда') || v.includes('питани')) return PRESETS.goods;
  if (v.includes('хоб') || v.includes('отдых') || v.includes('игр')) return PRESETS.hobby;
  if (v.includes('дом') && !v.includes('недвиж')) return PRESETS.homeGarden;
  if (v.includes('вело') || v.includes('спорт')) return PRESETS.hobby;
  return { Icon: Package, from: '#667eea', to: '#764ba2' };
}

export function categoryAllPreset(): CategoryGradientPreset {
  return ALL;
}

type SquareProps = {
  preset: CategoryGradientPreset;
  iconSize?: number;
  boxSize?: number;
  radius?: number;
  className?: string;
};

/** 40×40 градиент + иконка по ТЗ (категории в сайдбаре). */
export function CategoryGradientSquare({
  preset,
  iconSize = 22,
  boxSize = 40,
  radius = 10,
  className,
}: SquareProps) {
  const { Icon, from, to, iconColor = 'white' } = preset;
  return (
    <div
      className={className}
      style={{
        width: boxSize,
        height: boxSize,
        borderRadius: radius,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon size={iconSize} color={iconColor} strokeWidth={1.8} aria-hidden />
    </div>
  );
}
