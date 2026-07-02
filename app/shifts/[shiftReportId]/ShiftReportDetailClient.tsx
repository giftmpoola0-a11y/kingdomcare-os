'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, ClipboardList, FileClock, NotebookPen } from 'lucide-react'
import type { SidebarBadgeCounts } from '@/app/lib/sidebar-badge-counts'
import type { ShiftReportRecord } from '@/app/lib/supabase/shiftReports'
import { AppSidebar } from '@/components/kingdomos-v0/app-sidebar'
import { AppTopbar } from '@/components/kingdomos-v0/app-topbar'

export interface ShiftReportDetailClientProps {
  shiftReport: ShiftReportRecord
  sidebarBadgeCounts: SidebarBadgeCounts
}

export default function ShiftReportDetailClient({
  shiftReport,
  sidebarBadgeCounts,
}: ShiftReportDetailClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} badgeCounts={sidebarBadgeCounts} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar onMenu={() => setSidebarOpen(true)} />

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 lg:py-8">
          <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  href="/shifts"
                  className="inline-flex items-center gap-2 self-start rounded-xl border border-border bg-background/60 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
                >
                  <ArrowLeft className="size-4" />
                  Back to Shifts
                </Link>

                <Link
                  href="/shifts/new"
                  className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                  <NotebookPen className="size-4" />
                  New shift report
                </Link>
              </div>

              <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-500/12 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-indigo-200 ring-1 ring-indigo-400/20">
                  <span className="inline-flex size-2 rounded-full bg-indigo-400" aria-hidden="true" />
                  Shift Report
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  {shiftReport.residentName}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Full saved shift report for this resident, loaded directly from Supabase.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DetailField label="Resident" value={shiftReport.residentName} />
            <DetailField label="Shift Date" value={formatShiftDate(shiftReport.shiftDate)} />
            <DetailField label="Shift Type" value={shiftReport.shiftType} />
            <DetailField label="Created" value={formatCreatedAt(shiftReport.createdAt)} />
          </section>

          <section className="mt-6 rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/25">
                <ClipboardList className="size-5" />
              </span>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Summary</h2>
                <p className="text-sm text-muted-foreground">
                  Saved {formatSavedAt(shiftReport.createdAt)}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-background/60 p-5">
              <p className="text-sm leading-relaxed text-foreground">{shiftReport.summary}</p>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25">
                <FileClock className="size-5" />
              </span>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Notes</h2>
                <p className="text-sm text-muted-foreground">
                  {shiftReport.notes.length} note{shiftReport.notes.length === 1 ? '' : 's'} saved.
                </p>
              </div>
            </div>

            {shiftReport.notes.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-border bg-background/60 p-8 text-center">
                <p className="text-sm text-muted-foreground">No notes were saved for this shift report.</p>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {shiftReport.notes.map((note) => (
                  <article key={`${note.label}:${note.value}`} className="rounded-2xl border border-border bg-background/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {note.label}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-foreground">{note.value}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}

function DetailField({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/95 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
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
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatSavedAt(value: string) {
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
