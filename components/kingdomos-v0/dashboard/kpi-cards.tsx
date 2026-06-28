import { Users, ListChecks, Pill, TriangleAlert, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react"
import { Card } from "@/components/ui/card"
import { kpis, type Kpi } from "@/lib/kingdomos-v0-dashboard-data"
import { cn } from "@/lib/utils"

const iconMap = {
  "Active Residents": Users,
  "Open Tasks": ListChecks,
  "Medication Alerts": Pill,
  "Recent Incidents": TriangleAlert,
} as const

const toneStyles: Record<Kpi["tone"], string> = {
  gold: "bg-primary/15 text-primary",
  sage: "bg-success/15 text-success",
  amber: "bg-warning/20 text-warning-foreground",
  rose: "bg-destructive/15 text-destructive",
}

const trendIcon = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: Minus,
}

export function KpiCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => {
        const Icon = iconMap[kpi.label as keyof typeof iconMap] ?? Users
        const TrendIcon = trendIcon[kpi.trend]
        return (
          <Card
            key={kpi.label}
            className="gap-0 rounded-2xl border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <span className={cn("flex size-11 items-center justify-center rounded-xl", toneStyles[kpi.tone])}>
                <Icon className="size-5" />
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                <TrendIcon className="size-3" />
                {kpi.delta}
              </span>
            </div>
            <p className="mt-4 font-heading text-3xl font-semibold text-foreground">
              {kpi.value}
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">{kpi.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{kpi.hint}</p>
          </Card>
        )
      })}
    </div>
  )
}