'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PageShell from '@/app/components/ui/PageShell'
import { getSupabaseBrowserClient } from '@/app/lib/supabase/client'
import { getMyMembership } from '@/app/lib/supabase/careHomes'
import AnimatedNumber from '@/app/components/AnimatedNumber'
import { loadIncidents } from '@/app/lib/incidents'
import type { SavedIncident } from '@/app/lib/incidentTypes'
import { loadMedications } from '@/app/lib/medications'
import type { SavedMedicationEntry } from '@/app/lib/medicationTypes'
import { loadReports } from '@/app/lib/reports'
import type { SavedReport } from '@/app/lib/reportTypes'
import { loadTasks } from '@/app/lib/tasks'
import type { SavedTask } from '@/app/lib/taskTypes'

/* ── Inline icons (20×20, used in task cards) ─────────────────── */

function IcShift() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="2" width="14" height="16" rx="2"/>
      <path d="M7 2h6"/>
      <path d="M10 8v5M7.5 10.5h5"/>
    </svg>
  )
}

function IcIncident() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 2L1.5 17.5h17L10 2z"/>
      <path d="M10 8v5M10 15v1"/>
    </svg>
  )
}

function IcMedication() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="7.5" width="16" height="5" rx="2.5"/>
      <line x1="10" y1="7.5" x2="10" y2="12.5"/>
    </svg>
  )
}

function IcResidents() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10" cy="6" r="3.5"/>
      <path d="M3 19c0-3.866 3.134-7 7-7s7 3.134 7 7"/>
    </svg>
  )
}

function IcReports() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="2" width="14" height="16" rx="2"/>
      <path d="M7 7h6M7 10h6M7 13h4"/>
    </svg>
  )
}

function IcTasks() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 5h2l1.2 1.4L9 3.8"/>
      <path d="M10.5 5H16.5"/>
      <path d="M3.5 10h2l1.2 1.4L9 8.8"/>
      <path d="M10.5 10H16.5"/>
      <path d="M3.5 15h2l1.2 1.4L9 13.8"/>
      <path d="M10.5 15H16.5"/>
    </svg>
  )
}

/* ── Task card data ──────────────────────────────────────────── */

const TASK_CARDS = [
  {
    href: '/shifts/new',
    title: 'Start Shift Report',
    desc: 'Document care provided during a shift',
    icon: <IcShift />,
    iconBg: 'bg-blue-100 text-blue-700',
    delay: '',
  },
  {
    href: '/incidents',
    title: 'Log Incident',
    desc: 'Record a care incident with severity',
    icon: <IcIncident />,
    iconBg: 'bg-rose-100 text-rose-700',
    delay: 'anim-delay-50',
  },
  {
    href: '/medications',
    title: 'Medication Reminder',
    desc: 'Log a medication administration status',
    icon: <IcMedication />,
    iconBg: 'bg-violet-100 text-violet-700',
    delay: 'anim-delay-100',
  },
  {
    href: '/residents',
    title: 'Manage Residents',
    desc: 'View and edit resident profiles',
    icon: <IcResidents />,
    iconBg: 'bg-emerald-100 text-emerald-700',
    delay: 'anim-delay-150',
  },
  {
    href: '/reports',
    title: 'View Reports',
    desc: 'Browse and print saved shift reports',
    icon: <IcReports />,
    iconBg: 'bg-sky-100 text-sky-700',
    delay: 'anim-delay-200',
  },
  {
    href: '/tasks',
    title: 'Daily Tasks',
    desc: 'Track duties, activities, and follow-ups',
    icon: <IcTasks />,
    iconBg: 'bg-amber-100 text-amber-700',
    delay: 'anim-delay-250',
  },
]

/* ── Page component ──────────────────────────────────────────── */

export default function DashboardPage() {
  const router = useRouter()
  const [reports, setReports] = useState<SavedReport[]>([])
  const [incidents, setIncidents] = useState<SavedIncident[]>([])
  const [medications, setMedications] = useState<SavedMedicationEntry[]>([])
  const [tasks, setTasks] = useState<SavedTask[]>([])

  useEffect(() => {
    setReports(loadReports())
    setIncidents(loadIncidents())
    setMedications(loadMedications())
    setTasks(loadTasks())
  }, [])

  // If a signed-in user has no care home membership, redirect to onboarding.
  // Errors are swallowed so a missing Supabase config never breaks the dashboard.
  useEffect(() => {
    let active = true

    async function checkMembership() {
      try {
        const supabase = getSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!active || !user) return

        const membership = await getMyMembership(supabase)
        if (active && membership === null) {
          router.replace('/onboarding')
        }
      } catch {
        // Supabase not configured or offline — stay on dashboard
      }
    }

    checkMembership()
    return () => { active = false }
  }, [router])

  const latestReport    = reports[0]    ?? null
  const latestIncident  = incidents[0]  ?? null
  const latestMedication = medications[0] ?? null
  const nextTaskDue = tasks.find((task) => !task.completed) ?? null

  const reportsToday      = reports.filter((r) => isToday(r.createdAt)).length
  const incidentsToday    = incidents.filter((i) => isToday(i.createdAt)).length
  const medicationsToday  = medications.filter((m) => isToday(m.createdAt)).length
  const pendingMedications = medications.filter((m) => m.status === 'Pending').length
  const missedOrRefused   = medications.filter(
    (m) => m.status === 'Missed' || m.status === 'Refused'
  ).length
  const taskDateKey = todayKey()
  const tasksToday = tasks.filter((task) => task.dueDate === taskDateKey).length
  const pendingTasks = tasks.filter((task) => !task.completed).length
  const urgentPending = tasks.filter((task) => !task.completed && task.priority === 'Urgent').length

  const todayStr = formatDashboardDate(new Date())

  return (
    <PageShell>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-slate-200/60 bg-white">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute right-0 top-0 h-72 w-80 -translate-y-1/3 translate-x-1/4 rounded-full bg-blue-400/6 blur-3xl" />
          <div className="absolute left-0 bottom-0 h-32 w-56 rounded-full bg-sky-300/5 blur-2xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="anim-fade-up">
              <div className="mb-3 flex items-center gap-2">
                <span className="block h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" aria-hidden="true" />
                <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-slate-400">
                  Operations Centre
                </p>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                KingdomCare OS
              </h1>
              <p className="mt-1.5 text-sm text-slate-400">{todayStr}</p>
            </div>

            <div className="anim-fade-up anim-delay-100">
              <Link
                href="/shifts/new"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all duration-150 hover:bg-blue-700 hover:shadow-lg active:scale-[0.98] active:bg-blue-800"
              >
                <span aria-hidden="true" className="text-lg font-normal leading-none">+</span>
                Start New Shift
              </Link>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6">

        {/* ── Quick actions ──────────────────────────────────── */}
        <section aria-labelledby="actions-heading">
          <h2
            id="actions-heading"
            className="anim-fade-up mb-4 text-[11px] font-bold uppercase tracking-widest text-slate-400"
          >
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {TASK_CARDS.map((card) => (
              <TaskCard key={card.href} {...card} />
            ))}
          </div>
        </section>

        {/* ── Stats overview ─────────────────────────────────── */}
        <section aria-labelledby="overview-heading">
          <h2
            id="overview-heading"
            className="anim-fade-up anim-delay-200 mb-4 text-[11px] font-bold uppercase tracking-widest text-slate-400"
          >
            Overview
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10">
            <StatCard label="Total Reports"    value={reports.length}     stripe="bg-blue-500"    delay=""               />
            <StatCard label="Reports Today"    value={reportsToday}       stripe="bg-sky-400"     delay="anim-delay-50"  />
            <StatCard label="Total Incidents"  value={incidents.length}   stripe="bg-rose-500"    delay="anim-delay-100" />
            <StatCard label="Incidents Today"  value={incidentsToday}     stripe="bg-amber-500"   delay="anim-delay-150" />
            <StatCard label="Meds Today"       value={medicationsToday}   stripe="bg-violet-500"  delay="anim-delay-200" />
            <StatCard label="Pending Meds"     value={pendingMedications} stripe="bg-orange-400"  delay="anim-delay-250" />
            <StatCard label="Missed / Refused" value={missedOrRefused}    stripe="bg-red-500"     delay="anim-delay-300" />
            <StatCard label="Tasks Today"      value={tasksToday}         stripe="bg-cyan-500"    delay="anim-delay-350" />
            <StatCard label="Pending Tasks"    value={pendingTasks}       stripe="bg-emerald-500" delay="anim-delay-400" />
            <StatCard label="Urgent Pending"   value={urgentPending}      stripe="bg-fuchsia-500" delay="anim-delay-450" />
          </div>
        </section>

        <section aria-labelledby="tasks-heading">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2
              id="tasks-heading"
              className="anim-fade-up anim-delay-250 text-[11px] font-bold uppercase tracking-widest text-slate-400"
            >
              Daily Tasks
            </h2>
            <Link
              href="/tasks"
              className="anim-fade-up anim-delay-300 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700"
            >
              Daily Tasks {'->'}
            </Link>
          </div>
          <div className="anim-fade-up anim-delay-350 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-colors duration-200 hover:border-slate-300">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Next Task Due
            </p>
            {!nextTaskDue ? (
              <div>
                <p className="text-sm text-slate-500">No tasks saved yet.</p>
                <Link
                  href="/tasks"
                  className="mt-3 inline-block text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700"
                >
                  Create a task {'->'}
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-bold text-slate-900">{nextTaskDue.title}</p>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                    {nextTaskDue.category}
                  </span>
                  <span className="rounded-full border border-red-100 bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">
                    {nextTaskDue.priority}
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  Due {formatTaskDue(nextTaskDue.dueDate, nextTaskDue.dueTime)}
                </p>
                <p className="text-sm text-slate-500">
                  Assigned to:{' '}
                  {nextTaskDue.assignedToType === 'Resident'
                    ? nextTaskDue.residentNameSnapshot || 'Resident'
                    : 'House'}
                </p>
                {nextTaskDue.description && (
                  <p className="text-sm leading-relaxed text-slate-500">{nextTaskDue.description}</p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── Recent activity ────────────────────────────────── */}
        <section aria-labelledby="recent-heading">
          <h2
            id="recent-heading"
            className="anim-fade-up anim-delay-300 mb-4 text-[11px] font-bold uppercase tracking-widest text-slate-400"
          >
            Recent Activity
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <RecentCard
              label="Last Report"
              empty={!latestReport}
              emptyText="No reports saved yet."
              linkHref="/shifts/new"
              linkLabel="Document a shift"
              delay="anim-delay-300"
            >
              {latestReport && (
                <>
                  <p className="text-sm font-bold text-slate-800">{latestReport.residentName}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {latestReport.shiftType} Shift · {latestReport.date}
                  </p>
                </>
              )}
            </RecentCard>

            <RecentCard
              label="Last Incident"
              empty={!latestIncident}
              emptyText="No incidents recorded."
              linkHref="/incidents"
              linkLabel="Log an incident"
              delay="anim-delay-350"
            >
              {latestIncident && (
                <>
                  <p className="text-sm font-bold text-slate-800">{latestIncident.residentName}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {latestIncident.incidentType} · {latestIncident.severity}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">{formatDateTime(latestIncident.dateTime)}</p>
                </>
              )}
            </RecentCard>

            <RecentCard
              label="Last Medication"
              empty={!latestMedication}
              emptyText="No medication entries yet."
              linkHref="/medications"
              linkLabel="Log a medication"
              delay="anim-delay-400"
            >
              {latestMedication && (
                <>
                  <p className="text-sm font-bold text-slate-800">{latestMedication.residentName}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{latestMedication.medicationLabel}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {formatSchedule(latestMedication.scheduledDate, latestMedication.scheduledTime)}
                    {' · '}
                    {latestMedication.status}
                  </p>
                </>
              )}
            </RecentCard>
          </div>
        </section>

      </main>
    </PageShell>
  )
}

/* ── Sub-components ─────────────────────────────────────────── */

function TaskCard({
  href,
  title,
  desc,
  icon,
  iconBg,
  delay,
}: {
  href: string
  title: string
  desc: string
  icon: React.ReactNode
  iconBg: string
  delay: string
}) {
  return (
    <Link
      href={href}
      className={`anim-fade-up ${delay} group kc-task-card flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-slate-300`}
    >
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${iconBg} transition-transform duration-200 group-hover:scale-105`}>
        {icon}
      </div>
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-400">{desc}</p>
      <p className="mt-4 text-xs font-bold text-blue-600 transition-transform duration-150 group-hover:translate-x-0.5">
        Open →
      </p>
    </Link>
  )
}

function StatCard({
  label,
  value,
  stripe,
  delay,
}: {
  label: string
  value: number
  stripe: string
  delay: string
}) {
  return (
    <div
      className={`anim-fade-up ${delay} overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
    >
      <div className={`h-1 ${stripe}`} />
      <div className="px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="mt-2 text-3xl font-bold leading-none tabular-nums text-slate-900">
          <AnimatedNumber value={value} />
        </p>
      </div>
    </div>
  )
}

function RecentCard({
  label,
  empty,
  emptyText,
  linkHref,
  linkLabel,
  delay,
  children,
}: {
  label: string
  empty: boolean
  emptyText: string
  linkHref: string
  linkLabel: string
  delay: string
  children?: React.ReactNode
}) {
  return (
    <div
      className={`anim-fade-up ${delay} rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-colors duration-200 hover:border-slate-300`}
    >
      <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      {empty ? (
        <div>
          <p className="text-xs text-slate-400">{emptyText}</p>
          <Link
            href={linkHref}
            className="mt-2 inline-block text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700"
          >
            {linkLabel} →
          </Link>
        </div>
      ) : (
        children
      )}
    </div>
  )
}

/* ── Utilities ──────────────────────────────────────────────── */

function isToday(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth()    === now.getMonth()    &&
    date.getDate()     === now.getDate()
  )
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function formatSchedule(date: string, time: string) {
  const combined = new Date(`${date}T${time}`)
  if (Number.isNaN(combined.getTime())) return `${date} ${time}`.trim()
  return combined.toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function formatTaskDue(date: string, time: string) {
  if (!time) {
    const parsed = new Date(date)
    if (Number.isNaN(parsed.getTime())) return date
    return parsed.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  }

  return formatSchedule(date, time)
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function formatDashboardDate(date: Date) {
  const weekdays = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ]
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]

  return `${weekdays[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}
