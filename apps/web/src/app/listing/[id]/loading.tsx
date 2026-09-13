export default function ListingLoading() {
  return (
    <div role="status" aria-label="Загружаем объявление" className="min-h-screen bg-background pb-28 lg:pb-12">
      <div className="sticky top-0 z-50 border-b border-border bg-card/95">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <div className="h-9 w-36 animate-pulse motion-reduce:animate-none rounded-xl bg-muted" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 pt-5">
        <div aria-hidden="true" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-4">
          <div className="space-y-5">
            <div className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-muted motion-reduce:animate-none sm:aspect-[16/10]" />
            <div className="space-y-3 rounded-3xl border border-border bg-card p-4 sm:p-6">
              <div className="h-7 w-2/3 animate-pulse motion-reduce:animate-none rounded bg-muted" />
              <div className="h-8 w-1/4 animate-pulse motion-reduce:animate-none rounded bg-muted" />
              <div className="h-4 w-1/2 animate-pulse motion-reduce:animate-none rounded bg-muted" />
              <div className="mt-4 space-y-2">
                <div className="h-3 w-full animate-pulse motion-reduce:animate-none rounded bg-muted" />
                <div className="h-3 w-full animate-pulse motion-reduce:animate-none rounded bg-muted" />
                <div className="h-3 w-3/4 animate-pulse motion-reduce:animate-none rounded bg-muted" />
              </div>
            </div>
          </div>
          <div className="hidden space-y-4 lg:block">
            <div className="h-48 animate-pulse rounded-3xl bg-muted motion-reduce:animate-none" />
            <div className="h-[52px] animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
