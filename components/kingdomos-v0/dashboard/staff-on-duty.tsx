import { Users2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { staffOnDuty, type StaffMember } from "@/lib/kingdomos-v0-dashboard-data"
import { cn } from "@/lib/utils"

const statusConfig: Record<StaffMember["status"], { label: string; pill: string; dot: string }> = {
  "on-shift": {
    label: "On shift",
    pill: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/35",
    dot: "bg-emerald-400 shadow-[0_0_0_1px_rgba(52,211,153,0.35),0_0_12px_rgba(52,211,153,0.35)]",
  },
  break: {
    label: "On break",
    pill: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/35",
    dot: "bg-amber-400 shadow-[0_0_0_1px_rgba(251,191,36,0.35),0_0_12px_rgba(251,191,36,0.3)]",
  },
  arriving: {
    label: "Arriving",
    pill: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/35",
    dot: "bg-amber-300 shadow-[0_0_0_1px_rgba(252,211,77,0.32),0_0_12px_rgba(251,191,36,0.26)]",
  },
}

export function StaffOnDuty() {
  return (
    <Card className="gap-0 rounded-2xl border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-success/12 text-success">
            <Users2 className="size-[18px]" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Staff on duty</h2>
            <p className="text-xs text-muted-foreground">{staffOnDuty.length} caring for residents now</p>
          </div>
        </div>
      </div>

      <ul className="mt-5 flex flex-col gap-2">
        {staffOnDuty.map((member) => {
          const status = statusConfig[member.status]
          return (
            <li
              key={member.name}
              className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-accent/40"
            >
              <Avatar className="size-10">
                <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
                  {member.initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{member.name}</p>
                <p className="text-xs text-muted-foreground">
                  {member.role} / {member.shift}
                </p>
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
                  status.pill,
                )}
              >
                <span className={cn("size-2 rounded-full", status.dot)} />
                {status.label}
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
