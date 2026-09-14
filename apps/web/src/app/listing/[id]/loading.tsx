import { Skeleton } from '@/components/ui/skeleton';

export default function ListingLoading() {
  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-12">
      <p role="status" className="sr-only">Загружаем объявление…</p>
      <div aria-hidden="true">
        <div className="glass-panel border-b border-border/60 pt-[env(safe-area-inset-top)]">
          <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-3 px-4 py-2 md:px-6">
            <Skeleton className="size-11 shrink-0 rounded-full motion-reduce:animate-none" />
            <div className="min-w-0 flex-1"><Skeleton className="h-6 w-28 motion-reduce:animate-none" /></div>
            <Skeleton className="h-11 w-32 rounded-full motion-reduce:animate-none" />
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pt-5 md:px-6">
          <div className="mb-6 space-y-3">
            <Skeleton className="h-8 w-36 motion-reduce:animate-none" />
            <Skeleton className="h-9 w-3/4 motion-reduce:animate-none" />
            <Skeleton className="h-5 w-1/2 motion-reduce:animate-none" />
          </div>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
            <Skeleton className="aspect-[4/3] w-full rounded-3xl motion-reduce:animate-none sm:aspect-[16/10]" />
            <div className="space-y-5 rounded-3xl border border-border p-5">
              <Skeleton className="h-9 w-1/2 motion-reduce:animate-none" />
              <Skeleton className="h-[52px] w-full rounded-full motion-reduce:animate-none" />
              <Skeleton className="h-[52px] w-full rounded-full motion-reduce:animate-none" />
              <Skeleton className="h-[52px] w-full rounded-full motion-reduce:animate-none" />
              <Skeleton className="h-14 w-full rounded-2xl motion-reduce:animate-none" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-7 w-40 motion-reduce:animate-none" />
              <Skeleton className="h-4 w-full motion-reduce:animate-none" />
              <Skeleton className="h-4 w-full motion-reduce:animate-none" />
              <Skeleton className="h-4 w-3/4 motion-reduce:animate-none" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
