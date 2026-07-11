'use client'

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  BellRing,
  CalendarClock,
  ClipboardList,
  MapPin,
  NotebookPen,
  ShieldAlert,
  UserRound,
} from 'lucide-react'
import type { IncidentRecord, IncidentSeverity, IncidentStatus } from '@/app/lib/supabase/incidents'
import { cn } from '@/lib/utils'

export interface IncidentDetailClientProps {
  incident: IncidentRecord
  residentName: string
  createdByName: string
  reportedByName: string
}

export default function IncidentDetailClient({
  incident,
  residentName,
  createdByName,
  reportedByName,
}: IncidentDetailClientProps) {

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 lg:py-8">
          <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  href="/incidents"
                  className="inline-flex items-center gap-2 self-start rounded-xl border border-border bg-background/60 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
                >
                  <ArrowLeft className="size-4" />
                  Back to Incidents
                </Link>

                <Link
                  href="/incidents/new"
                  className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                  <NotebookPen className="size-4" />
                  Report another incident
                </Link>
              </div>

              <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-rose-500/12 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-rose-200 ring-1 ring-rose-400/20">
                  <span className="inline-flex size-2 rounded-full bg-rose-400" aria-hidden="true" />
                  Incident Detail
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                    {residentName}
                  </h1>
                  <SeverityBadge severity={incident.severity} />
                  <StatusBadge status={incident.status} />
                </div>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Review the saved incident details, follow-up notes, and record status.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DetailField icon={UserRound} label="Resident" value={residentName} />
            <DetailField icon={ShieldAlert} label="Incident type" value={incident.incidentType} />
            <DetailField icon={CalendarClock} label="Occurred" value={formatDateTime(incident.occurredAt)} />
            <DetailField icon={MapPin} label="Location" value={incident.location || 'Not recorded'} />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <DetailSection
                icon={AlertTriangle}
                title="Description"
                description="What happened during the incident."
              >
                <ReadBlock value={incident.description} emptyLabel="No description recorded." />
              </DetailSection>

              <DetailSection
                icon={ClipboardList}
                title="Immediate Action"
                description="What was done right away after the incident."
              >
                <ReadBlock value={incident.immediateAction} emptyLabel="No immediate action recorded." />
              </DetailSection>
            </div>

            <div className="space-y-6">
              <DetailSection
                icon={BellRing}
                title="Follow-up and Notifications"
                description="Notification and follow-up notes saved with this record."
              >
                <div className="grid gap-4">
                  <MiniField label="Follow-up required" value={incident.followUpRequired ? 'Yes' : 'No'} />
                  <MiniField label="Who was notified" value={incident.whoNotified || 'Not recorded'} multiline />
                  <MiniField label="Follow-up notes" value={incident.followUpNotes || 'Not recorded'} multiline />
                </div>
              </DetailSection>

              <DetailSection
                icon={ClipboardList}
                title="Record Metadata"
                description="Saved status, timestamps, and attribution fields."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <MiniField label="Status" value={statusLabel(incident.status)} />
                  <MiniField label="Severity" value={severityLabel(incident.severity)} />
                  <MiniField label="Created" value={formatDateTime(incident.createdAt)} />
                  <MiniField label="Updated" value={formatDateTime(incident.updatedAt)} />
                  <MiniField label="Resolved" value={incident.resolvedAt ? formatDateTime(incident.resolvedAt) : 'Not resolved'} />
                  <MiniField label="Created by" value={createdByName} />
                  <MiniField label="Reported by" value={reportedByName} />
                </div>
              </DetailSection>
            </div>
          </section>
    </main>
  )
}

function DetailSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/25">
          <Icon className="size-5" />
        </span>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  )
}

function DetailField({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/95 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em]">{label}</p>
      </div>
      <p className="mt-3 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

function ReadBlock({ value, emptyLabel }: { value: string; emptyLabel: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-5">
      <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
        {value || emptyLabel}
      </p>
    </div>
  )
}

function MiniField({
  label,
  value,
  monospace = false,
  multiline = false,
}: {
  label: string
  value: string
  monospace?: boolean
  multiline?: boolean
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'mt-3 text-sm text-foreground',
          multiline && 'whitespace-pre-line leading-relaxed',
          monospace && 'font-mono text-xs sm:text-sm',
        )}
      >
        {value}
      </p>
    </div>
  )
}

function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  const styles = {
    low: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/35',
    medium: 'bg-amber-500/15 text-amber-300 ring-amber-400/35',
    high: 'bg-rose-500/15 text-rose-300 ring-rose-400/35',
    critical: 'bg-rose-500/20 text-rose-200 ring-rose-300/45',
  }[severity]

  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1', styles)}>
      {severityLabel(severity)}
    </span>
  )
}

function StatusBadge({ status }: { status: IncidentStatus }) {
  const styles = {
    open: 'bg-rose-500/15 text-rose-300 ring-rose-400/35',
    reviewing: 'bg-amber-500/15 text-amber-300 ring-amber-400/35',
    resolved: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/35',
    archived: 'bg-zinc-500/15 text-zinc-300 ring-zinc-400/25',
  }[status]

  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1', styles)}>
      {statusLabel(status)}
    </span>
  )
}

function severityLabel(severity: IncidentSeverity) {
  switch (severity) {
    case 'low':
      return 'Low'
    case 'medium':
      return 'Medium'
    case 'high':
      return 'High'
    default:
      return 'Critical'
  }
}

function statusLabel(status: IncidentStatus) {
  switch (status) {
    case 'reviewing':
      return 'Reviewing'
    case 'resolved':
      return 'Resolved'
    case 'archived':
      return 'Archived'
    default:
      return 'Open'
  }
}

function formatDateTime(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}




