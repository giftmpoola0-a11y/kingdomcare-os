'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  ShieldAlert,
  Trash2,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { dashboardFont } from '@/app/lib/dashboard-font'
import type { IncidentRecord, IncidentSeverity, IncidentStatus } from '@/app/lib/supabase/incidents'
import type { ResidentListItem } from '@/app/lib/supabase/residents'
import { cn } from '@/lib/utils'
import { dispatchChromeDataRefresh } from '@/app/lib/chrome-realtime'
import { deleteIncidentAction, resolveIncidentAction } from './actions'

const FILTER_OPTIONS = ['Open', 'Resolved', 'All'] as const

type IncidentFilter = (typeof FILTER_OPTIONS)[number]

export interface IncidentsClientProps {
  initialIncidents: IncidentRecord[]
  activeResidents: ResidentListItem[]
  canManageIncidents: boolean
  loadError: string | null
}

export default function IncidentsClient({
  initialIncidents,
  activeResidents,
  canManageIncidents,
  loadError,
}: IncidentsClientProps) {
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState<IncidentFilter>('Open')
  const [actionError, setActionError] = useState('')
  const [incidents, setIncidents] = useState(initialIncidents)
  const [archiveTarget, setArchiveTarget] = useState<IncidentRecord | null>(null)
  const [syncedInitialIncidents, setSyncedInitialIncidents] = useState(initialIncidents)

  if (initialIncidents !== syncedInitialIncidents) {
    setSyncedInitialIncidents(initialIncidents)
    setIncidents(initialIncidents)
  }

  const activeIncidents = useMemo(
    () => incidents.filter((incident) => incident.deletedAt === null && incident.status !== 'archived'),
    [incidents],
  )

  const filteredIncidents = useMemo(() => {
    if (filter === 'All') return activeIncidents
    if (filter === 'Resolved') {
      return activeIncidents.filter((incident) => incident.status === 'resolved')
    }
    return activeIncidents.filter((incident) => incident.status === 'open' || incident.status === 'reviewing')
  }, [activeIncidents, filter])

  const summary = useMemo(() => {
    const openCount = activeIncidents.filter(
      (incident) => incident.status === 'open' || incident.status === 'reviewing',
    ).length
    const resolvedCount = activeIncidents.filter((incident) => incident.status === 'resolved').length
    const criticalCount = activeIncidents.filter(
      (incident) => incident.severity === 'high' || incident.severity === 'critical',
    ).length
    const followUpCount = activeIncidents.filter((incident) => incident.followUpRequired).length

    return { openCount, resolvedCount, criticalCount, followUpCount }
  }, [activeIncidents])

  function handleResolve(id: string) {
    setActionError('')
    startTransition(async () => {
      const result = await resolveIncidentAction(id)
      if (!result.success) {
        setActionError(result.error)
        return
      }
      if (result.incident) {
        setIncidents((current) => current.map((incident) => (incident.id === result.incident!.id ? result.incident! : incident)))
      }
      dispatchChromeDataRefresh({ source: 'incidents' })
    })
  }

  function handleDelete(incident: IncidentRecord) {
    setActionError('')
    setArchiveTarget(incident)
  }

  function handleConfirmArchiveIncident() {
    if (!archiveTarget) {
      return
    }

    const targetId = archiveTarget.id
    setActionError('')
    setArchiveTarget(null)

    startTransition(async () => {
      const result = await deleteIncidentAction(targetId)
      if (!result.success) {
        setActionError(result.error)
        return
      }
      if (result.incident) {
        setIncidents((current) => current.map((incident) => (incident.id === result.incident!.id ? result.incident! : incident)))
      }
      dispatchChromeDataRefresh({ source: 'incidents' })
    })
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 lg:py-8">
          <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-rose-500/12 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-rose-200 ring-1 ring-rose-400/20">
                  <span className="inline-flex size-2 rounded-full bg-rose-400" aria-hidden="true" />
                  Incidents Workspace
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  Incident Log
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Capture, review, and resolve resident incidents using real Supabase-backed records.
                </p>
              </div>

              <Link
                href="/incidents/new"
                className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                Report incident
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Open incidents" value={summary.openCount} tone="red" icon={ShieldAlert} />
              <SummaryCard label="Resolved" value={summary.resolvedCount} tone="green" icon={CheckCircle2} />
              <SummaryCard label="High severity" value={summary.criticalCount} tone="amber" icon={AlertTriangle} />
              <SummaryCard label="Follow-up" value={summary.followUpCount} tone="gray" icon={ClipboardList} />
            </div>
          </section>

          {(loadError || actionError) && (
            <p
              role="alert"
              className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200"
            >
              {loadError ?? actionError}
            </p>
          )}

          <div className="mt-6">
            <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">Incident History</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {filteredIncidents.length} incident{filteredIncidents.length !== 1 ? 's' : ''} shown
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {FILTER_OPTIONS.map((option) => {
                    const active = filter === option
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setFilter(option)}
                        className={cn(
                          'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-border bg-background/70 text-muted-foreground hover:bg-accent hover:text-foreground',
                        )}
                      >
                        {option}
                      </button>
                    )
                  })}
                </div>
              </div>

              {filteredIncidents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-background/60 p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No incidents match the current filter yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredIncidents.map((incident) => {
                    const residentName =
                      activeResidents.find((resident) => resident.id === incident.residentId)?.name ??
                      'General incident'
                    const allowResolve =
                      canManageIncidents &&
                      incident.status !== 'resolved' &&
                      incident.status !== 'archived'

                    return (
                      <article
                        key={incident.id}
                        className={cn(
                          'rounded-2xl border p-4 transition-colors',
                          incidentCardTone(incident.status, incident.severity),
                        )}
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-semibold text-foreground">{residentName}</h3>
                              <SeverityBadge severity={incident.severity} />
                              <StatusBadge status={incident.status} />
                            </div>
                            <p className="mt-1 text-xs font-semibold text-muted-foreground">
                              {incident.incidentType}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatDateTime(incident.occurredAt)}
                              {incident.location ? ` - ${incident.location}` : ''}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <MetaPill>
                                {incident.followUpRequired ? 'Follow-up required' : 'No follow-up flagged'}
                              </MetaPill>
                              {incident.resolvedAt && (
                                <MetaPill>Resolved {formatDateTime(incident.resolvedAt)}</MetaPill>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/incidents/${incident.id}`}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background/70 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
                            >
                              View details
                              <ArrowRight className="size-3.5" />
                            </Link>
                            {canManageIncidents && allowResolve && (
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleResolve(incident.id)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/35 transition-colors hover:bg-emerald-500/20 disabled:opacity-60"
                              >
                                <CheckCircle2 className="size-3.5" />
                                Resolve
                              </button>
                            )}
                            {canManageIncidents && (
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleDelete(incident)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-300 ring-1 ring-rose-400/35 transition-colors hover:bg-rose-500/20 disabled:opacity-60"
                              >
                                <Trash2 className="size-3.5" />
                                Delete
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 space-y-3 border-t border-border pt-4">
                          <IncidentField label="Description" value={incident.description} />
                          {incident.immediateAction && (
                            <IncidentField label="Immediate action" value={incident.immediateAction} />
                          )}
                          {incident.whoNotified && (
                            <IncidentField label="Who was notified" value={incident.whoNotified} />
                          )}
                          {incident.followUpNotes && (
                            <IncidentField label="Follow-up needed" value={incident.followUpNotes} />
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
      <AlertDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => {
          if (open || isPending) return
          setArchiveTarget(null)
        }}
      >
        <AlertDialogContent
          className={`${dashboardFont.variable} v0-dashboard-theme dark max-w-lg gap-0 overflow-hidden border-white/10 bg-card/95 p-0 font-sans shadow-[0_28px_90px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.05)]`}
        >
          <AlertDialogHeader className="gap-3 p-6 pb-5 sm:p-7 sm:pb-5">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-rose-500/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-200 ring-1 ring-rose-400/25">
              <Trash2 className="size-3.5" />
              Archive incident
            </div>
            <AlertDialogTitle className="text-2xl tracking-tight text-foreground">Archive incident?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <span className="block">This incident will be removed from the active incident list while keeping the record archived on the server.</span>
              <span className="block rounded-2xl border border-white/10 bg-background/55 px-4 py-3 text-base font-semibold text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                {archiveTarget ? `${activeResidents.find((resident) => resident.id === archiveTarget.residentId)?.name ?? 'General incident'} - ${archiveTarget.incidentType}` : ''}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="border-t border-white/10 bg-background/35 px-6 py-5 sm:px-7">
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={isPending}
                className="rounded-xl border border-white/10 bg-background/75 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent/80 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isPending}
                onClick={(event) => {
                  event.preventDefault()
                  handleConfirmArchiveIncident()
                }}
                className="rounded-xl border border-rose-400/30 bg-rose-500/18 px-5 py-2.5 text-sm font-semibold text-rose-100 shadow-[0_12px_28px_rgba(244,63,94,0.18)] transition-colors hover:bg-rose-500/28 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? 'Archiving...' : 'Archive incident'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => {
          if (open || isPending) return
          setArchiveTarget(null)
        }}
      >
        <AlertDialogContent
          className={`${dashboardFont.variable} v0-dashboard-theme dark max-w-lg gap-0 overflow-hidden border-white/10 bg-card/95 p-0 font-sans shadow-[0_28px_90px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.05)]`}
        >
          <AlertDialogHeader className="gap-3 p-6 pb-5 sm:p-7 sm:pb-5">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-rose-500/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-200 ring-1 ring-rose-400/25">
              <Trash2 className="size-3.5" />
              Archive incident
            </div>
            <AlertDialogTitle className="text-2xl tracking-tight text-foreground">Archive incident?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <span className="block">This incident will be removed from the active incident list while keeping the record archived on the server.</span>
              <span className="block rounded-2xl border border-white/10 bg-background/55 px-4 py-3 text-base font-semibold text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                {archiveTarget ? `${activeResidents.find((resident) => resident.id === archiveTarget.residentId)?.name ?? 'General incident'} - ${archiveTarget.incidentType}` : ''}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="border-t border-white/10 bg-background/35 px-6 py-5 sm:px-7">
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={isPending}
                className="rounded-xl border border-white/10 bg-background/75 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent/80 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isPending}
                onClick={(event) => {
                  event.preventDefault()
                  handleConfirmArchiveIncident()
                }}
                className="rounded-xl border border-rose-400/30 bg-rose-500/18 px-5 py-2.5 text-sm font-semibold text-rose-100 shadow-[0_12px_28px_rgba(244,63,94,0.18)] transition-colors hover:bg-rose-500/28 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? 'Archiving...' : 'Archive incident'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
function SummaryCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string
  value: number
  tone: 'green' | 'amber' | 'red' | 'gray'
  icon: typeof ShieldAlert
}) {
  const toneClass = {
    green: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200',
    amber: 'border-amber-400/20 bg-amber-500/10 text-amber-200',
    red: 'border-rose-400/20 bg-rose-500/10 text-rose-200',
    gray: 'border-border bg-background/60 text-foreground',
  }[tone]

  return (
    <div className={cn('rounded-2xl border p-5 shadow-sm', toneClass)}>
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-black/10 ring-1 ring-white/10">
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-80">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  )
}

function IncidentField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-foreground/85">{value}</p>
    </div>
  )
}

function MetaPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-background/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
      {children}
    </span>
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

function incidentCardTone(status: IncidentStatus, severity: IncidentSeverity) {
  if (status === 'resolved') {
    return 'border-emerald-400/20 bg-emerald-500/8'
  }
  if (status === 'archived') {
    return 'border-border bg-background/50'
  }
  if (severity === 'high' || severity === 'critical') {
    return 'border-rose-400/20 bg-card'
  }
  return 'border-border bg-background/60'
}

function formatDateTime(raw: string): string {
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}







