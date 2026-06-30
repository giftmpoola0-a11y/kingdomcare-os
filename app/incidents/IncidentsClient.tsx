'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  MapPin,
  ShieldAlert,
  Trash2,
} from 'lucide-react'
import { AppSidebar } from '@/components/kingdomos-v0/app-sidebar'
import { AppTopbar } from '@/components/kingdomos-v0/app-topbar'
import type { IncidentRecord, IncidentSeverity, IncidentStatus } from '@/app/lib/supabase/incidents'
import type { ResidentRecord } from '@/app/lib/supabase/residents'
import type { SidebarBadgeCounts } from '@/app/lib/sidebar-badge-counts'
import { cn } from '@/lib/utils'
import { createIncidentAction, deleteIncidentAction, resolveIncidentAction } from './actions'

const INCIDENT_TYPES = [
  'Fall',
  'Injury',
  'Aggression',
  'Medication refusal',
  'Meal refusal',
  'Elopement / wandering',
  'Property damage',
  'Medical concern',
  'Other',
]

const SEVERITY_OPTIONS: Array<{
  value: IncidentSeverity
  label: string
  hint: string
}> = [
  { value: 'low', label: 'Low', hint: 'Minor issue with no immediate risk.' },
  { value: 'medium', label: 'Medium', hint: 'Needs monitoring or follow-up.' },
  { value: 'high', label: 'High', hint: 'Significant risk requiring prompt action.' },
  { value: 'critical', label: 'Critical', hint: 'Immediate escalation required.' },
]

const WHO_NOTIFIED_CHIPS = [
  'Supervisor notified',
  'Nurse notified',
  'Family notified',
  'Emergency services contacted',
  'No notification required',
]

const FOLLOW_UP_CHIPS = [
  'Monitor resident',
  'Complete formal incident report',
  'Follow up with nurse',
  'Follow up with supervisor',
  'Update care plan',
  'No follow-up needed',
]

const FILTER_OPTIONS = ['Open', 'Resolved', 'All'] as const

type IncidentFilter = (typeof FILTER_OPTIONS)[number]

const INPUT_CLASS =
  'w-full rounded-xl border border-border bg-background/70 px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-rose-400/50 focus:outline-none focus:ring-2 focus:ring-rose-400/15'

const TEXTAREA_CLASS =
  'w-full rounded-xl border border-border bg-background/70 px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-rose-400/50 focus:outline-none focus:ring-2 focus:ring-rose-400/15 resize-none'

export interface IncidentsClientProps {
  initialIncidents: IncidentRecord[]
  activeResidents: ResidentRecord[]
  canManageIncidents: boolean
  loadError: string | null
  sidebarBadgeCounts: SidebarBadgeCounts
}

export default function IncidentsClient({
  initialIncidents,
  activeResidents,
  canManageIncidents,
  loadError,
  sidebarBadgeCounts,
}: IncidentsClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [filter, setFilter] = useState<IncidentFilter>('Open')
  const [actionError, setActionError] = useState('')
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({
    residentId: '',
    incidentType: '',
    severity: 'medium' as IncidentSeverity,
    occurredAt: '',
    location: '',
    description: '',
    immediateAction: '',
    whoNotified: '',
    followUpNotes: '',
  })

  const activeIncidents = useMemo(
    () => initialIncidents.filter((incident) => incident.deletedAt === null && incident.status !== 'archived'),
    [initialIncidents],
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

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (formError) setFormError('')
  }

  function handleAppend(field: 'whoNotified' | 'followUpNotes', chip: string) {
    setForm((prev) => {
      const existing = prev[field].trim()
      return {
        ...prev,
        [field]: existing ? `${existing}\n${chip}` : chip,
      }
    })
  }

  function resetForm() {
    setForm({
      residentId: '',
      incidentType: '',
      severity: 'medium',
      occurredAt: '',
      location: '',
      description: '',
      immediateAction: '',
      whoNotified: '',
      followUpNotes: '',
    })
    setFormError('')
  }

  function handleSubmit() {
    if (!form.residentId) {
      setFormError('Resident is required.')
      return
    }
    if (!form.incidentType.trim()) {
      setFormError('Incident type is required.')
      return
    }
    if (!form.occurredAt) {
      setFormError('Date and time is required.')
      return
    }
    if (!form.description.trim()) {
      setFormError('Description is required.')
      return
    }
    if (!activeResidents.some((resident) => resident.id === form.residentId)) {
      setFormError('Resident selection is invalid.')
      return
    }

    const occurredAt = new Date(form.occurredAt).toISOString()
    setActionError('')

    startTransition(async () => {
      const result = await createIncidentAction({
        residentId: form.residentId,
        incidentType: form.incidentType.trim(),
        severity: form.severity,
        occurredAt,
        location: form.location.trim(),
        description: form.description.trim(),
        immediateAction: form.immediateAction.trim(),
        whoNotified: form.whoNotified.trim(),
        followUpNotes: form.followUpNotes.trim(),
      })

      if (!result.success) {
        setActionError(result.error)
        return
      }

      resetForm()
      router.refresh()
    })
  }

  function handleResolve(id: string) {
    setActionError('')
    startTransition(async () => {
      const result = await resolveIncidentAction(id)
      if (!result.success) {
        setActionError(result.error)
        return
      }
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    if (!window.confirm('Delete this incident record?')) return

    setActionError('')
    startTransition(async () => {
      const result = await deleteIncidentAction(id)
      if (!result.success) {
        setActionError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        badgeCounts={sidebarBadgeCounts}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar onMenu={() => setSidebarOpen(true)} />

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
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Open incidents" value={summary.openCount} tone="red" icon={ShieldAlert} />
              <SummaryCard label="Resolved" value={summary.resolvedCount} tone="green" icon={CheckCircle2} />
              <SummaryCard label="High severity" value={summary.criticalCount} tone="amber" icon={AlertTriangle} />
              <SummaryCard label="Follow-up" value={summary.followUpCount} tone="gray" icon={ClipboardList} />
            </div>
          </section>

          {(loadError || actionError || formError) && (
            <p
              role="alert"
              className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200"
            >
              {loadError ?? actionError ?? formError}
            </p>
          )}

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
            <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/25">
                  <ShieldAlert className="size-5" />
                </span>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">Log Incident</h2>
                  <p className="text-sm text-muted-foreground">
                    Record a new incident for the current care home.
                  </p>
                </div>
              </div>

              {activeResidents.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-border bg-background/60 p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Add a resident before logging an incident.
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor="incidentResident" className="block text-sm font-semibold text-foreground">
                        Resident
                      </label>
                      <select
                        id="incidentResident"
                        value={form.residentId}
                        onChange={(e) => handleChange('residentId', e.target.value)}
                        className={INPUT_CLASS}
                      >
                        <option value="">Select resident...</option>
                        {activeResidents.map((resident) => (
                          <option key={resident.id} value={resident.id}>
                            {resident.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="incidentType" className="block text-sm font-semibold text-foreground">
                        Incident type
                      </label>
                      <select
                        id="incidentType"
                        value={form.incidentType}
                        onChange={(e) => handleChange('incidentType', e.target.value)}
                        className={INPUT_CLASS}
                      >
                        <option value="">Select type...</option>
                        {INCIDENT_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">Severity</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {SEVERITY_OPTIONS.map((severity) => {
                        const selected = form.severity === severity.value
                        return (
                          <button
                            key={severity.value}
                            type="button"
                            onClick={() => handleChange('severity', severity.value)}
                            className={cn(
                              'rounded-2xl border p-4 text-left transition-colors',
                              selected
                                ? severityButtonSelected(severity.value)
                                : 'border-border bg-background/60 text-foreground hover:bg-accent/40',
                            )}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-semibold">{severity.label}</span>
                              <span className={cn('size-2.5 rounded-full', severityDot(severity.value))} />
                            </div>
                            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{severity.hint}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor="incidentOccurredAt" className="block text-sm font-semibold text-foreground">
                        Date and time
                      </label>
                      <input
                        id="incidentOccurredAt"
                        type="datetime-local"
                        value={form.occurredAt}
                        onChange={(e) => handleChange('occurredAt', e.target.value)}
                        className={INPUT_CLASS}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="incidentLocation" className="block text-sm font-semibold text-foreground">
                        Location
                      </label>
                      <div className="relative">
                        <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          id="incidentLocation"
                          type="text"
                          value={form.location}
                          onChange={(e) => handleChange('location', e.target.value)}
                          className="w-full rounded-xl border border-border bg-background/70 py-3.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-rose-400/50 focus:outline-none focus:ring-2 focus:ring-rose-400/15"
                          placeholder="e.g. Dining room"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="incidentDescription" className="block text-sm font-semibold text-foreground">
                      Description
                    </label>
                    <textarea
                      id="incidentDescription"
                      rows={4}
                      value={form.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      className={TEXTAREA_CLASS}
                      placeholder="Describe what happened..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="incidentImmediateAction" className="block text-sm font-semibold text-foreground">
                      Immediate action taken
                    </label>
                    <textarea
                      id="incidentImmediateAction"
                      rows={3}
                      value={form.immediateAction}
                      onChange={(e) => handleChange('immediateAction', e.target.value)}
                      className={TEXTAREA_CLASS}
                      placeholder="What was done immediately..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="incidentWhoNotified" className="block text-sm font-semibold text-foreground">
                      Who was notified
                    </label>
                    <textarea
                      id="incidentWhoNotified"
                      rows={2}
                      value={form.whoNotified}
                      onChange={(e) => handleChange('whoNotified', e.target.value)}
                      className={TEXTAREA_CLASS}
                    />
                    <ChipRow
                      chips={WHO_NOTIFIED_CHIPS}
                      onSelect={(chip) => handleAppend('whoNotified', chip)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="incidentFollowUp" className="block text-sm font-semibold text-foreground">
                      Follow-up needed
                    </label>
                    <textarea
                      id="incidentFollowUp"
                      rows={2}
                      value={form.followUpNotes}
                      onChange={(e) => handleChange('followUpNotes', e.target.value)}
                      className={TEXTAREA_CLASS}
                    />
                    <ChipRow
                      chips={FOLLOW_UP_CHIPS}
                      onSelect={(chip) => handleAppend('followUpNotes', chip)}
                    />
                  </div>

                  <div className="border-t border-border pt-4">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={handleSubmit}
                      className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Save Incident
                    </button>
                  </div>
                </div>
              )}
            </section>

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
                      'Resident'
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
                          </div>

                          {canManageIncidents && (
                            <div className="flex flex-wrap gap-2">
                              {allowResolve && (
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
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleDelete(incident.id)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-300 ring-1 ring-rose-400/35 transition-colors hover:bg-rose-500/20 disabled:opacity-60"
                              >
                                <Trash2 className="size-3.5" />
                                Delete
                              </button>
                            </div>
                          )}
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
        </main>
      </div>
    </div>
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

function ChipRow({
  chips,
  onSelect,
}: {
  chips: string[]
  onSelect: (chip: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {chips.map((chip) => (
        <button
          key={chip}
          type="button"
          onClick={() => onSelect(chip)}
          className="rounded-full border border-border bg-background/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {chip}
        </button>
      ))}
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

function severityDot(severity: IncidentSeverity) {
  return {
    low: 'bg-emerald-400',
    medium: 'bg-amber-400',
    high: 'bg-rose-400',
    critical: 'bg-rose-300',
  }[severity]
}

function severityButtonSelected(severity: IncidentSeverity) {
  return {
    low: 'border-emerald-400/35 bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-400/25',
    medium: 'border-amber-400/35 bg-amber-500/10 text-amber-200 ring-1 ring-amber-400/25',
    high: 'border-rose-400/35 bg-rose-500/10 text-rose-200 ring-1 ring-rose-400/25',
    critical: 'border-rose-300/45 bg-rose-500/15 text-rose-100 ring-1 ring-rose-300/30',
  }[severity]
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
