export default function ListingLoading() {
  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950">
      <div className="sticky top-0 z-50 border-b border-zinc-200/90 bg-white/95 dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <div className="h-9 w-36 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 pt-5">
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-5">
            <div className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
            <div className="space-y-3 rounded-2xl border border-zinc-200/90 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="h-7 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-8 w-1/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
              <div className="mt-4 space-y-2">
                <div className="h-3 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
                <div className="h-3 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
              </div>
            </div>
          </div>
          <div className="hidden space-y-4 lg:block">
            <div className="h-48 animate-pulse rounded-2xl bg-white dark:bg-zinc-900" />
            <div className="h-12 animate-pulse rounded-2xl bg-white dark:bg-zinc-900" />
          </div>
        </div>
      </div>
    </div>
  );
}
