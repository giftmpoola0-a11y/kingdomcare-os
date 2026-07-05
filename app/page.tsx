import { performance } from 'node:perf_hooks'
import { redirect } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import type { SupabaseClient } from '@supabase/supabase-js'
import { DashboardShell } from '@/components/kingdomos-v0/dashboard-shell'
import type { DashboardCareAttentionItem } from '@/components/kingdomos-v0/dashboard/care-attention'
import type { DashboardCareTeamMember } from '@/components/kingdomos-v0/dashboard/staff-on-duty'
import type { DashboardRecentActivityItem } from '@/components/kingdomos-v0/dashboard/recent-activity'
import type { DashboardOperationalQueueItem } from '@/components/kingdomos-v0/dashboard/today-glance'
import { getCurrentUserAccess, normalizeMembershipRole, type MembershipRole } from '@/app/lib/supabase/access'
import type { Database, Tables } from '@/app/lib/supabase/database.types'
import { mapIncidentRowToRecord, type IncidentRecord } from '@/app/lib/supabase/incidents'
import {
  mapMedicationAlertRowToRecord,
  mapMedicationRowToRecord,
  type MedicationAlertRecord,
  type MedicationRecord,
} from '@/app/lib/supabase/medications'
import type { ResidentActivityRecord } from '@/app/lib/supabase/residents'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'
import {
  EMPTY_SIDEBAR_BADGE_COUNTS,
  getCurrentCareHomeSidebarBadgeCounts,
} from '@/app/lib/supabase/sidebar-badge-counts'
import {
  mapShiftReportRowToRecord,
  type ShiftReportRecord,
} from '@/app/lib/supabase/shiftReports'
import { mapTaskRowToRecord, type TaskRecord } from '@/app/lib/supabase/tasks'

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-v0-sans',
  subsets: ['latin'],
})

type TypedSupabaseClient = SupabaseClient<Database>
type ResidentDirectoryEntry = Pick<Tables<'residents'>, 'id' | 'full_name'>
type ResidentActivityRow = Pick<Tables<'residents'>, 'id' | 'full_name' | 'status' | 'created_at' | 'updated_at'>
type DashboardTimingEntry = {
  label: string
  ms: number
}

const DASHBOARD_PROFILE_ENABLED = process.env.KC_PROFILE_DASHBOARD === '1'

export default async function DashboardPage() {
  const dashboardTimings: DashboardTimingEntry[] = []
  const supabase = (await measureDashboardStep(dashboardTimings, 'getSupabaseServerClient', () =>
    getSupabaseServerClient()
  )) as TypedSupabaseClient
  const access = await measureDashboardStep(dashboardTimings, 'getCurrentUserAccess', () =>
    getCurrentUserAccess(supabase)
  )

  if (!access.isSignedIn) {
    redirect('/auth/sign-in')
  }

  if (!access.hasCareHome) {
    redirect('/onboarding')
  }

  const membership = access.membership

  if (!membership) {
    redirect('/onboarding')
  }

  const nowIso = new Date().toISOString()

  const sidebarBadgeCountsPromise = loadDashboardData(
    dashboardTimings,
    'sidebarBadgeCounts',
    EMPTY_SIDEBAR_BADGE_COUNTS,
    () => getCurrentCareHomeSidebarBadgeCounts(access, supabase)
  )

  const residentDirectoryPromise = loadDashboardData(
    dashboardTimings,
    'residentDirectory',
    [] as ResidentDirectoryEntry[],
    async () => {
      const { data, error } = await supabase
        .from('residents')
        .select('id, full_name')
        .eq('care_home_id', membership.careHomeId)
        .is('deleted_at', null)
        .order('full_name', { ascending: true })

      if (error) {
        throw new Error(error.message)
      }

      return data ?? []
    }
  )

  const recentResidentsPromise = loadDashboardData(
    dashboardTimings,
    'recentResidents',
    [] as ResidentActivityRecord[],
    async () => {
      const { data, error } = await supabase
        .from('residents')
        .select('id, full_name, status, created_at, updated_at')
        .eq('care_home_id', membership.careHomeId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        throw new Error(error.message)
      }

      return (data ?? []).map((row) => mapRecentResidentRowToActivity(row as ResidentActivityRow))
    }
  )

  const recentTasksPromise = loadDashboardData(
    dashboardTimings,
    'recentTasks',
    [] as TaskRecord[],
    async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('care_home_id', membership.careHomeId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        throw new Error(error.message)
      }

      return (data ?? []).map(mapTaskRowToRecord)
    }
  )

  const openTasksPromise = loadDashboardData(
    dashboardTimings,
    'openTasks',
    [] as TaskRecord[],
    async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('care_home_id', membership.careHomeId)
        .in('status', ['open', 'in_progress'])
        .is('deleted_at', null)
        .order('due_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(25)

      if (error) {
        throw new Error(error.message)
      }

      return (data ?? []).map(mapTaskRowToRecord)
    }
  )

  const overdueTasksCountPromise = loadDashboardData(
    dashboardTimings,
    'overdueTasksCount',
    0,
    async () => {
      const { count, error } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('care_home_id', membership.careHomeId)
        .in('status', ['open', 'in_progress'])
        .is('deleted_at', null)
        .lt('due_at', nowIso)

      if (error) {
        throw new Error(error.message)
      }

      return count ?? 0
    }
  )

  const recentIncidentsPromise = loadDashboardData(
    dashboardTimings,
    'recentIncidents',
    [] as IncidentRecord[],
    async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('care_home_id', membership.careHomeId)
        .is('deleted_at', null)
        .order('occurred_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        throw new Error(error.message)
      }

      return (data ?? []).map(mapIncidentRowToRecord)
    }
  )

  const openIncidentsPromise = loadDashboardData(
    dashboardTimings,
    'openIncidents',
    [] as IncidentRecord[],
    async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('care_home_id', membership.careHomeId)
        .in('status', ['open', 'reviewing'])
        .is('deleted_at', null)
        .order('occurred_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(25)

      if (error) {
        throw new Error(error.message)
      }

      return (data ?? []).map(mapIncidentRowToRecord)
    }
  )

  const openIncidentsCountPromise = loadDashboardData(
    dashboardTimings,
    'openIncidentsCount',
    0,
    async () => {
      const { count, error } = await supabase
        .from('incidents')
        .select('id', { count: 'exact', head: true })
        .eq('care_home_id', membership.careHomeId)
        .in('status', ['open', 'reviewing'])
        .is('deleted_at', null)

      if (error) {
        throw new Error(error.message)
      }

      return count ?? 0
    }
  )

  const recentShiftReportsPromise = loadDashboardData(
    dashboardTimings,
    'recentShiftReports',
    [] as ShiftReportRecord[],
    async () => {
      const { data, error } = await supabase
        .from('shift_reports')
        .select('*')
        .eq('care_home_id', membership.careHomeId)
        .is('deleted_at', null)
        .order('shift_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(4)

      if (error) {
        throw new Error(error.message)
      }

      return (data ?? []).map(mapShiftReportRowToRecord)
    }
  )

  const recentMedicationsPromise = loadDashboardData(
    dashboardTimings,
    'recentMedications',
    [] as MedicationRecord[],
    async () => {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('care_home_id', membership.careHomeId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        throw new Error(error.message)
      }

      return (data ?? []).map(mapMedicationRowToRecord)
    }
  )

  const recentMedicationAlertsPromise = loadDashboardData(
    dashboardTimings,
    'recentMedicationAlerts',
    [] as MedicationAlertRecord[],
    async () => {
      const { data, error } = await supabase
        .from('medication_alerts')
        .select('*')
        .eq('care_home_id', membership.careHomeId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        throw new Error(error.message)
      }

      return (data ?? []).map(mapMedicationAlertRowToRecord)
    }
  )

  const openMedicationAlertsPromise = loadDashboardData(
    dashboardTimings,
    'openMedicationAlerts',
    [] as MedicationAlertRecord[],
    async () => {
      const { data, error } = await supabase
        .from('medication_alerts')
        .select('*')
        .eq('care_home_id', membership.careHomeId)
        .in('status', ['open', 'reviewing'])
        .is('deleted_at', null)
        .order('due_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(25)

      if (error) {
        throw new Error(error.message)
      }

      return (data ?? []).map(mapMedicationAlertRowToRecord)
    }
  )

  const careTeamMembersPromise =
    access.role === 'admin' || access.role === 'nurse'
      ? loadDashboardData(
          dashboardTimings,
          'careTeamMembers',
          [] as DashboardCareTeamMember[],
          async () => {
            const { data, error } = await supabase.rpc('get_care_home_staff', {
              p_care_home_id: membership.careHomeId,
            })

            if (error) {
              throw new Error(error.message)
            }

            return Array.isArray(data)
              ? data
                  .map((member) => normalizeDashboardCareTeamMember(member))
                  .filter((member): member is DashboardCareTeamMember => member !== null)
              : []
          }
        )
      : Promise.resolve([] as DashboardCareTeamMember[])

  const [
    sidebarBadgeCounts,
    residentDirectory,
    recentResidents,
    recentTasks,
    openTasks,
    overdueTasksCount,
    recentIncidents,
    openIncidents,
    openIncidentsCount,
    recentShiftReports,
    recentMedications,
    recentMedicationAlerts,
    openMedicationAlerts,
    careTeamMembers,
  ] = await Promise.all([
    sidebarBadgeCountsPromise,
    residentDirectoryPromise,
    recentResidentsPromise,
    recentTasksPromise,
    openTasksPromise,
    overdueTasksCountPromise,
    recentIncidentsPromise,
    openIncidentsPromise,
    openIncidentsCountPromise,
    recentShiftReportsPromise,
    recentMedicationsPromise,
    recentMedicationAlertsPromise,
    openMedicationAlertsPromise,
    careTeamMembersPromise,
  ])

  const residentNameById = new Map(residentDirectory.map((resident) => [resident.id, resident.full_name]))
  const recentActivityItems = buildRecentActivityItems({
    residentNameById,
    recentResidents,
    tasks: recentTasks,
    incidents: recentIncidents,
    shiftReports: recentShiftReports,
    medications: recentMedications,
    medicationAlerts: recentMedicationAlerts,
  })
  const careAttentionItems = buildCareAttentionItems({
    residentNameById,
    openTasks,
    openIncidents,
    openMedicationAlerts,
  })
  const operationalQueueItems = buildOperationalQueueItems({
    residentNameById,
    openTasks,
    openIncidents,
    openMedicationAlerts,
  })

  if (DASHBOARD_PROFILE_ENABLED) {
    console.log(
      `[dashboard-timing] ${JSON.stringify(
        dashboardTimings
          .slice()
          .sort((left, right) => right.ms - left.ms)
          .map((entry) => ({ ...entry, ms: Number(entry.ms.toFixed(1)) }))
      )}`
    )
  }

  return (
    <div className={`${plusJakartaSans.variable} bg-background font-sans antialiased`}>
      <div className="v0-dashboard-theme dark">
        <DashboardShell
          roleLabel={dashboardRoleLabel(access.role)}
          role={access.role}
          userDisplayName={access.profile?.fullName || access.profile?.email || access.user?.email || ''}
          careHomeName={access.careHomeName}
          activeResidentsCount={sidebarBadgeCounts.activeResidentsCount}
          openTasksCount={sidebarBadgeCounts.openTasksCount}
          overdueTasksCount={overdueTasksCount}
          openIncidentsCount={openIncidentsCount}
          recentActivityItems={recentActivityItems}
          careAttentionItems={careAttentionItems}
          operationalQueueItems={operationalQueueItems}
          careTeamMembers={careTeamMembers}
          recentShiftReports={recentShiftReports}
          sidebarBadgeCounts={sidebarBadgeCounts}
        />
      </div>
    </div>
  )
}

async function measureDashboardStep<T>(
  timings: DashboardTimingEntry[],
  label: string,
  task: () => Promise<T>
): Promise<T> {
  const start = performance.now()

  try {
    return await task()
  } finally {
    if (DASHBOARD_PROFILE_ENABLED) {
      timings.push({
        label,
        ms: performance.now() - start,
      })
    }
  }
}

async function loadDashboardData<T>(
  timings: DashboardTimingEntry[],
  label: string,
  fallback: T,
  task: () => Promise<T>
): Promise<T> {
  try {
    return await measureDashboardStep(timings, label, task)
  } catch (error) {
    console.error(`Failed to load ${label} for dashboard:`, error)
    return fallback
  }
}

function mapRecentResidentRowToActivity(row: ResidentActivityRow): ResidentActivityRecord {
  return {
    id: row.id,
    name: row.full_name,
    status: row.status === 'archived' ? 'archived' : 'active',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function normalizeDashboardCareTeamMember(value: unknown): DashboardCareTeamMember | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const item = value as Record<string, unknown>
  const role = normalizeMembershipRole(typeof item.role === 'string' ? item.role : null)

  if (
    typeof item.membership_id !== 'string' ||
    typeof item.user_id !== 'string' ||
    !role
  ) {
    return null
  }

  return {
    id: item.membership_id,
    fullName: typeof item.full_name === 'string' ? item.full_name : '',
    email: typeof item.email === 'string' ? item.email : '',
    role,
  }
}

function buildRecentActivityItems({
  residentNameById,
  recentResidents,
  tasks,
  incidents,
  shiftReports,
  medications,
  medicationAlerts,
}: {
  residentNameById: Map<string, string>
  recentResidents: ResidentActivityRecord[]
  tasks: TaskRecord[]
  incidents: IncidentRecord[]
  shiftReports: ShiftReportRecord[]
  medications: MedicationRecord[]
  medicationAlerts: MedicationAlertRecord[]
}): DashboardRecentActivityItem[] {
  const residentItems: DashboardRecentActivityItem[] = recentResidents.map((resident) => ({
    id: `resident-${resident.id}`,
    type: 'resident',
    title: `Resident added: ${resident.name}`,
    description: resident.status === 'archived' ? 'Resident record was later archived.' : 'New resident record created.',
    timestamp: resident.createdAt,
    tone: resident.status === 'archived' ? 'gray' : 'green',
    href: '/residents',
  }))

  const taskItems: DashboardRecentActivityItem[] = tasks.map((task) => ({
    id: `task-${task.id}`,
    type: 'task',
    title:
      task.status === 'completed'
        ? `Task completed: ${task.title}`
        : task.status === 'archived'
          ? `Task archived: ${task.title}`
          : `Task updated: ${task.title}`,
    description: [
      task.residentId ? residentNameById.get(task.residentId) : null,
      task.category ? `Category: ${task.category}` : null,
      task.priority ? `Priority: ${task.priority}` : null,
    ]
      .filter(Boolean)
      .join(' | ') || 'Task activity recorded.',
    timestamp: task.completedAt ?? task.updatedAt ?? task.createdAt,
    tone: task.status === 'completed' ? 'green' : task.status === 'archived' ? 'gray' : 'amber',
    href: '/tasks',
  }))

  const incidentItems: DashboardRecentActivityItem[] = incidents.map((incident) => ({
    id: `incident-${incident.id}`,
    type: 'incident',
    title:
      incident.status === 'resolved'
        ? `Incident resolved: ${incident.incidentType}`
        : incident.status === 'archived'
          ? `Incident archived: ${incident.incidentType}`
          : `Incident logged: ${incident.incidentType}`,
    description: [
      incident.residentId ? residentNameById.get(incident.residentId) : null,
      incident.location || null,
      severityLabel(incident.severity),
    ]
      .filter(Boolean)
      .join(' | ') || 'Incident activity recorded.',
    timestamp: incident.resolvedAt ?? incident.occurredAt ?? incident.createdAt,
    tone:
      incident.status === 'resolved'
        ? 'green'
        : incident.status === 'archived'
          ? 'gray'
          : incident.status === 'reviewing'
            ? 'amber'
            : incident.severity === 'high' || incident.severity === 'critical'
              ? 'red'
              : 'amber',
    href: '/incidents',
  }))

  const shiftReportItems: DashboardRecentActivityItem[] = shiftReports.map((report) => ({
    id: `shift-report-${report.id}`,
    type: 'shift_report',
    title: `Shift report saved: ${report.residentName}`,
    description: [
      report.shiftType,
      report.summary.trim() ? truncateText(report.summary, 88) : 'No summary saved.',
    ].join(' | '),
    timestamp: report.updatedAt ?? report.createdAt,
    tone: 'green',
    href: '/shifts',
  }))

  const medicationItems: DashboardRecentActivityItem[] = medications.map((medication) => ({
    id: `medication-${medication.id}`,
    type: 'medication',
    title:
      medication.status === 'paused'
        ? `Medication paused: ${medication.medicationName}`
        : medication.status === 'discontinued'
          ? `Medication discontinued: ${medication.medicationName}`
          : medication.status === 'archived'
            ? `Medication archived: ${medication.medicationName}`
            : `Medication added: ${medication.medicationName}`,
    description: [
      residentNameById.get(medication.residentId),
      medication.dosage || null,
      medication.frequency || null,
    ]
      .filter(Boolean)
      .join(' | ') || 'Medication record updated.',
    timestamp: medication.updatedAt ?? medication.createdAt,
    tone:
      medication.status === 'active'
        ? 'green'
        : medication.status === 'paused'
          ? 'amber'
          : medication.status === 'discontinued'
            ? 'red'
            : 'gray',
    href: '/medications',
  }))

  const alertItems: DashboardRecentActivityItem[] = medicationAlerts.map((alert) => ({
    id: `medication-alert-${alert.id}`,
    type: 'medication_alert',
    title:
      alert.status === 'resolved'
        ? `Alert resolved: ${medicationAlertLabel(alert.alertType)}`
        : alert.status === 'archived'
          ? `Alert archived: ${medicationAlertLabel(alert.alertType)}`
          : `Alert logged: ${medicationAlertLabel(alert.alertType)}`,
    description: [
      alert.residentId ? residentNameById.get(alert.residentId) : null,
      alert.message,
    ]
      .filter(Boolean)
      .join(' | '),
    timestamp: alert.resolvedAt ?? alert.updatedAt ?? alert.createdAt,
    tone:
      alert.status === 'resolved'
        ? 'green'
        : alert.status === 'archived'
          ? 'gray'
          : alert.severity === 'high' || alert.severity === 'critical'
            ? 'red'
            : 'amber',
    href: '/medications',
  }))

  return [...residentItems, ...taskItems, ...incidentItems, ...shiftReportItems, ...medicationItems, ...alertItems]
    .filter((item) => item.timestamp)
    .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp))
    .slice(0, 6)
}

function buildCareAttentionItems({
  residentNameById,
  openTasks,
  openIncidents,
  openMedicationAlerts,
}: {
  residentNameById: Map<string, string>
  openTasks: TaskRecord[]
  openIncidents: IncidentRecord[]
  openMedicationAlerts: MedicationAlertRecord[]
}): DashboardCareAttentionItem[] {
  const taskItems: DashboardCareAttentionItem[] = openTasks
    .filter((task) => task.priority === 'urgent' || task.priority === 'high')
    .map((task) => ({
      id: `task-${task.id}`,
      source: 'task',
      title: task.title,
      subtitle: [
        task.category ? `Task: ${task.category}` : 'Open task',
        task.dueAt ? `Due ${formatShortDate(task.dueAt)}` : null,
      ]
        .filter(Boolean)
        .join(' | '),
      residentName: task.residentId ? residentNameById.get(task.residentId) ?? null : null,
      severity: task.priority === 'urgent' ? 'urgent' : 'warning',
      href: '/tasks',
    }))

  const incidentItems: DashboardCareAttentionItem[] = openIncidents.map((incident) => ({
    id: `incident-${incident.id}`,
    source: 'incident',
    title: incident.incidentType,
    subtitle: [
      incident.status === 'reviewing' ? 'Review in progress' : 'Open incident',
      incident.location || null,
    ]
      .filter(Boolean)
      .join(' | '),
    residentName: incident.residentId ? residentNameById.get(incident.residentId) ?? null : null,
    severity:
      incident.severity === 'critical' || incident.severity === 'high'
        ? 'urgent'
        : incident.status === 'reviewing' || incident.followUpRequired
          ? 'warning'
          : 'watch',
    href: '/incidents',
  }))

  const alertItems: DashboardCareAttentionItem[] = openMedicationAlerts.map((alert) => ({
    id: `medication-alert-${alert.id}`,
    source: 'medication_alert',
    title: medicationAlertLabel(alert.alertType),
    subtitle: [
      alert.status === 'reviewing' ? 'Review required' : 'Open medication alert',
      alert.message,
    ]
      .filter(Boolean)
      .join(' | '),
    residentName: alert.residentId ? residentNameById.get(alert.residentId) ?? null : null,
    severity:
      alert.severity === 'critical' || alert.severity === 'high'
        ? 'urgent'
        : alert.severity === 'medium' || alert.status === 'reviewing'
          ? 'warning'
          : 'watch',
    href: '/medications',
  }))

  return [...taskItems, ...incidentItems, ...alertItems]
    .sort((left, right) => {
      const severityDelta = careAttentionSeverityRank(left.severity) - careAttentionSeverityRank(right.severity)
      if (severityDelta !== 0) return severityDelta
      return left.title.localeCompare(right.title)
    })
    .slice(0, 3)
}

function buildOperationalQueueItems({
  residentNameById,
  openTasks,
  openIncidents,
  openMedicationAlerts,
}: {
  residentNameById: Map<string, string>
  openTasks: TaskRecord[]
  openIncidents: IncidentRecord[]
  openMedicationAlerts: MedicationAlertRecord[]
}): DashboardOperationalQueueItem[] {
  const now = new Date()
  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)

  const taskItems: DashboardOperationalQueueItem[] = openTasks
    .filter((task) => shouldIncludeTaskInOperationalQueue(task, now, endOfToday))
    .map((task) => {
      const dueDate = task.dueAt ? new Date(task.dueAt) : null
      const isOverdue = dueDate ? dueDate.getTime() < now.getTime() : false
      const isDueSoon = dueDate ? dueDate.getTime() <= endOfToday.getTime() : false
      const isInProgress = task.status === 'in_progress'

      return {
        id: `task-${task.id}`,
        source: 'task',
        title: task.title,
        subtitle: [
          task.residentId ? residentNameById.get(task.residentId) : null,
          task.category ? `Task: ${task.category}` : null,
          `Priority: ${task.priority}`,
        ]
          .filter(Boolean)
          .join(' | '),
        dueLabel: dueDate ? `Due ${formatQueueDateTime(task.dueAt as string)}` : undefined,
        status: isOverdue ? 'overdue' : isInProgress ? 'in_progress' : 'upcoming',
        severity: isOverdue || task.priority === 'urgent' ? 'urgent' : isDueSoon || task.priority === 'high' ? 'warning' : 'normal',
        href: '/tasks',
      }
    })

  const incidentItems: DashboardOperationalQueueItem[] = openIncidents.map((incident) => ({
    id: `incident-${incident.id}`,
    source: 'incident',
    title: incident.incidentType,
    subtitle: [
      incident.residentId ? residentNameById.get(incident.residentId) : null,
      incident.location || null,
      incident.status === 'reviewing' ? 'Needs review' : 'Open incident',
    ]
      .filter(Boolean)
      .join(' | '),
    dueLabel: `Logged ${formatQueueDateTime(incident.occurredAt)}`,
    status: 'review',
    severity: incident.severity === 'critical' || incident.severity === 'high' ? 'urgent' : 'warning',
    href: '/incidents',
  }))

  const medicationAlertItems: DashboardOperationalQueueItem[] = openMedicationAlerts
    .filter((alert) => shouldIncludeAlertInOperationalQueue(alert, now, endOfToday))
    .map((alert) => {
      const dueDate = alert.dueAt ? new Date(alert.dueAt) : null
      const isOverdue = dueDate ? dueDate.getTime() < now.getTime() : false
      const isDueSoon = dueDate ? dueDate.getTime() <= endOfToday.getTime() : false

      return {
        id: `medication-alert-${alert.id}`,
        source: 'medication_alert',
        title: medicationAlertLabel(alert.alertType),
        subtitle: [
          alert.residentId ? residentNameById.get(alert.residentId) : null,
          alert.message,
        ]
          .filter(Boolean)
          .join(' | '),
        dueLabel: alert.dueAt ? `Due ${formatQueueDateTime(alert.dueAt)}` : `Logged ${formatQueueDateTime(alert.createdAt)}`,
        status: isOverdue ? 'overdue' : alert.status === 'reviewing' ? 'review' : 'upcoming',
        severity:
          isOverdue || alert.severity === 'critical' || alert.severity === 'high'
            ? 'urgent'
            : isDueSoon || alert.status === 'reviewing' || alert.severity === 'medium'
              ? 'warning'
              : 'normal',
        href: '/medications',
      }
    })

  return [...taskItems, ...incidentItems, ...medicationAlertItems]
    .sort((left, right) => {
      const priorityDelta = operationalQueuePriority(left) - operationalQueuePriority(right)
      if (priorityDelta !== 0) return priorityDelta

      const leftTime = extractQueueSortTime(left.dueLabel)
      const rightTime = extractQueueSortTime(right.dueLabel)
      return leftTime - rightTime
    })
    .slice(0, 6)
}

function shouldIncludeTaskInOperationalQueue(task: TaskRecord, now: Date, endOfToday: Date) {
  if (task.priority === 'urgent' || task.priority === 'high') {
    return true
  }

  if (!task.dueAt) {
    return task.status === 'in_progress'
  }

  const dueDate = new Date(task.dueAt)
  if (Number.isNaN(dueDate.getTime())) {
    return task.status === 'in_progress'
  }

  return dueDate.getTime() <= endOfToday.getTime() || dueDate.getTime() < now.getTime() || task.status === 'in_progress'
}

function shouldIncludeAlertInOperationalQueue(alert: MedicationAlertRecord, now: Date, endOfToday: Date) {
  if (alert.severity === 'critical' || alert.severity === 'high' || alert.status === 'reviewing') {
    return true
  }

  if (!alert.dueAt) {
    return alert.severity === 'medium'
  }

  const dueDate = new Date(alert.dueAt)
  if (Number.isNaN(dueDate.getTime())) {
    return alert.severity === 'medium'
  }

  return dueDate.getTime() <= endOfToday.getTime() || dueDate.getTime() < now.getTime() || alert.severity === 'medium'
}

function operationalQueuePriority(item: DashboardOperationalQueueItem) {
  const statusRank =
    item.status === 'overdue'
      ? 0
      : item.severity === 'urgent'
        ? 1
        : item.status === 'review'
          ? 2
          : item.status === 'in_progress'
            ? 3
            : item.severity === 'warning'
              ? 4
              : 5

  return statusRank
}

function extractQueueSortTime(label?: string) {
  if (!label) {
    return Number.MAX_SAFE_INTEGER
  }

  const normalized = label.replace(/^Due\s+|^Logged\s+/i, '')
  const parsed = Date.parse(normalized)
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed
}

function careAttentionSeverityRank(severity: DashboardCareAttentionItem['severity']) {
  switch (severity) {
    case 'urgent':
      return 0
    case 'warning':
      return 1
    default:
      return 2
  }
}

function dashboardRoleLabel(role: MembershipRole | null | undefined) {
  switch (role) {
    case 'admin':
      return 'Admin'
    case 'nurse':
      return 'Nurse'
    case 'caregiver':
      return 'Caregiver'
    default:
      return 'Care Team'
  }
}

function truncateText(value: string, length: number) {
  const trimmed = value.trim()
  if (trimmed.length <= length) {
    return trimmed
  }

  return `${trimmed.slice(0, Math.max(length - 3, 1)).trimEnd()}...`
}

function formatShortDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function formatQueueDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const isToday = date.toDateString() === new Date().toDateString()

  return isToday
    ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
}

function severityLabel(severity: IncidentRecord['severity']) {
  switch (severity) {
    case 'critical':
      return 'Critical'
    case 'high':
      return 'High'
    case 'medium':
      return 'Medium'
    default:
      return 'Low'
  }
}

function medicationAlertLabel(alertType: MedicationAlertRecord['alertType']) {
  switch (alertType) {
    case 'missed_dose':
      return 'Missed Dose'
    case 'refill_needed':
      return 'Refill Needed'
    case 'review_required':
      return 'Review Required'
    case 'allergy_warning':
      return 'Allergy Warning'
    case 'interaction_warning':
      return 'Interaction Warning'
    default:
      return 'Other Alert'
  }
}

