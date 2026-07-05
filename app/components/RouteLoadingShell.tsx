import { cn } from '@/lib/utils'

interface RouteLoadingShellProps {
  title?: string
  className?: string
}

export default function RouteLoadingShell({
  title = 'Loading workspace...',
  className,
}: RouteLoadingShellProps) {
  return (
    <div className={cn('min-h-screen bg-background text-foreground', className)}>
      <div className="v0-dashboard-theme dark min-h-screen">
        <div className="flex min-h-screen">
          <div className="hidden w-72 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
            <div className="space-y-4 px-5 py-5">
              <div className="h-11 w-44 animate-pulse rounded-2xl bg-accent/60" />
              <div className="h-16 animate-pulse rounded-xl border border-sidebar-border bg-card/60" />
              <div className="space-y-2">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-11 animate-pulse rounded-xl bg-accent/40"
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="border-b border-border bg-card/80 px-4 py-4 md:px-6">
              <div className="flex items-center justify-between gap-4">
                <div className="h-10 w-40 animate-pulse rounded-2xl bg-accent/50" />
                <div className="h-10 w-44 animate-pulse rounded-2xl bg-accent/50" />
              </div>
            </div>

            <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 lg:py-8">
              <div className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
                <div className="h-4 w-32 animate-pulse rounded-full bg-accent/50" />
                <div className="mt-4 h-10 w-72 max-w-full animate-pulse rounded-2xl bg-accent/50" />
                <div className="mt-3 h-4 w-full max-w-2xl animate-pulse rounded-full bg-accent/40" />
                <div className="mt-2 h-4 w-5/6 max-w-xl animate-pulse rounded-full bg-accent/30" />
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-3xl border border-border bg-card/95 p-5 shadow-sm"
                  >
                    <div className="h-24 animate-pulse rounded-2xl bg-accent/40" />
                    <div className="mt-4 h-5 w-2/3 animate-pulse rounded-full bg-accent/40" />
                    <div className="mt-2 h-4 w-full animate-pulse rounded-full bg-accent/30" />
                    <div className="mt-2 h-4 w-4/5 animate-pulse rounded-full bg-accent/20" />
                  </div>
                ))}
              </div>

              <p className="mt-6 text-sm text-muted-foreground">{title}</p>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
