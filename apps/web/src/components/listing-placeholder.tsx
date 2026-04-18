import { Camera } from 'lucide-react';

type Props = {
  title?: string;
  categoryTitle?: string;
  className?: string;
};

export default function ListingPlaceholder({ className }: Props) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-[#F5F5F5] ${className ?? ''}`}
      aria-label="placeholder-image"
    >
      <Camera size={28} strokeWidth={1.4} className="text-[#CCC]" aria-hidden />
    </div>
  );
}
