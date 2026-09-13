import { Skeleton } from '@/components/ui/skeleton';

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-background pb-28 text-foreground">
      <p role="status" className="sr-only">Загружаем страницу…</p>
      <div aria-hidden="true">
        <div className="border-b border-border bg-background">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 md:px-6">
            <Skeleton className="h-10 w-28 shrink-0 rounded-xl motion-reduce:animate-none" />
            <Skeleton className="hidden h-12 flex-1 rounded-full motion-reduce:animate-none md:block" />
            <Skeleton className="ml-auto size-12 shrink-0 rounded-full motion-reduce:animate-none" />
          </div>
          <div className="px-4 pb-4 md:hidden">
            <Skeleton className="h-12 w-full rounded-full motion-reduce:animate-none" />
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 pt-4 md:px-6">
          <Skeleton className="h-14 w-full max-w-96 rounded-full motion-reduce:animate-none" />
          <div className="grid max-w-full auto-cols-[8.5rem] grid-flow-col grid-rows-2 gap-2 overflow-hidden py-5 md:gap-3 md:py-6">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="flex min-h-[7.75rem] flex-col items-center gap-2 rounded-3xl border border-border bg-card p-2">
                <Skeleton className="size-16 rounded-2xl motion-reduce:animate-none" />
                <Skeleton className="mt-1 h-4 w-24 rounded motion-reduce:animate-none" />
              </div>
            ))}
          </div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <Skeleton className="h-7 w-44 motion-reduce:animate-none" />
            <Skeleton className="h-11 w-full max-w-80 rounded-full motion-reduce:animate-none" />
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 md:gap-x-5 md:gap-y-8 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="min-w-0">
                <Skeleton className="aspect-square w-full rounded-2xl motion-reduce:animate-none" />
                <div className="space-y-2 px-0.5 pt-2.5">
                  <Skeleton className="h-6 w-2/3 motion-reduce:animate-none" />
                  <Skeleton className="h-4 w-full motion-reduce:animate-none" />
                  <Skeleton className="h-4 w-3/4 motion-reduce:animate-none" />
                  <Skeleton className="h-3 w-1/2 motion-reduce:animate-none" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
