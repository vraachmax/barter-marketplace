import { resolveCategoryPreset } from '@/components/category-gradient-icon';

type Props = {
  title?: string;
  categoryTitle?: string;
  className?: string;
};

const CATEGORY_PLACEHOLDER: Record<string, { bg: string; bgDark: string; iconColor: string }> = {
  'авто': { bg: '#EEF2FF', bgDark: '#C7D2FE', iconColor: '#6366F1' },
  'мото': { bg: '#EEF2FF', bgDark: '#C7D2FE', iconColor: '#6366F1' },
  'транспорт': { bg: '#EEF2FF', bgDark: '#C7D2FE', iconColor: '#6366F1' },
  'недвиж': { bg: '#FFF7ED', bgDark: '#FED7AA', iconColor: '#F97316' },
  'кварт': { bg: '#FFF7ED', bgDark: '#FED7AA', iconColor: '#F97316' },
  'работ': { bg: '#F0FDF4', bgDark: '#BBF7D0', iconColor: '#22C55E' },
  'услуг': { bg: '#F5F3FF', bgDark: '#DDD6FE', iconColor: '#8B5CF6' },
  'электро': { bg: '#EFF6FF', bgDark: '#BFDBFE', iconColor: '#3B82F6' },
  'тех': { bg: '#EFF6FF', bgDark: '#BFDBFE', iconColor: '#3B82F6' },
  'комп': { bg: '#EFF6FF', bgDark: '#BFDBFE', iconColor: '#3B82F6' },
  'телеф': { bg: '#EFF6FF', bgDark: '#BFDBFE', iconColor: '#3B82F6' },
  'ноут': { bg: '#EFF6FF', bgDark: '#BFDBFE', iconColor: '#3B82F6' },
  'одеж': { bg: '#FDF2F8', bgDark: '#FBCFE8', iconColor: '#EC4899' },
  'обув': { bg: '#FDF2F8', bgDark: '#FBCFE8', iconColor: '#EC4899' },
  'детск': { bg: '#FFFBEB', bgDark: '#FDE68A', iconColor: '#F59E0B' },
  'игруш': { bg: '#FFFBEB', bgDark: '#FDE68A', iconColor: '#F59E0B' },
  'дом': { bg: '#F0FDF4', bgDark: '#A7F3D0', iconColor: '#10B981' },
  'дач': { bg: '#F0FDF4', bgDark: '#A7F3D0', iconColor: '#10B981' },
  'мебел': { bg: '#F0FDF4', bgDark: '#A7F3D0', iconColor: '#10B981' },
  'хоб': { bg: '#FFF7ED', bgDark: '#FED7AA', iconColor: '#F97316' },
  'отдых': { bg: '#FFF7ED', bgDark: '#FED7AA', iconColor: '#F97316' },
  'спорт': { bg: '#FFF7ED', bgDark: '#FED7AA', iconColor: '#F97316' },
  'вело': { bg: '#FFF7ED', bgDark: '#FED7AA', iconColor: '#F97316' },
  'живот': { bg: '#FFF1F2', bgDark: '#FECDD3', iconColor: '#F43F5E' },
};

function resolveColors(categoryTitle: string, title: string) {
  const v = `${categoryTitle} ${title}`.toLowerCase();
  for (const [key, colors] of Object.entries(CATEGORY_PLACEHOLDER)) {
    if (v.includes(key)) return colors;
  }
  return { bg: '#F0F4F8', bgDark: '#E2E8F0', iconColor: '#64748B' };
}

export default function ListingPlaceholder({ title, categoryTitle, className }: Props) {
  const preset = resolveCategoryPreset(categoryTitle ?? '', title ?? '');
  const { Icon } = preset;
  const colors = resolveColors(categoryTitle ?? '', title ?? '');
  return (
    <div
      className={`listing-placeholder-surface flex h-full w-full items-center justify-center ${className ?? ''}`}
      style={{ background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bgDark} 100%)` }}
      aria-label="placeholder-image"
    >
      <Icon size={48} color={colors.iconColor} strokeWidth={1.2} style={{ opacity: 0.5 }} aria-hidden />
    </div>
  );
}
