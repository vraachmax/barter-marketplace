import {
  Armchair, Baby, Camera, CarFront, Dumbbell, Gamepad2, HardHat,
  House, Laptop, PackageOpen, PawPrint, Shirt, Wrench,
  type LucideIcon,
} from 'lucide-react';

type Props = {
  title?: string;
  categoryTitle?: string;
  categorySlug?: string;
  unavailable?: boolean;
  compact?: boolean;
  className?: string;
};

/** Non-photographic, neutral replacement for listings without seller photos.
 * An icon in a quiet gray surface differentiates missing imagery from a real
 * product photo. Do not use promotional imagery or visible caption in gallery.
 */
function placeholderIcon(categoryTitle: string, categorySlug: string): LucideIcon {
  const category = `${categorySlug} ${categoryTitle}`.toLowerCase();
  if (/спецтех|тяжел.*техник|excavat|heavy.?machin|construction/.test(category)) return HardHat;
  if (/авто|vehicle|cars|motor|transport/.test(category)) return CarFront;
  if (/недвиж|квартир|real.?estate|realty|land/.test(category)) return House;
  if (/одежд|обув|clothes|fashion|wear/.test(category)) return Shirt;
  if (/мебел|furniture|sofa/.test(category)) return Armchair;
  if (/услуг|ремонт|сервис|service|repair|parts|запчаст/.test(category)) return Wrench;
  if (/детск|child|kids|baby/.test(category)) return Baby;
  if (/хобби|gaming|games|консол|игр/.test(category)) return Gamepad2;
  if (/спорт|fitness|sport/.test(category)) return Dumbbell;
  if (/живот|pets|animal/.test(category)) return PawPrint;
  if (/фото|camera|music/.test(category)) return Camera;
  if (/техник|электрон|smart|phone|компьютер|laptop|device/.test(category)) return Laptop;
  return PackageOpen;
}

export default function ListingPlaceholder({
  className, categoryTitle = '', categorySlug = '', unavailable = false, compact = false,
}: Props) {
  const Icon = placeholderIcon(categoryTitle, categorySlug);
  const description = unavailable
    ? 'Фотография недоступна, показана нейтральная иллюстрация'
    : 'Нет фото товара, показана нейтральная иллюстрация';
  return (
    <div
      className={`listing-photo-placeholder relative flex h-full w-full items-center justify-center overflow-hidden bg-[#eff1f4] text-[#87909e] dark:bg-[#24272d] dark:text-[#858f9f] ${className ?? ''}`}
      role="img"
      aria-label={description}
      data-compact={compact ? 'true' : 'false'}
    >
      <span className={`grid aspect-square place-items-center rounded-[28%] bg-white/45 shadow-[0_12px_35px_rgba(26,33,44,.04)] dark:bg-white/[.055] ${compact ? 'w-[44%] max-w-[98px]' : 'w-[43%] max-w-[155px]'}`}>
        <Icon size="58%" strokeWidth={1.25} aria-hidden="true" className="h-[58%] w-[58%]" />
      </span>
    </div>
  );
}
