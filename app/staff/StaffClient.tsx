'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  ArrowRight,
  ClipboardList,
  LayoutDashboard,
  NotebookPen,
  Pill,
  ShieldAlert,
  Stethoscope,
  TriangleAlert,
  UserRound,
  Users,
} from 'lucide-react'
import { AppSidebar } from '@/components/kingdomos-v0/app-sidebar'
import { AppTopbar } from '@/components/kingdomos-v0/app-topbar'
import type { SidebarBadgeCounts } from '@/app/lib/sidebar-badge-counts'
import type { MembershipRole } from '@/app/lib/supabase/access'
import type { IncidentRecord } from '@/app/lib/supabase/incidents'
import type { MedicationAlertRecord } from '@/app/lib/supabase/medications'
import type { ResidentRecord } from '@/app/lib/supabase/residents'
import type { ShiftReportRecord } from '@/app/lib/supabase/shiftReports'
import type { TaskRecord } from '@/app/lib/supabase/tasks'
import { completeCaregiverTaskAction } from './actions'

interface StaffClientProps {
  role: MembershipRole
  userDisplayName: string
  careHomeName: string
  openTasks: TaskRecord[]
  recentIncidents: IncidentRecord[]
  medicationAlerts: MedicationAlertRecord[]
  residentNamesById: Record<string, string>
  activeResidents: ResidentRecord[]
  recentShiftReports: ShiftReportRecord[]
  sidebarBadgeCounts: SidebarBadgeCounts
  loadError: string | null
  incidentCreateHref: string | null
}

export default function StaffClient({
  role,
  userDisplayName,
  careHomeName,
  openTasks,
  recentIncidents,
  medicationAlerts,
  residentNamesById,
  activeResidents,
  recentShiftReports,
  sidebarBadgeCounts,
  loadError,
  incidentCreateHref,
}: StaffClientProps) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isTaskActionPending, startTaskActionTransition] = useTransition()
  const [taskActionError, setTaskActionError] = useState('')
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null)

  function handleMarkTaskComplete(taskId: string) {
    setTaskActionError('')
    setPendingTaskId(taskId)

    startTaskActionTransition(async () => {
      const result = await completeCaregiverTaskAction(taskId)

      if (!result.success) {
        setTaskActionError(result.error)
        setPendingTaskId(null)
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
        role={role}
        careHomeName={careHomeName}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar onMenu={() => setSidebarOpen(true)} role={role} userDisplayName={userDisplayName} />

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 lg:py-8">
          <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-sky-500/12 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-sky-200 ring-1 ring-sky-400/20">
                  <span className="inline-flex size-2 rounded-full bg-sky-400" aria-hidden="true" />
                  {careHomeName || 'Care home workspace'}
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  {getWorkspaceHeading(role)}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {getWorkspaceIntro(role)}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {(role === 'admin' || role === 'nurse') && (
                  <Link
                    href="/tasks/new"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                  >
                    <ClipboardList className="size-4" />
                    Create task
                  </Link>
                )}
                {role === 'caregiver' && (
                  <Link
                    href="/shifts/new"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                  >
                    <NotebookPen className="size-4" />
                    Create shift report
                  </Link>
                )}
                {role === 'caregiver' && incidentCreateHref ? (
                  <Link
                    href={incidentCreateHref}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/70 px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-background"
                  >
                    <TriangleAlert className="size-4" />
                    Report incident
                  </Link>
                ) : null}
              </div>
            </div>
          </section>

          {(loadError || taskActionError) && (
            <p
              role="alert"
              className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200"
            >
              {loadError ?? taskActionError}
            </p>
          )}

          {role === 'caregiver' && (
            <>
              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25">
                      <ClipboardList className="size-5" />
                    </span>
                    <div>
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground">Open care tasks</h2>
                      <p className="text-sm text-muted-foreground">
                        {openTasks.length} task{openTasks.length === 1 ? '' : 's'} need attention.
                      </p>
                    </div>
                  </div>

                  {openTasks.length === 0 ? (
                    <EmptyState message="No open care tasks found right now." />
                  ) : (
                    <div className="mt-6 space-y-4">
                      {openTasks.slice(0, 8).map((task) => {
                        const isPending = isTaskActionPending && pendingTaskId === task.id

                        return (
                          <article
                            key={task.id}
                            className="rounded-2xl border border-border bg-background/60 p-4 sm:p-5"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-lg font-semibold text-foreground">{task.title}</h3>
                                  <StatusPill tone="emerald">{formatTaskStatus(task.status)}</StatusPill>
                                </div>
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                  {task.description || 'No additional task details saved.'}
                                </p>
                              </div>

                              <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <MetaChip>
                                  Resident: {getResidentLabel(task.residentId, residentNamesById)}
                                </MetaChip>
                                <MetaChip>Priority: {capitalize(task.priority)}</MetaChip>
                                <MetaChip>Due: {formatOptionalDate(task.dueAt)}</MetaChip>
                                <button
                                  type="button"
                                  disabled={isTaskActionPending}
                                  onClick={() => handleMarkTaskComplete(task.id)}
                                  className="inline-flex items-center justify-center rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/30 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isPending ? 'Completing...' : 'Mark complete'}
                                </button>
                              </div>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  )}
                </section>

                <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/25">
                      <Users className="size-5" />
                    </span>
                    <div>
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground">Active residents</h2>
                      <p className="text-sm text-muted-foreground">
                        Quick access to current resident profiles.
                      </p>
                    </div>
                  </div>

                  {activeResidents.length === 0 ? (
                    <EmptyState message="No active residents found right now." />
                  ) : (
                    <div className="mt-6 space-y-4">
                      {activeResidents.slice(0, 8).map((resident) => (
                        <Link
                          key={resident.id}
                          href={`/residents/${resident.id}`}
                          className="block rounded-2xl border border-border bg-background/60 p-4 transition-colors hover:bg-background/80 sm:p-5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-semibold text-foreground">{resident.name}</h3>
                                <StatusPill tone="emerald">{resident.status === 'archived' ? 'Archived' : 'Active'}</StatusPill>
                              </div>
                              <p className="mt-2 text-sm text-muted-foreground">
                                {formatResidentSex(resident.sex)} - {resident.careLevel}
                              </p>
                            </div>
                            <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                          </div>

                          {resident.primarySupportNeeds.length > 0 ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {resident.primarySupportNeeds.slice(0, 3).map((need) => (
                                <MetaChip key={need}>{need}</MetaChip>
                              ))}
                              {resident.primarySupportNeeds.length > 3 ? (
                                <MetaChip>+{resident.primarySupportNeeds.length - 3} more</MetaChip>
                              ) : null}
                            </div>
                          ) : null}
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/25">
                      <NotebookPen className="size-5" />
                    </span>
                    <div>
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground">Shift reports</h2>
                      <p className="text-sm text-muted-foreground">
                        Capture handover notes or review recent reports from live care-home data.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <ActionLink
                      href="/shifts/new"
                      icon={<NotebookPen className="size-4" />}
                      title="Create shift report"
                      description="Document care observations and a handover summary for this shift."
                    />
                    <ActionLink
                      href="/shifts"
                      icon={<ClipboardList className="size-4" />}
                      title="View shift reports"
                      description="Open the saved shift report list for this care home."
                    />
                    <ActionLink
                      href="/tasks"
                      icon={<ClipboardList className="size-4" />}
                      title="View all tasks"
                      description="Open the full task workspace for your current care home."
                    />
                  </div>
                </section>

                <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/25">
                      <NotebookPen className="size-5" />
                    </span>
                    <div>
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground">Recent shift reports</h2>
                      <p className="text-sm text-muted-foreground">
                        The latest saved handover and care notes.
                      </p>
                    </div>
                  </div>

                  {recentShiftReports.length === 0 ? (
                    <EmptyState message="No shift reports found yet." />
                  ) : (
                    <div className="mt-6 space-y-4">
                      {recentShiftReports.map((report) => (
                        <Link
                          key={report.id}
                          href={`/shifts/${report.id}`}
                          className="block rounded-2xl border border-border bg-background/60 p-4 transition-colors hover:bg-background/80 sm:p-5"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-semibold text-foreground">{report.residentName}</h3>
                                <StatusPill tone="amber">{report.shiftType}</StatusPill>
                              </div>
                              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                                {report.summary}
                              </p>
                            </div>

                            <div className="flex shrink-0 flex-wrap gap-2 text-xs text-muted-foreground">
                              <MetaChip>Date: {formatShiftDate(report.shiftDate)}</MetaChip>
                              <MetaChip>Saved: {formatDateTime(report.createdAt)}</MetaChip>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </>
          )}

          {role === 'nurse' && (
            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/25">
                    <Pill className="size-5" />
                  </span>
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">Medication alerts</h2>
                    <p className="text-sm text-muted-foreground">
                      {medicationAlerts.length} alert{medicationAlerts.length === 1 ? '' : 's'} currently open or under review.
                    </p>
                  </div>
                </div>

                {medicationAlerts.length === 0 ? (
                  <EmptyState message="No medication alerts need review right now." />
                ) : (
                  <div className="mt-6 space-y-4">
                    {medicationAlerts.slice(0, 8).map((alert) => (
                      <article
                        key={alert.id}
                        className="rounded-2xl border border-border bg-background/60 p-4 sm:p-5"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-foreground">{alert.message}</h3>
                          <StatusPill tone="amber">{capitalize(alert.severity)}</StatusPill>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <MetaChip>
                            Resident: {getResidentLabel(alert.residentId, residentNamesById)}
                          </MetaChip>
                          <MetaChip>Type: {formatAlertType(alert.alertType)}</MetaChip>
                          <MetaChip>Status: {capitalize(alert.status)}</MetaChip>
                          <MetaChip>Due: {formatOptionalDate(alert.dueAt)}</MetaChip>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/25">
                    <ShieldAlert className="size-5" />
                  </span>
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">Recent incidents</h2>
                    <p className="text-sm text-muted-foreground">
                      The latest incident activity from your care home.
                    </p>
                  </div>
                </div>

                {recentIncidents.length === 0 ? (
                  <EmptyState message="No recent incidents found." />
                ) : (
                  <div className="mt-6 space-y-4">
                    {recentIncidents.map((incident) => (
                      <article
                        key={incident.id}
                        className="rounded-2xl border border-border bg-background/60 p-4 sm:p-5"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-foreground">{incident.incidentType}</h3>
                          <StatusPill tone="rose">{capitalize(incident.severity)}</StatusPill>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {incident.description}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <MetaChip>
                            Resident: {getResidentLabel(incident.residentId, residentNamesById)}
                          </MetaChip>
                          <MetaChip>Status: {capitalize(incident.status)}</MetaChip>
                          <MetaChip>Occurred: {formatDateTime(incident.occurredAt)}</MetaChip>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {role === 'admin' && (
            <section className="mt-6 rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/25">
                  <Stethoscope className="size-5" />
                </span>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">Quick links</h2>
                  <p className="text-sm text-muted-foreground">
                    Jump back to the live admin and operations areas.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <ActionLink
                  href="/"
                  icon={<LayoutDashboard className="size-4" />}
                  title="Admin Dashboard"
                  description="Return to the main operational command view."
                />
                <ActionLink
                  href="/shifts"
                  icon={<NotebookPen className="size-4" />}
                  title="Shifts"
                  description="Review shift reports and open the shift workspace."
                />
                <ActionLink
                  href="/tasks"
                  icon={<ClipboardList className="size-4" />}
                  title="Tasks"
                  description="Open the task board and current care actions."
                />
                <ActionLink
                  href="/incidents"
                  icon={<TriangleAlert className="size-4" />}
                  title="Incidents"
                  description="Review recent incident reports and follow-up work."
                />
                <ActionLink
                  href="/medications"
                  icon={<Pill className="size-4" />}
                  title="Medications"
                  description="Open medication records and current alert queues."
                />
                <ActionLink
                  href="/staff/manage"
                  icon={<UserRound className="size-4" />}
                  title="Manage Staff Access"
                  description="Open the admin staff-management screen for roles and membership changes."
                />
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-border bg-background/60 p-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

function ActionLink({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-2xl border border-border bg-background/60 p-4 transition-colors hover:bg-background/80"
    >
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {title}
          <ArrowRight className="size-4 text-muted-foreground" />
        </span>
        <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{description}</span>
      </span>
    </Link>
  )
}

function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-card/70 px-3 py-1.5">
      {children}
    </span>
  )
}

function StatusPill({
  tone,
  children,
}: {
  tone: 'emerald' | 'amber' | 'rose'
  children: React.ReactNode
}) {
  const className =
    tone === 'emerald'
      ? 'bg-emerald-500/12 text-emerald-200 ring-emerald-400/20'
      : tone === 'amber'
        ? 'bg-amber-500/12 text-amber-200 ring-amber-400/20'
        : 'bg-rose-500/12 text-rose-200 ring-rose-400/20'

  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${className}`}>
      {children}
    </span>
  )
}

function getWorkspaceHeading(role: MembershipRole) {
  if (role === 'caregiver') return 'Caregiver Workspace'
  if (role === 'nurse') return 'Nurse Workspace'
  return 'Staff Workspace'
}

function getWorkspaceIntro(role: MembershipRole) {
  if (role === 'caregiver') {
    return 'See today\'s open care tasks, jump into resident profiles, and document shift reports using live care-home data.'
  }

  if (role === 'nurse') {
    return 'Review medication alerts and recent incidents from the current care-home workspace.'
  }

  // MedTech requires a product/schema decision before implementation.
  return 'Admin access remains available here through quick links back into the main operations portal.'
}

function getResidentLabel(residentId: string | null, residentNamesById: Record<string, string>) {
  if (!residentId) {
    return 'General care home task'
  }

  return residentNamesById[residentId] ?? 'Resident record unavailable'
}

function formatResidentSex(value: ResidentRecord['sex']) {
  if (value === 'male') return 'Male'
  if (value === 'female') return 'Female'
  if (value === 'other') return 'Other'
  return 'Unknown'
}

function capitalize(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatTaskStatus(status: string) {
  return status === 'in_progress' ? 'In Progress' : capitalize(status)
}

function formatAlertType(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatOptionalDate(value: string | null) {
  if (!value) {
    return 'Not set'
  }

  return formatDateTime(value)
}

function formatShiftDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(value: string) {
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

