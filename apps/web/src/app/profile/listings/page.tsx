'use client';

import { Suspense } from 'react';
import { ProfileContent } from '../profile-content';

function ListingsFallback() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 bg-muted">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-primary/30 border-t-transparent"
        role="status"
        aria-label="Загрузка"
      />
      <p className="text-sm text-muted-foreground">Загрузка объявлений…</p>
    </div>
  );
}

export default function MobileListingsPage() {
  return (
    <Suspense fallback={<ListingsFallback />}>
      <ProfileContent />
    </Suspense>
  );
}