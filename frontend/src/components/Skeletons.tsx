export const Skeleton = ({ className = "" }: { className?: string }) => (
  <div
    className={`animate-pulse rounded-md bg-white/5 ${className}`}
    aria-hidden="true"
  />
);

export const HomeSkeleton = () => (
  <div className="min-h-svh flex flex-col bg-background">
    <div className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
    <main className="flex-1 mx-auto w-full max-w-3xl px-5 py-10 md:py-14">
      <section className="space-y-6">
        <Skeleton className="h-6 w-40" />
        <div className="flex flex-col md:flex-row md:items-center md:gap-6">
          <div className="flex-1 space-y-3">
            <Skeleton className="h-12 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
          <Skeleton className="mt-4 md:mt-0 h-[180px] w-[180px] rounded-2xl shrink-0" />
        </div>
        <div className="glass card-shadow rounded-2xl p-4 space-y-3">
          <Skeleton className="h-24 w-full" />
          <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-11 w-40 rounded-xl" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-40 rounded-full" />
          <Skeleton className="h-7 w-52 rounded-full" />
          <Skeleton className="h-7 w-36 rounded-full" />
        </div>
      </section>
    </main>
  </div>
);

export const DiagnosisSkeleton = () => (
  <div className="min-h-svh flex flex-col bg-background">
    <div className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
    <main className="flex-1 mx-auto w-full max-w-7xl px-5 py-8">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="mt-4 h-8 w-2/3" />
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-7 space-y-5">
          <div className="glass card-shadow rounded-2xl p-5 space-y-4">
            <Skeleton className="h-10 w-3/5" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
          <div className="glass card-shadow rounded-2xl p-5 space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        </section>
        <section className="lg:col-span-5">
          <Skeleton className="h-[420px] lg:h-full lg:min-h-[520px] rounded-2xl" />
        </section>
      </div>
      <div className="mt-10">
        <Skeleton className="h-5 w-48" />
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-5 space-y-3">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-7">
            <Skeleton className="h-[420px] w-full rounded-2xl" />
          </div>
        </div>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
      </div>
    </main>
  </div>
);

export const LoginSkeleton = () => (
  <div className="flex h-svh w-full overflow-hidden bg-background">
    <div className="hidden md:block flex-1 bg-gradient-to-br from-primary/40 to-secondary/40" />
    <div className="flex-1 flex items-center justify-center px-5 py-6">
      <div className="w-full max-w-sm">
        <div className="glass card-shadow rounded-2xl p-7 space-y-5">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </div>
    </div>
  </div>
);
