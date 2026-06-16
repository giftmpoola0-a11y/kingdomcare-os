'use client'

import Link from 'next/link'
import { use, useEffect, useState } from 'react'
import PageShell from '@/app/components/ui/PageShell'
import PageHeader from '@/app/components/ui/PageHeader'
import SectionCard from '@/app/components/ui/SectionCard'
import EmptyState from '@/app/components/ui/EmptyState'
import StatusBadge from '@/app/components/ui/StatusBadge'
import ReportCard from '@/app/components/ReportCard'
import { loadIncidents } from '@/app/lib/incidents'
import type { SavedIncident } from '@/app/lib/incidentTypes'
import { loadMedications } from '@/app/lib/medications'
import type { SavedMedicationEntry } from '@/app/lib/medicationTypes'
import { loadReports } from '@/app/lib/reports'
import { getResidentById } from '@/app/lib/residents'
import type { DemoResident, SavedReport } from '@/app/lib/reportTypes'
import { loadTasks } from '@/app/lib/tasks'
import type { SavedTask } from '@/app/lib/taskTypes'

const MEDICATION_STATUS_CLASSES: Record<string, string> = {
  Pending: 'bg-slate-100 text-slate-600',
  Given: 'bg-green-100 text-green-700',
  Refused: 'bg-orange-100 text-orange-700',
  Missed: 'bg-red-100 text-red-700',
  'Reminder provided': 'bg-blue-100 text-blue-700',
  'Held by nurse instruction': 'bg-purple-100 text-purple-700',
  'Nurse notified': 'bg-yellow-100 text-yellow-800',
}

const SEVERITY_CLASSES: Record<string, string> = {
  Low: 'bg-green-100 text-green-700',
  Moderate: 'bg-yellow-100 text-yellow-700',
  High: 'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700',
}

export default function ResidentDetailPage({
  params,
}: {
  params: Promise<{ residentId: string }>
}) {
  const { residentId } = use(params)
  const [resident, setResident] = useState<DemoResident | null | undefined>(undefined)
  const [reports, setReports] = useState<SavedReport[]>([])
  const [incidents, setIncidents] = useState<SavedIncident[]>([])
  const [medications, setMedications] = useState<SavedMedicationEntry[]>([])
  const [tasks, setTasks] = useState<SavedTask[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const matchedResident = getResidentById(residentId) ?? null
    setResident(matchedResident)

    if (!matchedResident) {
      setReports([])
      setIncidents([])
      setMedications([])
      setTasks([])
      return
    }

    const residentReports = loadReports().filter(
      (report) => report.residentName === matchedResident.name
    )
    const residentIncidents = loadIncidents().filter(
      (incident) =>
        incident.residentId === matchedResident.id || incident.residentName === matchedResident.name
    )
    const residentMedications = loadMedications().filter(
      (entry) =>
        entry.residentId === matchedResident.id || entry.residentName === matchedResident.name
    )
    const residentTasks = loadTasks().filter((task) => task.residentId === matchedResident.id)
    setReports(residentReports)
    setIncidents(residentIncidents)
    setMedications(residentMedications)
    setTasks(residentTasks)
  }, [residentId])

  if (resident === undefined) return null

  if (resident === null) {
    return (
      <PageShell>
        <PageHeader title="Resident Not Found" maxWidth="max-w-5xl" />
        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <EmptyState
            message="The resident profile you requested is not available."
            linkHref="/residents"
            linkLabel="Back to Residents"
          />
        </main>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Residents"
        title={resident.name}
        subtitle={`Age ${resident.age} · ${resident.careLevel}`}
        maxWidth="max-w-5xl"
        action={resident.status !== 'archived' ? (
          <Link
            href={`/shifts/new?residentId=${resident.id}`}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 active:bg-blue-800"
          >
            Start Shift →
          </Link>
        ) : undefined}
      />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        {/* Profile card */}
        <SectionCard className="p-6">
          <div className="space-y-4">
            {resident.status === 'archived' && (
              <div>
                <StatusBadge label="Archived" colorClass="bg-amber-100 text-amber-800" />
              </div>
            )}

            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Support Needs
              </p>
              <div className="flex flex-wrap gap-1.5">
                {resident.primarySupportNeeds.map((need) => (
                  <span
                    key={need}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] text-slate-600"
                  >
                    {need}
                  </span>
                ))}
              </div>
            </div>

            {resident.notes && (
              <div className="border-t border-slate-100 pt-4">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Notes
                </p>
                <p className="text-sm leading-relaxed text-slate-600">{resident.notes}</p>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Resident tasks */}
        <section className="space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Resident Tasks
          </h2>

          {tasks.length === 0 ? (
            <EmptyState
              message="No tasks saved for this resident yet."
              linkHref="/tasks"
              linkLabel="Add a task"
            />
          ) : (
            tasks.map((task) => (
              <SectionCard key={task.id} as="article" className="p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{task.title}</p>
                      <StatusBadge
                        label={task.priority}
                        colorClass={TASK_PRIORITY_CLASSES[task.priority]}
                      />
                      <StatusBadge
                        label={task.completed ? 'Completed' : 'Pending'}
                        colorClass={
                          task.completed
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }
                      />
                    </div>
                    <p className="mt-1.5 text-xs font-medium text-slate-500">{task.category}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatTaskSchedule(task.dueDate, task.dueTime)}
                    </p>
                  </div>
                </div>

                {task.description && (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <DetailField label="Description" value={task.description} />
                  </div>
                )}
              </SectionCard>
            ))
          )}
        </section>

        {/* Report history */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Report History
            </h2>
            <Link
              href="/residents"
              className="text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700"
            >
              ← All Residents
            </Link>
          </div>

          {reports.length === 0 ? (
            <EmptyState
              message="No reports saved for this resident yet."
              linkHref="/shifts/new"
              linkLabel="Document a shift"
            />
          ) : (
            reports.map((report) => {
              const isExpanded = expandedId === report.id
              return (
                <ReportCard
                  key={report.id}
                  report={report}
                  isExpanded={isExpanded}
                  showDetailedNotes={isExpanded}
                  onToggleDetails={() => setExpandedId(isExpanded ? null : report.id)}
                />
              )
            })
          )}
        </section>

        {/* Incident history */}
        <section className="space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Incident History
          </h2>

          {incidents.length === 0 ? (
            <EmptyState
              message="No incidents saved for this resident yet."
              linkHref="/incidents"
              linkLabel="Log an incident"
            />
          ) : (
            incidents.map((incident) => (
              <SectionCard key={incident.id} as="article" className="p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{incident.incidentType}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <StatusBadge
                        label={incident.severity}
                        colorClass={SEVERITY_CLASSES[incident.severity]}
                      />
                      <span className="text-xs text-slate-400">
                        {formatDateTime(incident.dateTime)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <DetailField label="Description" value={incident.description} />
                  <DetailField label="Action Taken" value={incident.actionTaken} />
                  <DetailField label="Who Was Notified" value={incident.whoNotified} />
                  <DetailField label="Follow-up Needed" value={incident.followUp} />
                </div>
              </SectionCard>
            ))
          )}
        </section>

        {/* Medication history */}
        <section className="space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Medication History
          </h2>

          {medications.length === 0 ? (
            <EmptyState
              message="No medication entries saved for this resident yet."
              linkHref="/medications"
              linkLabel="Log a medication entry"
            />
          ) : (
            medications.map((entry) => (
              <SectionCard key={entry.id} as="article" className="p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{entry.medicationLabel}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <StatusBadge
                        label={entry.status}
                        colorClass={MEDICATION_STATUS_CLASSES[entry.status] ?? 'bg-slate-100 text-slate-600'}
                      />
                      <span className="text-xs text-slate-400">
                        {formatMedicationSchedule(entry.scheduledDate, entry.scheduledTime)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <DetailField label="Notes" value={entry.notes} />
                  <DetailField label="Who Was Notified" value={entry.whoNotified} />
                </div>
              </SectionCard>
            ))
          )}
        </section>
      </main>
    </PageShell>
  )
}

const TASK_PRIORITY_CLASSES: Record<SavedTask['priority'], string> = {
  Low: 'bg-slate-100 text-slate-700',
  Normal: 'bg-blue-100 text-blue-700',
  High: 'bg-amber-100 text-amber-800',
  Urgent: 'bg-red-100 text-red-700',
}

function DetailField({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm leading-relaxed text-slate-700">{value}</p>
    </div>
  )
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatMedicationSchedule(date: string, time: string) {
  const combined = new Date(`${date}T${time}`)
  if (Number.isNaN(combined.getTime())) return `${date} ${time}`.trim()
  return combined.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatTaskSchedule(date: string, time: string) {
  if (!time) {
    const parsed = new Date(date)
    if (Number.isNaN(parsed.getTime())) return date
    return parsed.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return formatMedicationSchedule(date, time)
}
