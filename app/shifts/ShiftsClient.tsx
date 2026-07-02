'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ClipboardList, FileClock, NotebookPen } from 'lucide-react'
import { AppSidebar } from '@/components/kingdomos-v0/app-sidebar'
import { AppTopbar } from '@/components/kingdomos-v0/app-topbar'
import type { SidebarBadgeCounts } from '@/app/lib/sidebar-badge-counts'
import type { ShiftReportRecord } from '@/app/lib/supabase/shiftReports'

export interface ShiftsClientProps {
  shiftReports: ShiftReportRecord[]
  sidebarBadgeCounts: SidebarBadgeCounts
  loadError: string | null
}

export default function ShiftsClient({
  shiftReports,
  sidebarBadgeCounts,
  loadError,
}: ShiftsClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} badgeCounts={sidebarBadgeCounts} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar onMenu={() => setSidebarOpen(true)} />

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 lg:py-8">
          <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-500/12 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-indigo-200 ring-1 ring-indigo-400/20">
                  <span className="inline-flex size-2 rounded-full bg-indigo-400" aria-hidden="true" />
                  Shift Reports
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  Shifts
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Review the most recent Supabase-backed shift reports saved for your care home.
                </p>
              </div>

              <Link
                href="/shifts/new"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                <NotebookPen className="size-4" />
                New shift report
              </Link>
            </div>
          </section>

          {loadError && (
            <p
              role="alert"
              className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200"
            >
              {loadError}
            </p>
          )}

          <section className="mt-6 rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/25">
                <ClipboardList className="size-5" />
              </span>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Recent shift reports</h2>
                <p className="text-sm text-muted-foreground">
                  {shiftReports.length} report{shiftReports.length === 1 ? '' : 's'} loaded.
                </p>
              </div>
            </div>

            {shiftReports.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-border bg-background/60 p-8 text-center">
                <p className="text-sm text-muted-foreground">No shift reports found yet.</p>
                <Link
                  href="/shifts/new"
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                  <NotebookPen className="size-4" />
                  New shift report
                </Link>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {shiftReports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/shifts/${report.id}`}
                    className="block rounded-2xl border border-border bg-background/60 p-4 transition-colors hover:bg-background/80 sm:p-5"
                  >
                    <article>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-foreground">
                              {report.residentName}
                            </h3>
                            <span className="rounded-full bg-indigo-500/12 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-200 ring-1 ring-indigo-400/20">
                              {report.shiftType}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            {truncateSummary(report.summary)}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card/70 px-3 py-2 text-xs text-muted-foreground">
                          <FileClock className="size-4" />
                          <span>{formatCreatedAt(report.createdAt)}</span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full border border-border bg-card/70 px-3 py-1.5">
                          Shift date: {formatShiftDate(report.shiftDate)}
                        </span>
                        <span className="rounded-full border border-border bg-card/70 px-3 py-1.5">
                          Saved: {formatSavedAt(report.createdAt)}
                        </span>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}

function truncateSummary(summary: string) {
  const trimmed = summary.trim()
  if (trimmed.length <= 180) {
    return trimmed
  }

  return `${trimmed.slice(0, 177).trimEnd()}...`
}

function formatShiftDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatCreatedAt(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatSavedAt(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
