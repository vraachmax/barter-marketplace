import { Suspense } from 'react';
import { ProfileContent } from './profile-content';

function ProfileFallback() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 bg-muted">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-primary/30 border-t-transparent"
        role="status"
        aria-label="Загрузка"
      />
      <p className="text-sm text-muted-foreground">Загрузка кабинета…</p>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileFallback />}>
      <ProfileContent />
    </Suspense>
  );
}
