import Link from "next/link"
import { Users, ListChecks, AlertOctagon, TriangleAlert, ArrowRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const cards = [
  {
    label: "Active Residents",
    href: "/residents",
    tone: "gold",
    icon: Users,
  },
  {
    label: "Open Tasks",
    href: "/tasks",
    tone: "sage",
    icon: ListChecks,
  },
  {
    label: "Overdue Tasks",
    href: "/tasks",
    tone: "amber",
    icon: AlertOctagon,
  },
  {
    label: "Open Incidents",
    href: "/incidents",
    tone: "rose",
    icon: TriangleAlert,
  },
] as const

const toneStyles = {
  gold: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/35 shadow-[0_0_0_1px_rgba(251,191,36,0.2),0_0_22px_rgba(251,191,36,0.2)]",
  sage: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/35 shadow-[0_0_0_1px_rgba(52,211,153,0.18),0_0_28px_rgba(52,211,153,0.22)]",
  amber: "bg-amber-500/18 text-amber-300 ring-1 ring-amber-400/35 shadow-[0_0_0_1px_rgba(251,191,36,0.2),0_0_22px_rgba(251,191,36,0.18)]",
  rose: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/35 shadow-[0_0_0_1px_rgba(251,113,133,0.2),0_0_22px_rgba(251,113,133,0.18)]",
} as const

interface KpiCardsProps {
  activeResidentsCount?: number
  openTasksCount?: number
  overdueTasksCount?: number
  openIncidentsCount?: number
}

export function KpiCards({
  activeResidentsCount = 0,
  openTasksCount = 0,
  overdueTasksCount = 0,
  openIncidentsCount = 0,
}: KpiCardsProps) {
  const values = {
    "Active Residents": activeResidentsCount,
    "Open Tasks": openTasksCount,
    "Overdue Tasks": overdueTasksCount,
    "Open Incidents": openIncidentsCount,
  } as const

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        const value = values[card.label]

        return (
          <Link key={card.label} href={card.href} className="block">
            <Card className="gap-0 rounded-2xl border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <span className={cn("flex size-11 items-center justify-center rounded-xl", toneStyles[card.tone])}>
                  <Icon className="size-5" />
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                  Open workspace
                  <ArrowRight className="size-3" />
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
                {value}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{card.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{cardHint(card.label, value)}</p>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

function cardHint(label: (typeof cards)[number]["label"], value: number) {
  switch (label) {
    case "Active Residents":
      return value === 0 ? "No active resident records yet." : "Resident census for the current care home."
    case "Open Tasks":
      return value === 0 ? "No open care tasks right now." : "Tasks still waiting to be completed or reviewed."
    case "Overdue Tasks":
      return value === 0 ? "No overdue tasks at the moment." : "Open tasks with due times already passed."
    default:
      return value === 0 ? "No open incidents need follow-up right now." : "Incidents still open or under review."
  }
}
