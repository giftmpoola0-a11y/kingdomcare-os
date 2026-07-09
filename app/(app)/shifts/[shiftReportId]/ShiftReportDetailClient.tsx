'use client'

import Link from 'next/link'
import { ArrowLeft, ClipboardList, FileClock, NotebookPen } from 'lucide-react'
import type { ShiftReportRecord } from '@/app/lib/supabase/shiftReports'

export interface ShiftReportDetailClientProps {
  shiftReport: ShiftReportRecord
}

export default function ShiftReportDetailClient({
  shiftReport,
}: ShiftReportDetailClientProps) {

  return (
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
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                    {shiftReport.residentName}
                  </h1>
                  <span className="rounded-full bg-indigo-500/12 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-200 ring-1 ring-indigo-400/20">
                    {shiftReport.shiftType}
                  </span>
                </div>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Review the saved shift summary, note entries, and report metadata for this resident.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DetailField label="Resident" value={shiftReport.residentName} />
            <DetailField label="Shift Date" value={formatShiftDate(shiftReport.shiftDate)} />
            <DetailField label="Shift Type" value={shiftReport.shiftType} />
            <DetailField label="Saved" value={formatCreatedAt(shiftReport.createdAt)} />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
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
                <p className="text-sm leading-relaxed text-foreground">{formatSummary(shiftReport.summary)}</p>
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/25">
                  <FileClock className="size-5" />
                </span>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">Report Metadata</h2>
                  <p className="text-sm text-muted-foreground">
                    Practical saved fields for this report.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <DetailPanel label="Created by" value={formatCreatedBy(shiftReport.createdBy)} />
                <DetailPanel label="Notes saved" value={`${shiftReport.notes.length}`} />
                <DetailPanel label="Created" value={formatCreatedAt(shiftReport.createdAt)} />
                <DetailPanel label="Updated" value={formatCreatedAt(shiftReport.updatedAt)} />
                <DetailPanel label="Resident link" value={shiftReport.residentId ? 'Resident stored' : 'No resident id stored'} />
                <DetailPanel label="Report id" value={shortId(shiftReport.id)} monospace />
              </div>
            </section>
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
                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">
                      {formatNoteValue(note.value)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
    </main>
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

function DetailPanel({
  label,
  value,
  monospace = false,
}: {
  label: string
  value: string
  monospace?: boolean
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className={`mt-3 text-sm text-foreground ${monospace ? 'font-mono text-xs sm:text-sm' : ''}`}>
        {value}
      </p>
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

function formatSummary(value: string) {
  const trimmed = value.trim()
  return trimmed || 'No summary was saved for this shift report.'
}

function formatNoteValue(value: string) {
  const trimmed = value.trim()
  return trimmed || 'No note detail was saved.'
}

function formatCreatedBy(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return 'Unknown'
  }

  return trimmed
}

function shortId(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return 'Unknown'
  }

  return trimmed.length > 18 ? `${trimmed.slice(0, 8)}...${trimmed.slice(-6)}` : trimmed
}





