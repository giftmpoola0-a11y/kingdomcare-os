import { CalendarClock, Check, ListChecks, Pill, TriangleAlert } from "lucide-react"
import { Card } from "@/components/ui/card"
import { timeline } from "@/lib/kingdomos-v0-dashboard-data"
import { cn } from "@/lib/utils"

export type DashboardOperationalQueueItem = {
  id: string
  source: "task" | "incident" | "medication_alert"
  title: string
  subtitle: string
  dueLabel?: string
  status: "done" | "in_progress" | "upcoming" | "overdue" | "review"
  severity: "normal" | "warning" | "urgent"
  href?: string
}

const itemStateStyles = {
  done: {
    line: "bg-emerald-400/35",
    dot: "border-emerald-300 bg-emerald-400 shadow-[0_0_0_1px_rgba(110,231,183,0.38),0_0_18px_rgba(52,211,153,0.34)]",
    badge: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/35",
    check: "text-emerald-950",
    label: "Done",
  },
  in_progress: {
    line: "bg-amber-400/35",
    dot: "border-amber-300 bg-amber-400 shadow-[0_0_0_1px_rgba(252,211,77,0.4),0_0_20px_rgba(251,191,36,0.32)]",
    badge: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/35",
    check: "text-amber-950",
    label: "In progress",
  },
  upcoming: {
    line: "bg-zinc-500/30",
    dot: "border-zinc-400/55 bg-zinc-500/15 shadow-[0_0_0_1px_rgba(161,161,170,0.18)]",
    badge: "bg-zinc-500/15 text-zinc-300 ring-1 ring-zinc-400/25",
    check: "text-zinc-300",
    label: "Upcoming",
  },
  overdue: {
    line: "bg-rose-400/35",
    dot: "border-rose-300 bg-rose-400 shadow-[0_0_0_1px_rgba(251,113,133,0.42),0_0_20px_rgba(251,113,133,0.28)]",
    badge: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/35",
    check: "text-rose-950",
    label: "Overdue",
  },
  review: {
    line: "bg-amber-400/35",
    dot: "border-amber-300 bg-amber-400 shadow-[0_0_0_1px_rgba(252,211,77,0.4),0_0_20px_rgba(251,191,36,0.32)]",
    badge: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/35",
    check: "text-amber-950",
    label: "Review",
  },
} as const

const sourceIconMap: Record<DashboardOperationalQueueItem["source"], typeof ListChecks> = {
  task: ListChecks,
  incident: TriangleAlert,
  medication_alert: Pill,
}

function getMockQueueItems(): DashboardOperationalQueueItem[] {
  return timeline.map((event, index) => ({
    id: `mock-${index}`,
    source: index === 2 ? "incident" : index === 0 || index === 5 ? "medication_alert" : "task",
    title: event.title,
    subtitle: event.detail,
    dueLabel: event.time,
    status:
      event.status === "Done"
        ? "done"
        : event.status === "In progress"
          ? "in_progress"
          : "upcoming",
    severity: event.status === "Done" ? "normal" : event.status === "In progress" ? "warning" : "normal",
  }))
}

export function TodayGlance({ items }: { items?: DashboardOperationalQueueItem[] }) {
  const resolvedItems = items ?? getMockQueueItems()
  const isRealQueue = items !== undefined

  return (
    <Card className="gap-0 rounded-2xl border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-warning/12 text-warning">
          <CalendarClock className="size-[18px]" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {isRealQueue ? "Today's operational queue" : "Today at a glance"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isRealQueue ? "Live tasks, incidents, and medication alerts needing attention" : "Care schedule & key moments"}
          </p>
        </div>
      </div>

      {isRealQueue && resolvedItems.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-background/50 px-4 py-6">
          <p className="text-sm text-foreground">No operational queue items right now.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tasks, incidents, and medication alerts will appear here when they need attention.
          </p>
        </div>
      ) : (
        <ol className="mt-6 flex flex-col">
          {resolvedItems.map((event, i) => {
            const state = itemStateStyles[event.status]
            const SourceIcon = sourceIconMap[event.source]

            const itemContent = (
              <>
                {i !== resolvedItems.length - 1 && (
                  <span className={cn("absolute left-[9px] top-6 h-full w-px", state.line)} aria-hidden="true" />
                )}
                <span
                  className={cn(
                    "relative z-10 mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                    state.dot,
                  )}
                >
                  {event.status === "done" ? <Check className={cn("size-3", state.check)} /> : <SourceIcon className="size-3 text-current" />}
                </span>

                <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {event.dueLabel ? (
                        <span className="font-mono text-xs font-medium text-muted-foreground">{event.dueLabel}</span>
                      ) : null}
                      <span className="text-sm font-medium text-foreground">{event.title}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{event.subtitle}</p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex w-fit items-center rounded-full px-3 py-1 text-[11px] font-semibold",
                      state.badge,
                    )}
                  >
                    {state.label}
                  </span>
                </div>
              </>
            )

            return (
              <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
                {event.href ? (
                  <a href={event.href} className="contents">
                    {itemContent}
                  </a>
                ) : (
                  itemContent
                )}
              </li>
            )
          })}
        </ol>
      )}
    </Card>
  )
}
