import { ArrowUpRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ListingMiniMap({ latitude, longitude, city }: { latitude: number; longitude: number; city: string }) {
  const href = `https://yandex.ru/maps/?pt=${longitude},${latitude}&z=14&l=map`;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted/50 p-4">
      <p className="flex items-center gap-2 text-base"><MapPin size={20} className="shrink-0 text-muted-foreground" aria-hidden />{city}</p>
      <Button render={<a href={href} target="_blank" rel="noopener noreferrer" />} variant="outline" size="sm">
        Открыть карту<ArrowUpRight size={18} aria-hidden /><span className="sr-only">в новой вкладке</span>
      </Button>
    </div>
  );
}
