"use client"

import {
  Activity as ActivityIcon,
  CheckCircle2,
  ListChecks,
  Pill,
  ShieldAlert,
  TriangleAlert,
  Users,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { recentActivity } from "@/lib/kingdomos-v0-dashboard-data"
import { cn } from "@/lib/utils"

export type DashboardRecentActivityItem = {
  id: string
  type: "resident" | "task" | "incident" | "medication" | "medication_alert"
  title: string
  description: string
  timestamp: string
  tone: "green" | "amber" | "red" | "gray"
}

const activityToneClasses: Record<DashboardRecentActivityItem["tone"], string> = {
  green: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30",
  amber: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/30",
  red: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/30",
  gray: "bg-zinc-500/15 text-zinc-300 ring-1 ring-zinc-400/25",
}

const activityIconMap: Record<DashboardRecentActivityItem["type"], typeof Users> = {
  resident: Users,
  task: ListChecks,
  incident: TriangleAlert,
  medication: Pill,
  medication_alert: ShieldAlert,
}

function getMockActivityItems(): DashboardRecentActivityItem[] {
  return recentActivity.map((item, index) => ({
    id: `mock-${index}`,
    type: index === 2 ? "incident" : index === 3 ? "resident" : index === 4 ? "task" : "medication",
    title: `${item.who} ${item.action} ${item.target}`,
    description: "Preview activity",
    timestamp: item.time,
    tone: index === 2 ? "red" : index === 4 ? "green" : "amber",
  }))
}

export function RecentActivity({ items }: { items?: DashboardRecentActivityItem[] }) {
  const resolvedItems = items ?? getMockActivityItems()

  return (
    <Card className="gap-0 rounded-2xl border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-border/80">
            <ActivityIcon className="size-[18px]" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Recent activity</h2>
            <p className="text-xs text-muted-foreground">Latest updates from your care home</p>
          </div>
        </div>
        <a href="#" className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline">
          View all
        </a>
      </div>

      {resolvedItems.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-border bg-background/50 px-4 py-6 text-sm text-muted-foreground">
          No recent activity yet.
        </div>
      ) : (
        <ul className="mt-5 flex flex-col gap-1">
          {resolvedItems.map((item) => {
            const Icon = activityIconMap[item.type]
            return (
              <li key={item.id} className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-accent/40">
                <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", activityToneClasses[item.tone])}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1 text-sm leading-snug">
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <StatusPill tone={item.tone} />
                    <p className="text-xs text-muted-foreground">{formatTimestamp(item.timestamp)}</p>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

function StatusPill({ tone }: { tone: DashboardRecentActivityItem["tone"] }) {
  const label = {
    green: "Completed",
    amber: "Needs review",
    red: "Urgent",
    gray: "Archived",
  }[tone]

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", activityToneClasses[tone])}>
      <CheckCircle2 className="size-3" />
      {label}
    </span>
  )
}

function formatTimestamp(value: string) {
  const timestamp = Date.parse(value)

  if (Number.isNaN(timestamp)) {
    return value
  }

  const diffMs = Date.now() - timestamp
  const diffMinutes = Math.max(Math.floor(diffMs / 60000), 0)

  if (diffMinutes < 1) return "Just now"
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}
