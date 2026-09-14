import Link from 'next/link';
import { Settings } from 'lucide-react';
import { ScreenHeader } from '@/components/screen-header';
import { Button } from '@/components/ui/button';

export function AccountScreenHeader({
  title, subtitle, backHref = '/profile', backLabel = 'Назад в профиль',
  showSettings = true, width = 'account',
}: {
  title: string;
  subtitle: string;
  backHref?: string;
  backLabel?: string;
  showSettings?: boolean;
  width?: 'account' | 'wide' | 'catalog';
}) {
  return (
    <ScreenHeader
      title={title}
      subtitle={subtitle}
      backHref={backHref}
      backLabel={backLabel}
      width={width}
      actions={showSettings ? (
        <Button render={<Link href="/profile/settings" />} variant="secondary" size="icon" aria-label="Настройки">
          <Settings size={20} strokeWidth={1.8} aria-hidden />
        </Button>
      ) : undefined}
    />
  );
}
