import { CalendarClock, Check } from "lucide-react"
import { Card } from "@/components/ui/card"
import { timeline } from "@/lib/kingdomos-v0-dashboard-data"
import { cn } from "@/lib/utils"

const itemStateStyles = {
  done: {
    line: "bg-emerald-400/35",
    dot: "border-emerald-300 bg-emerald-400 shadow-[0_0_0_1px_rgba(110,231,183,0.38),0_0_18px_rgba(52,211,153,0.34)]",
    badge: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/35",
    check: "text-emerald-950",
  },
  active: {
    line: "bg-amber-400/35",
    dot: "border-amber-300 bg-amber-400 shadow-[0_0_0_1px_rgba(252,211,77,0.4),0_0_20px_rgba(251,191,36,0.32)]",
    badge: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/35",
    check: "text-amber-950",
  },
  upcoming: {
    line: "bg-zinc-500/30",
    dot: "border-zinc-400/55 bg-zinc-500/15 shadow-[0_0_0_1px_rgba(161,161,170,0.18)]",
    badge: "bg-zinc-500/15 text-zinc-300 ring-1 ring-zinc-400/25",
    check: "text-zinc-300",
  },
} as const

export function TodayGlance() {
  return (
    <Card className="gap-0 rounded-2xl border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-warning/12 text-warning">
          <CalendarClock className="size-[18px]" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Today at a glance</h2>
          <p className="text-xs text-muted-foreground">Care schedule & key moments</p>
        </div>
      </div>

      <ol className="mt-6 flex flex-col">
        {timeline.map((event, i) => {
          const state =
            event.status === "Done"
              ? itemStateStyles.done
              : event.status === "In progress"
                ? itemStateStyles.active
                : itemStateStyles.upcoming

          return (
            <li key={event.title} className="relative flex gap-4 pb-6 last:pb-0">
              {i !== timeline.length - 1 && (
                <span className={cn("absolute left-[9px] top-6 h-full w-px", state.line)} aria-hidden="true" />
              )}
              <span
                className={cn(
                  "relative z-10 mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                  state.dot,
                )}
              >
                {event.status === "Done" && <Check className={cn("size-3", state.check)} />}
              </span>

              <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium text-muted-foreground">
                      {event.time}
                    </span>
                    <span className="text-sm font-medium text-foreground">{event.title}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{event.detail}</p>
                </div>
                <span
                  className={cn(
                    "inline-flex w-fit items-center rounded-full px-3 py-1 text-[11px] font-semibold",
                    state.badge,
                  )}
                >
                  {event.status}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
