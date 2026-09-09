import Link from 'next/link';
import { ArrowLeft, Settings } from 'lucide-react';

export function AccountScreenHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return <header className="glass-panel sticky top-0 z-30 border-b border-border/60 pt-[env(safe-area-inset-top)]">
    <div className="mx-auto flex min-h-16 max-w-3xl items-center gap-3 px-4 py-2 md:px-6">
      <Link href="/profile" aria-label="Назад в профиль" className="grid size-11 shrink-0 place-items-center rounded-full border border-border/60 bg-card/80 hover:bg-muted"><ArrowLeft size={21} strokeWidth={1.8} aria-hidden /></Link>
      <div className="min-w-0 flex-1"><h1 className="text-lg font-semibold tracking-tight">{title}</h1><p className="truncate text-xs text-muted-foreground">{subtitle}</p></div>
      <Link href="/profile/settings" aria-label="Настройки" className="grid size-11 shrink-0 place-items-center rounded-full bg-muted/60 hover:bg-muted"><Settings size={21} strokeWidth={1.8} aria-hidden /></Link>
    </div>
  </header>;
}
