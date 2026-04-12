'use client';

import { Suspense } from 'react';
import { ProfileContent } from '../profile-content';

function ListingsFallback() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 bg-zinc-100 dark:bg-zinc-950">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-sky-600 border-t-transparent dark:border-sky-400"
        role="status"
        aria-label="Загрузка"
      />
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Загрузка объявлений…</p>
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
