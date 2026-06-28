import { CalendarClock, Check } from "lucide-react"
import { Card } from "@/components/ui/card"
import { timeline, type TimelineEvent } from "@/lib/kingdomos-v0-dashboard-data"
import { cn } from "@/lib/utils"

const dotStyles: Record<TimelineEvent["tone"], string> = {
  sage: "bg-success border-success",
  gold: "bg-primary border-primary",
  amber: "bg-warning border-warning",
  rose: "bg-destructive border-destructive",
}

const statusStyles: Record<TimelineEvent["tone"], string> = {
  sage: "bg-success/15 text-success",
  gold: "bg-primary/15 text-primary",
  amber: "bg-warning/20 text-warning-foreground",
  rose: "bg-destructive/15 text-destructive",
}

export function TodayGlance() {
  return (
    <Card className="gap-0 rounded-2xl border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-accent/70 text-primary">
          <CalendarClock className="size-[18px]" />
        </span>
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Today at a glance
          </h2>
          <p className="text-xs text-muted-foreground">Care schedule & key moments</p>
        </div>
      </div>

      <ol className="mt-6 flex flex-col">
        {timeline.map((event, i) => {
          const done = event.status === "Done"
          return (
            <li key={event.title} className="relative flex gap-4 pb-6 last:pb-0">
              {/* connector line */}
              {i !== timeline.length - 1 && (
                <span className="absolute left-[7px] top-5 h-full w-px bg-border" aria-hidden="true" />
              )}
              <span
                className={cn(
                  "relative z-10 mt-1 flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                  done ? dotStyles[event.tone] : "border-border bg-card",
                )}
              >
                {done && <Check className="size-2.5 text-success-foreground" />}
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
                    "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                    statusStyles[event.tone],
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