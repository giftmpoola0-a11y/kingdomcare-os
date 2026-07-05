'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, ListChecks, Pill, ShieldAlert, Users, Users2 } from 'lucide-react'
import { AppSidebar } from '@/components/kingdomos-v0/app-sidebar'
import { AppTopbar } from '@/components/kingdomos-v0/app-topbar'
import type { AppChromeProps } from '@/app/lib/app-chrome'
import type { IncidentRecord, IncidentSeverity, IncidentStatus } from '@/app/lib/supabase/incidents'
import type {
  MedicationAlertRecord,
  MedicationAlertSeverity,
  MedicationAlertType,
} from '@/app/lib/supabase/medications'
import type { ResidentRecord } from '@/app/lib/supabase/residents'
import type { SidebarBadgeCounts } from '@/app/lib/sidebar-badge-counts'
import type { TaskRecord } from '@/app/lib/supabase/tasks'
import { cn } from '@/lib/utils'

type DateRangeValue = 'all' | 'last7' | 'last30'

const DATE_RANGES: { value: DateRangeValue; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
]

const INCIDENT_LIST_LIMIT = 10

export interface ReportsClientProps extends AppChromeProps {
  residents: ResidentRecord[]
  activeResidentsCount: number
  tasks: TaskRecord[]
  incidents: IncidentRecord[]
  medicationAlerts: MedicationAlertRecord[]
  careTeamMembersCount: number
  sidebarBadgeCounts: SidebarBadgeCounts
  loadError: string | null
}

export default function ReportsClient({
  role,
  userDisplayName,
  careHomeName,
  residents,
  activeResidentsCount,
  tasks,
  incidents,
  medicationAlerts,
  careTeamMembersCount,
  sidebarBadgeCounts,
  loadError,
}: ReportsClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dateRange, setDateRange] = useState<DateRangeValue>('all')

  const nowMs = new Date().getTime()

  const residentNameById = useMemo(
    () => new Map(residents.map((resident) => [resident.id, resident.name])),
    [residents],
  )

  const openTasks = useMemo(
    () => tasks.filter((task) => task.status === 'open' || task.status === 'in_progress'),
    [tasks],
  )

  const completedTasksInRange = useMemo(
    () => tasks.filter((task) => task.status === 'completed' && isWithinDateRange(task.completedAt, dateRange, nowMs)),
    [tasks, dateRange, nowMs],
  )

  const hasDueDateData = useMemo(() => tasks.some((task) => Boolean(task.dueAt)), [tasks])

  const overdueTasks = useMemo(
    () =>
      openTasks.filter((task) => task.dueAt && Date.parse(task.dueAt) < nowMs),
    [openTasks, nowMs],
  )

  const openMedicationAlerts = useMemo(
    () => medicationAlerts.filter((alert) => alert.status === 'open' || alert.status === 'reviewing'),
    [medicationAlerts],
  )

  const incidentsInRange = useMemo(
    () =>
      incidents
        .filter((incident) => isWithinDateRange(incident.occurredAt, dateRange, nowMs))
        .sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt)),
    [incidents, dateRange, nowMs],
  )

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        badgeCounts={sidebarBadgeCounts}
        role={role}
        careHomeName={careHomeName}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar onMenu={() => setSidebarOpen(true)} role={role} userDisplayName={userDisplayName} />

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 lg:py-8">
          <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-500/12 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-blue-200 ring-1 ring-blue-400/20">
                <span className="inline-flex size-2 rounded-full bg-blue-400" aria-hidden="true" />
                Reports Workspace
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                Operational Reports
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                A real-time operational summary built from residents, tasks, incidents, and medication
                alerts in Supabase.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              <SummaryCard label="Active Residents" value={activeResidentsCount} tone="green" icon={Users} />
              <SummaryCard label="Open Tasks" value={openTasks.length} tone="amber" icon={ListChecks} />
              <SummaryCard
                label="Completed Tasks"
                value={completedTasksInRange.length}
                tone="green"
                icon={CheckCircle2}
                scoped
              />
              <SummaryCard
                label="Medication Alerts"
                value={openMedicationAlerts.length}
                tone="amber"
                icon={Pill}
              />
              <SummaryCard
                label="Recent Incidents"
                value={incidentsInRange.length}
                tone="red"
                icon={ShieldAlert}
                scoped
              />
              <SummaryCard
                label="Care Team Members"
                value={careTeamMembersCount}
                tone="gray"
                icon={Users2}
              />
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

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <p className="mr-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Date range
            </p>
            {DATE_RANGES.map((range) => {
              const active = dateRange === range.value
              return (
                <button
                  key={range.value}
                  type="button"
                  onClick={() => setDateRange(range.value)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-background/70 text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  {range.label}
                </button>
              )
            })}
          </div>

          {/* Task summary */}
          <section className="mt-6 rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/25">
                <ListChecks className="size-5" />
              </span>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Task Summary</h2>
                <p className="text-sm text-muted-foreground">
                  Open and overdue counts reflect current state; completed tasks reflect the selected date range.
                </p>
              </div>
            </div>

            <div className={cn('mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2', hasDueDateData && 'lg:grid-cols-3')}>
              <StatTile label="Open tasks" value={openTasks.length} tone="amber" />
              <StatTile label="Completed tasks" value={completedTasksInRange.length} tone="green" scoped />
              {hasDueDateData && <StatTile label="Overdue tasks" value={overdueTasks.length} tone="red" />}
            </div>
          </section>

          {/* Incident summary */}
          <section className="mt-6 rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/25">
                <ShieldAlert className="size-5" />
              </span>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Incident Summary</h2>
                <p className="text-sm text-muted-foreground">
                  {incidentsInRange.length} incident{incidentsInRange.length !== 1 ? 's' : ''} in the selected range.
                </p>
              </div>
            </div>

            {incidentsInRange.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-border bg-background/60 p-8 text-center">
                <p className="text-sm text-muted-foreground">No incidents recorded in this range.</p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {incidentsInRange.slice(0, INCIDENT_LIST_LIMIT).map((incident) => (
                  <article key={incident.id} className="rounded-2xl border border-border bg-background/60 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        {incident.residentId ? residentNameById.get(incident.residentId) ?? 'Resident' : 'Resident'}
                      </h3>
                      <IncidentSeverityBadge severity={incident.severity} />
                      <IncidentStatusBadge status={incident.status} />
                    </div>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">{incident.incidentType}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(incident.occurredAt)}
                      {incident.location ? ` - ${incident.location}` : ''}
                    </p>
                  </article>
                ))}
                {incidentsInRange.length > INCIDENT_LIST_LIMIT && (
                  <p className="pt-1 text-center text-xs text-muted-foreground">
                    Showing {INCIDENT_LIST_LIMIT} of {incidentsInRange.length} incidents.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Medication summary */}
          <section className="mt-6 rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/25">
                <Pill className="size-5" />
              </span>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Medication Summary</h2>
                <p className="text-sm text-muted-foreground">
                  {openMedicationAlerts.length} active alert{openMedicationAlerts.length !== 1 ? 's' : ''} needing attention.
                </p>
              </div>
            </div>

            {openMedicationAlerts.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-border bg-background/60 p-8 text-center">
                <p className="text-sm text-muted-foreground">No active medication alerts.</p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {openMedicationAlerts.map((alert) => (
                  <article key={alert.id} className="rounded-2xl border border-border bg-background/60 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <AlertTypeBadge type={alert.alertType} />
                      <AlertSeverityBadge severity={alert.severity} />
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-foreground">{alert.message}</p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                      {alert.residentId && residentNameById.get(alert.residentId) && (
                        <p className="text-xs text-muted-foreground">
                          Resident: {residentNameById.get(alert.residentId)}
                        </p>
                      )}
                      {alert.dueAt && (
                        <p className="text-xs text-muted-foreground">Due: {formatDateTime(alert.dueAt)}</p>
                      )}
                    </div>
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

function isWithinDateRange(value: string | null, range: DateRangeValue, nowMs: number) {
  if (range === 'all') return true
  if (!value) return false

  const time = Date.parse(value)
  if (Number.isNaN(time)) return false

  const days = range === 'last7' ? 7 : 30
  const rangeStart = nowMs - days * 24 * 60 * 60 * 1000
  return time >= rangeStart
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

function SummaryCard({
  label,
  value,
  tone,
  icon: Icon,
  scoped = false,
}: {
  label: string
  value: number
  tone: 'green' | 'amber' | 'red' | 'gray'
  icon: typeof ShieldAlert
  scoped?: boolean
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
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide opacity-60">
            {scoped ? 'Selected range' : 'Current'}
          </p>
        </div>
      </div>
    </div>
  )
}

function StatTile({
  label,
  value,
  tone,
  scoped = false,
}: {
  label: string
  value: number
  tone: 'green' | 'amber' | 'red'
  scoped?: boolean
}) {
  const toneClass = {
    green: 'border-emerald-400/20 bg-emerald-500/8 text-emerald-200',
    amber: 'border-amber-400/20 bg-amber-500/8 text-amber-200',
    red: 'border-rose-400/20 bg-rose-500/8 text-rose-200',
  }[tone]

  return (
    <div className={cn('rounded-2xl border p-5', toneClass)}>
      <p className="text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide opacity-60">
        {scoped ? 'Selected range' : 'Current'}
      </p>
    </div>
  )
}

function IncidentSeverityBadge({ severity }: { severity: IncidentSeverity }) {
  const styles: Record<IncidentSeverity, string> = {
    low: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/35',
    medium: 'bg-amber-500/15 text-amber-300 ring-amber-400/35',
    high: 'bg-rose-500/15 text-rose-300 ring-rose-400/35',
    critical: 'bg-rose-500/20 text-rose-200 ring-rose-300/45',
  }
  const labels: Record<IncidentSeverity, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
  }

  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1', styles[severity])}>
      {labels[severity]}
    </span>
  )
}

function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  const styles: Record<IncidentStatus, string> = {
    open: 'bg-rose-500/15 text-rose-300 ring-rose-400/35',
    reviewing: 'bg-amber-500/15 text-amber-300 ring-amber-400/35',
    resolved: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/35',
    archived: 'bg-zinc-500/15 text-zinc-300 ring-zinc-400/25',
  }
  const labels: Record<IncidentStatus, string> = {
    open: 'Open',
    reviewing: 'Reviewing',
    resolved: 'Resolved',
    archived: 'Archived',
  }

  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1', styles[status])}>
      {labels[status]}
    </span>
  )
}

function AlertTypeBadge({ type }: { type: MedicationAlertType }) {
  const labels: Record<MedicationAlertType, string> = {
    missed_dose: 'Missed Dose',
    refill_needed: 'Refill Needed',
    review_required: 'Review Required',
    allergy_warning: 'Allergy Warning',
    interaction_warning: 'Interaction Warning',
    other: 'Other',
  }
  const isWarning = type === 'allergy_warning' || type === 'interaction_warning'

  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
        isWarning
          ? 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/35'
          : 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/35',
      )}
    >
      {labels[type]}
    </span>
  )
}

function AlertSeverityBadge({ severity }: { severity: MedicationAlertSeverity }) {
  const map: Record<MedicationAlertSeverity, string> = {
    low: 'bg-zinc-500/15 text-zinc-300 ring-1 ring-zinc-400/25',
    medium: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/35',
    high: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/35',
    critical: 'bg-rose-500/20 text-rose-200 ring-1 ring-rose-400/50',
  }

  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize', map[severity])}>
      {severity}
    </span>
  )
}
