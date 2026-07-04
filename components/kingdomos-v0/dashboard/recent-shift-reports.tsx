import Link from "next/link"
import { ArrowRight, ClipboardList, NotebookPen } from "lucide-react"
import { Card } from "@/components/ui/card"
import type { ShiftReportRecord } from "@/app/lib/supabase/shiftReports"

export function RecentShiftReports({ reports }: { reports?: ShiftReportRecord[] }) {
  const recentReports = reports ?? []

  return (
    <Card className="gap-0 rounded-2xl border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-indigo-500/12 text-indigo-200 ring-1 ring-indigo-400/20">
            <ClipboardList className="size-[18px]" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Recent shift reports</h2>
            <p className="text-xs text-muted-foreground">Latest saved handover and care notes</p>
          </div>
        </div>
        <Link href="/shifts" className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline">
          View all
        </Link>
      </div>

      {recentReports.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-border/80 bg-background/40 px-4 py-6 text-sm text-muted-foreground">
          No shift reports have been saved yet.
        </div>
      ) : (
        <ul className="mt-5 flex flex-col gap-3">
          {recentReports.map((report) => (
            <li key={report.id}>
              <Link
                href={`/shifts/${report.id}`}
                className="group flex items-start justify-between gap-3 rounded-xl border border-border bg-background/50 px-4 py-3 transition-colors hover:bg-accent/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{report.residentName}</p>
                    <span className="rounded-full bg-indigo-500/12 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-200 ring-1 ring-indigo-400/20">
                      {report.shiftType}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatShiftDate(report.shiftDate)} | Saved {formatSavedAt(report.createdAt)}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {report.summary.trim() || "No summary was saved for this shift report."}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground transition-colors group-hover:text-indigo-200">
                  Open
                  <ArrowRight className="size-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5">
        <Link
          href="/shifts/new"
          className="inline-flex items-center gap-2 rounded-full border border-border/90 bg-card/80 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-border hover:bg-accent/80"
        >
          <NotebookPen className="size-4" />
          Create shift report
        </Link>
      </div>
    </Card>
  )
}

function formatShiftDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  })
}

function formatSavedAt(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}
