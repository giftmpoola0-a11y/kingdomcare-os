import { HeartPulse, ChevronRight, ListChecks, Pill, TriangleAlert } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { attentionItems } from "@/lib/kingdomos-v0-dashboard-data"
import { cn } from "@/lib/utils"

export type DashboardCareAttentionItem = {
  id: string
  source: "task" | "incident" | "medication_alert"
  title: string
  subtitle: string
  residentName?: string | null
  severity: "urgent" | "warning" | "watch"
  href?: string
}

const priorityConfig: Record<
  DashboardCareAttentionItem["severity"],
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

const sourceIconMap: Record<DashboardCareAttentionItem["source"], typeof ListChecks> = {
  task: ListChecks,
  incident: TriangleAlert,
  medication_alert: Pill,
}

function getMockAttentionItems(): DashboardCareAttentionItem[] {
  return attentionItems.map((item, index) => ({
    id: `mock-${index}`,
    source: index === 0 ? "incident" : index === 1 ? "medication_alert" : "task",
    title: item.issue,
    subtitle: item.room,
    residentName: item.resident,
    severity: item.priority,
  }))
}

export function CareAttention({ items }: { items?: DashboardCareAttentionItem[] }) {
  const resolvedItems = items ?? getMockAttentionItems()

  return (
    <Card className="gap-0 rounded-2xl border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/35">
            <HeartPulse className="size-[18px]" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Care attention needed</h2>
            <p className="text-xs text-muted-foreground">Residents and records flagged for review</p>
          </div>
        </div>
        <span className="rounded-full bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-300 ring-1 ring-rose-400/35">
          {resolvedItems.length}
        </span>
      </div>

      {resolvedItems.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-border bg-background/50 px-4 py-6 text-sm text-muted-foreground">
          No care attention items right now.
        </div>
      ) : (
        <ul className="mt-5 flex flex-col gap-3">
          {resolvedItems.map((item) => {
            const config = priorityConfig[item.severity]
            const Icon = sourceIconMap[item.source]
            const initials = getAttentionInitials(item)

            const content = (
              <>
                <span className={cn("absolute inset-y-0 left-0 w-1", config.bar)} aria-hidden="true" />
                <Avatar className="size-10">
                  <AvatarFallback className={cn("text-xs font-semibold", config.ring)}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border/80">
                      <Icon className="size-3" />
                      {sourceLabel(item.source)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {item.residentName ? `${item.residentName} · ` : ""}
                    {item.subtitle}
                  </p>
                </div>
                <span className={cn("hidden shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium sm:inline-flex", config.badge)}>
                  {config.label}
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </>
            )

            return (
              <li key={item.id}>
                {item.href ? (
                  <a
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-4 overflow-hidden rounded-xl border bg-background/60 p-3.5 transition-colors hover:bg-accent/40",
                      config.row,
                    )}
                  >
                    {content}
                  </a>
                ) : (
                  <div
                    className={cn(
                      "group relative flex items-center gap-4 overflow-hidden rounded-xl border bg-background/60 p-3.5 transition-colors hover:bg-accent/40",
                      config.row,
                    )}
                  >
                    {content}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

function getAttentionInitials(item: DashboardCareAttentionItem) {
  if (item.residentName) {
    return item.residentName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
  }

  return sourceLabel(item.source)
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2)
}

function sourceLabel(source: DashboardCareAttentionItem["source"]) {
  switch (source) {
    case "task":
      return "Task"
    case "incident":
      return "Incident"
    default:
      return "Alert"
  }
}
