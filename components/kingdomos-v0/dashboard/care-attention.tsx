import { HeartPulse, ChevronRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { attentionItems, type AttentionItem } from "@/lib/kingdomos-v0-dashboard-data"
import { cn } from "@/lib/utils"

const priorityConfig: Record<
  AttentionItem["priority"],
  { label: string; badge: string; ring: string; bar: string }
> = {
  urgent: {
    label: "Urgent",
    badge: "bg-destructive/15 text-destructive",
    ring: "bg-destructive/15 text-destructive",
    bar: "bg-destructive",
  },
  warning: {
    label: "Warning",
    badge: "bg-warning/20 text-warning-foreground",
    ring: "bg-warning/20 text-warning-foreground",
    bar: "bg-warning",
  },
  watch: {
    label: "Watch",
    badge: "bg-success/15 text-success",
    ring: "bg-success/15 text-success",
    bar: "bg-success",
  },
}

export function CareAttention() {
  return (
    <Card className="gap-0 rounded-2xl border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <HeartPulse className="size-[18px]" />
          </span>
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Care attention needed
            </h2>
            <p className="text-xs text-muted-foreground">Residents flagged for review</p>
          </div>
        </div>
        <span className="rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-semibold text-destructive">
          {attentionItems.length}
        </span>
      </div>

      <ul className="mt-5 flex flex-col gap-3">
        {attentionItems.map((item) => {
          const config = priorityConfig[item.priority]
          return (
            <li
              key={item.resident}
              className="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-border bg-background/60 p-3.5 transition-colors hover:bg-accent/40"
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
