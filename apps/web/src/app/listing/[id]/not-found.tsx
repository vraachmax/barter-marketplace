import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function ListingNotFound() {
  return (
    <main className="min-h-[60vh] bg-background px-4 py-10 pb-32">
      <Card className="mx-auto max-w-lg gap-4 rounded-3xl p-6">
        <h1 className="text-xl font-bold text-foreground">Объявление не найдено</h1>
        <p className="text-sm text-muted-foreground">Возможно, оно удалено или ссылка больше не действует.</p>
        <Button className="min-h-11 rounded-xl" render={<Link href="/" />}>Посмотреть другие объявления</Button>
      </Card>
    </main>
  );
}
