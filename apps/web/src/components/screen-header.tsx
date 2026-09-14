import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  backHref: string;
  backLabel: string;
  actions?: ReactNode;
  width?: 'account' | 'wide' | 'catalog';
  titleAs?: 'h1' | 'p';
};

/** Shared navigation for detail and account screens; content stays on an opaque surface. */
export function ScreenHeader({
  title, subtitle, backHref, backLabel, actions, width = 'account', titleAs: Title = 'h1',
}: ScreenHeaderProps) {
  const maxWidth = { account: 'max-w-3xl', wide: 'max-w-6xl', catalog: 'max-w-7xl' }[width];
  return (
    <header className="glass-panel sticky top-0 z-30 border-b border-border/60 pt-[env(safe-area-inset-top)]">
      <div className={`mx-auto flex min-h-16 items-center gap-3 px-4 py-2 md:px-6 ${maxWidth}`}>
        <Button render={<Link href={backHref} />} variant="secondary" size="icon" aria-label={backLabel}>
          <ArrowLeft size={20} className="size-5" strokeWidth={1.8} aria-hidden />
        </Button>
        <div className="min-w-0 flex-1">
          <Title className="truncate text-lg font-semibold tracking-tight">{title}</Title>
          {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
