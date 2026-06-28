import { UserPlus, NotebookPen, TriangleAlert, ListPlus } from "lucide-react"
import { cn } from "@/lib/utils"

const quickActions = [
  { label: "Add Resident", icon: UserPlus, primary: true },
  { label: "Start Shift Note", icon: NotebookPen, primary: false },
  { label: "Log Incident", icon: TriangleAlert, primary: false },
  { label: "Add Task", icon: ListPlus, primary: false },
]

function todayLabel() {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function WelcomeHeader() {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{todayLabel()}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground text-balance md:text-4xl">
          Good morning, Admin
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Here&apos;s everything happening across The Kingdom Care Homes today.
          Your residents are in good hands.
        </p>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {quickActions.map((action) => (
          <button
            key={action.label}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
              action.primary
                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/95"
                : "border border-border/90 bg-card/80 text-foreground hover:border-border hover:bg-accent/80",
            )}
          >
            <action.icon className="size-4" />
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}