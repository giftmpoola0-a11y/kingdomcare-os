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
  gold: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/35 shadow-[0_0_0_1px_rgba(251,191,36,0.2),0_0_22px_rgba(251,191,36,0.2)]",
  sage: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/35 shadow-[0_0_0_1px_rgba(52,211,153,0.18),0_0_28px_rgba(52,211,153,0.22)]",
  amber: "bg-amber-500/18 text-amber-300 ring-1 ring-amber-400/35 shadow-[0_0_0_1px_rgba(251,191,36,0.2),0_0_22px_rgba(251,191,36,0.18)]",
  rose: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/35 shadow-[0_0_0_1px_rgba(251,113,133,0.2),0_0_22px_rgba(251,113,133,0.18)]",
}

const trendIcon = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: Minus,
}

interface KpiCardsProps {
  activeResidentsCount?: number
  openTasksCount?: number
  medicationAlertsCount?: number
  recentIncidentsCount?: number
}

export function KpiCards({
  activeResidentsCount,
  openTasksCount,
  medicationAlertsCount,
  recentIncidentsCount,
}: KpiCardsProps) {
  const resolvedKpis = kpis.map((kpi) =>
    kpi.label === "Active Residents" && typeof activeResidentsCount === "number"
      ? { ...kpi, value: String(activeResidentsCount) }
      : kpi.label === "Open Tasks" && typeof openTasksCount === "number"
        ? { ...kpi, value: String(openTasksCount) }
        : kpi.label === "Medication Alerts" && typeof medicationAlertsCount === "number"
          ? { ...kpi, value: String(medicationAlertsCount) }
          : kpi.label === "Recent Incidents" && typeof recentIncidentsCount === "number"
            ? { ...kpi, value: String(recentIncidentsCount) }
            : kpi,
  )

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {resolvedKpis.map((kpi) => {
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
            <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
              {kpi.value}
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">{kpi.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{kpi.hint}</p>
          </Card>
        )
      })}
    </div>
  )
}
