import { Users2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export interface DashboardCareTeamMember {
  id: string
  fullName: string
  email: string
  role: "admin" | "nurse" | "caregiver"
}

const roleConfig: Record<DashboardCareTeamMember["role"], { label: string; pill: string; dot: string }> = {
  admin: {
    label: "Admin",
    pill: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/30",
    dot: "bg-rose-300",
  },
  nurse: {
    label: "Nurse",
    pill: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30",
    dot: "bg-emerald-300",
  },
  caregiver: {
    label: "Caregiver",
    pill: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/30",
    dot: "bg-amber-300",
  },
}

export function CareTeam({ members }: { members?: DashboardCareTeamMember[] }) {
  const careTeamMembers = members ?? []

  return (
    <Card className="gap-0 rounded-2xl border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-success/12 text-success">
            <Users2 className="size-[18px]" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Care Team</h2>
            <p className="text-xs text-muted-foreground">
              {careTeamMembers.length} {careTeamMembers.length === 1 ? "team member" : "team members"}
            </p>
          </div>
        </div>
      </div>

      {careTeamMembers.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-border/80 bg-background/40 px-4 py-6 text-sm text-muted-foreground">
          No care team members found yet.
        </div>
      ) : (
        <ul className="mt-5 flex flex-col gap-2">
          {careTeamMembers.map((member) => {
            const role = roleConfig[member.role]

            return (
              <li
                key={member.id}
                className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-accent/40"
              >
                <Avatar className="size-10">
                  <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
                    {getInitials(member.fullName || member.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {member.fullName || member.email || "Unnamed member"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {member.email || "Care team member"}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
                    role.pill,
                  )}
                >
                  <span className={cn("size-2 rounded-full", role.dot)} />
                  {role.label}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

function getInitials(value: string) {
  const parts = value
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)

  if (parts.length === 0) {
    return "CT"
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("")
}
