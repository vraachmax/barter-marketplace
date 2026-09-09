'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function ListingError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <main className="min-h-[60vh] bg-background px-4 py-10 pb-32">
      <Card className="mx-auto max-w-lg gap-4 rounded-3xl p-6">
        <h1 className="text-xl font-bold text-foreground">Не удалось открыть объявление</h1>
        <p role="alert" className="text-sm text-muted-foreground">Возможно, соединение прервалось или сервер временно недоступен. Попробуйте ещё раз.</p>
        <Button className="min-h-11 rounded-xl" disabled={pending} onClick={() => startTransition(() => { router.refresh(); reset(); })}>
          {pending ? 'Обновляем…' : 'Попробовать снова'}
        </Button>
        <Button variant="outline" className="min-h-11 rounded-xl" render={<Link href="/" />}>В каталог</Button>
      </Card>
    </main>
  );
}
