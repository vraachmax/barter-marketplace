import Image from 'next/image';
import { Camera, ImageOff, PackageOpen } from 'lucide-react';
import { listingPlaceholderArt } from '@/lib/listing-placeholder';

type Props = {
  title?: string;
  categoryTitle?: string;
  categorySlug?: string;
  unavailable?: boolean;
  className?: string;
};

export default function ListingPlaceholder({ className, categoryTitle, categorySlug, unavailable = false }: Props) {
  const art = listingPlaceholderArt(categoryTitle, categorySlug);
  const caption = unavailable ? 'Фото не загрузилось' : 'Фото не добавлено';
  const Icon = unavailable ? ImageOff : Camera;
  return (
    <div
      className={`@container relative flex h-full w-full flex-col items-center justify-center gap-2 overflow-hidden bg-gradient-to-br from-slate-50 via-zinc-100 to-sky-100/60 p-2 text-slate-500 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 dark:text-slate-300 ${className ?? ''}`}
      role="img" aria-label={caption}
    >
      <div className="grid aspect-square w-[54%] max-w-40 place-items-center overflow-hidden rounded-3xl border border-white/80 bg-white/70 shadow-sm dark:border-white/10 dark:bg-slate-700/60">
        {art ? <Image src={art} alt="" width={192} height={192} className="h-full w-full object-contain dark:opacity-80" />
          : <PackageOpen size={46} strokeWidth={1.2} className="h-1/2 w-1/2 text-sky-500 dark:text-sky-300" aria-hidden />}
      </div>
      <span className="hidden items-center justify-center gap-1 text-center text-[10px] font-medium leading-tight @min-[100px]:flex sm:text-xs">
        <Icon size={12} className="shrink-0" aria-hidden />{caption}
      </span>
    </div>
  );
}
