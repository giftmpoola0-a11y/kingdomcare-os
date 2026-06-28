import { HeartPulse, ChevronRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { attentionItems, type AttentionItem } from "@/lib/kingdomos-v0-dashboard-data"
import { cn } from "@/lib/utils"

const priorityConfig: Record<
  AttentionItem["priority"],
  { label: string; badge: string; ring: string; bar: string; row: string }
> = {
  urgent: {
    label: "Urgent",
    badge: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/35",
    ring: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/35",
    bar: "bg-destructive",
    row: "border-rose-400/20 shadow-[0_0_0_1px_rgba(251,113,133,0.12),0_0_22px_rgba(251,113,133,0.1)]",
  },
  warning: {
    label: "Warning",
    badge: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/35",
    ring: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/35",
    bar: "bg-warning",
    row: "border-amber-400/20 shadow-[0_0_0_1px_rgba(251,191,36,0.12),0_0_18px_rgba(251,191,36,0.08)]",
  },
  watch: {
    label: "Watch",
    badge: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/35",
    ring: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/35",
    bar: "bg-success",
    row: "border-emerald-400/20 shadow-[0_0_0_1px_rgba(52,211,153,0.1),0_0_18px_rgba(52,211,153,0.06)]",
  },
}

export function CareAttention() {
  return (
    <Card className="gap-0 rounded-2xl border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/35">
            <HeartPulse className="size-[18px]" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Care attention needed</h2>
            <p className="text-xs text-muted-foreground">Residents flagged for review</p>
          </div>
        </div>
        <span className="rounded-full bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-300 ring-1 ring-rose-400/35">
          {attentionItems.length}
        </span>
      </div>

      <ul className="mt-5 flex flex-col gap-3">
        {attentionItems.map((item) => {
          const config = priorityConfig[item.priority]
          return (
            <li
              key={item.resident}
              className={cn(
                "group relative flex items-center gap-4 overflow-hidden rounded-xl border bg-background/60 p-3.5 transition-colors hover:bg-accent/40",
                config.row,
              )}
            >
              <span className={cn("absolute inset-y-0 left-0 w-1", config.bar)} aria-hidden="true" />
              <Avatar className="size-10">
                <AvatarFallback className={cn("text-xs font-semibold", config.ring)}>
                  {item.initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{item.resident}</p>
                  <span className="text-xs text-muted-foreground">{item.room}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.issue}</p>
              </div>
              <span className={cn("hidden shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium sm:inline-flex", config.badge)}>
                {config.label}
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
