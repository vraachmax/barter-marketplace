'use client';

import Link from 'next/link';
import type { MyListing } from '@/lib/api';
import { Button } from '@/components/ui/button';

type Props = {
  listing: MyListing;
  busy: boolean;
  onEdit: () => void;
  onPromote: () => void;
  onPublish: () => void;
  onStatus: (status: 'ACTIVE' | 'SOLD' | 'ARCHIVED') => void;
  onRemove: () => void;
};

export function ListingManagementActions({ listing, busy, onEdit, onPromote, onPublish, onStatus, onRemove }: Props) {
  const blocked = listing.status === 'BLOCKED';
  return <div className="flex flex-col gap-2">
    <Button variant="secondary" disabled={busy} onClick={onEdit} className="w-full">Редактировать</Button>
    {listing.status === 'ACTIVE' ? <Button disabled={busy} onClick={onPromote} className="w-full whitespace-normal px-3">{listing.activePromotion ? 'Продлить продвижение' : 'Продвинуть'}</Button> : null}
    {listing.status === 'PENDING' ? <Button disabled={busy} onClick={onPublish} className="w-full whitespace-normal px-3">Подтвердить публикацию</Button> : null}
    <Button variant="outline" disabled={busy || blocked} onClick={() => onStatus(listing.status === 'SOLD' ? 'ACTIVE' : 'SOLD')} className="w-full whitespace-normal px-3">{listing.status === 'SOLD' ? 'Вернуть в активные' : 'Отметить проданным'}</Button>
    <Button variant="outline" disabled={busy || blocked} onClick={() => onStatus(listing.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED')} className="w-full">{listing.status === 'ARCHIVED' ? 'Из архива' : 'В архив'}</Button>
    {blocked ? <p className="text-sm text-muted-foreground">Объявление заблокировано. Смена статуса недоступна.</p> : null}
    <Link href="/pricing" className="inline-flex min-h-11 items-center justify-center rounded-full px-3 text-center text-sm text-foreground underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring">Все пакеты и подписка</Link>
    <Button variant="destructive" disabled={busy} onClick={onRemove} className="w-full">Удалить</Button>
  </div>;
}
