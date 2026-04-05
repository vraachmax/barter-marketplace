export default function RootLoading() {
  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950">
      {/* Header skeleton */}
      <div className="sticky top-0 z-50 border-b border-zinc-200/90 bg-white/95 dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <div className="h-8 w-28 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
          <div className="hidden h-10 flex-1 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900 md:block" />
          <div className="flex gap-2">
            <div className="h-9 w-24 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-9 w-24 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="mx-auto max-w-7xl px-4 pt-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
          {/* Sidebar skeleton */}
          <div className="hidden space-y-3 md:block">
            <div className="h-[400px] animate-pulse rounded-2xl bg-white dark:bg-zinc-900" />
          </div>

          {/* Feed skeleton */}
          <div className="space-y-4">
            {/* Sort bar */}
            <div className="h-14 animate-pulse rounded-2xl bg-white dark:bg-zinc-900" />
            {/* Cards */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-3 rounded-2xl border border-zinc-200/90 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="h-24 w-28 shrink-0 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                    <div className="h-5 w-1/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
