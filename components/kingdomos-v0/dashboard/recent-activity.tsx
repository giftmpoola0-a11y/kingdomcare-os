import { Activity as ActivityIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { recentActivity } from "@/lib/kingdomos-v0-dashboard-data"

export function RecentActivity() {
  return (
    <Card className="gap-0 rounded-2xl border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-accent/70 text-primary">
            <ActivityIcon className="size-[18px]" />
          </span>
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">Recent activity</h2>
            <p className="text-xs text-muted-foreground">Latest updates from your team</p>
          </div>
        </div>
        <a href="#" className="text-xs font-medium text-primary hover:underline">
          View all
        </a>
      </div>

      <ul className="mt-5 flex flex-col gap-1">
        {recentActivity.map((item, i) => (
          <li key={i} className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-accent/40">
            <Avatar className="size-8">
              <AvatarFallback className="bg-secondary text-[11px] font-semibold text-secondary-foreground">
                {item.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-sm leading-snug">
              <p className="text-foreground">
                <span className="font-medium">{item.who}</span>{" "}
                <span className="text-muted-foreground">{item.action}</span>{" "}
                <span className="font-medium">{item.target}</span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.time}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}