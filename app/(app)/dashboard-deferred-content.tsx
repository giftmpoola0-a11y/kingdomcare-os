import { Suspense } from 'react'
import { Card } from '@/components/ui/card'
import { normalizeMembershipRole, type MembershipRole } from '@/app/lib/supabase/access'
import type { Tables } from '@/app/lib/supabase/database.types'
import { mapIncidentRowToRecord, type IncidentRecord } from '@/app/lib/supabase/incidents'
import {
  mapMedicationAlertRowToRecord,
  mapMedicationRowToRecord,
  type MedicationAlertRecord,
  type MedicationRecord,
} from '@/app/lib/supabase/medications'
import { measureServerStep } from '@/app/lib/perf'
import type { ResidentActivityRecord } from '@/app/lib/supabase/residents'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'
import type { TypedSupabaseClient } from '@/app/lib/supabase/shared'
import { mapShiftReportRowToRecord, type ShiftReportRecord } from '@/app/lib/supabase/shiftReports'
import { mapTaskRowToRecord, type TaskRecord } from '@/app/lib/supabase/tasks'
import { RecentShiftReports } from '@/components/kingdomos-v0/dashboard/recent-shift-reports'
import { RecentActivity, type DashboardRecentActivityItem } from '@/components/kingdomos-v0/dashboard/recent-activity'
import { TodayGlance, type DashboardOperationalQueueItem } from '@/components/kingdomos-v0/dashboard/today-glance'
import { CareAttention, type DashboardCareAttentionItem } from '@/components/kingdomos-v0/dashboard/care-attention'
import { CareTeam, type DashboardCareTeamMember } from '@/components/kingdomos-v0/dashboard/staff-on-duty'

const DASHBOARD_RECENT_ACTIVITY_LIMIT = 4
const DASHBOARD_OPEN_QUEUE_LIMIT = 12
const DASHBOARD_RECENT_MEDICATION_LIMIT = 3
const DASHBOARD_RECENT_MEDICATION_ALERT_LIMIT = 3

type ResidentActivityRow = Pick<Tables<'residents'>, 'id' | 'full_name' | 'status' | 'created_at' | 'updated_at'>

export function DashboardDeferredContent({
  careHomeId,
  role,
}: {
  careHomeId: string
  role: MembershipRole
}) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <Suspense fallback={<DashboardOperationalFallback />}>
          <DashboardOperationalSection careHomeId={careHomeId} role={role} />
        </Suspense>
      </div>

      <div className="flex flex-col gap-6">
        <Suspense fallback={<DashboardCardFallback title="Recent shift reports" description="Loading the latest saved handover and care notes." />}>
          <DashboardRecentShiftReportsSection careHomeId={careHomeId} />
        </Suspense>
        <Suspense fallback={<DashboardCardFallback title="Recent activity" description="Loading the latest live updates from your care home." />}>
          <DashboardRecentActivitySection careHomeId={careHomeId} role={role} />
        </Suspense>
        <Suspense fallback={<DashboardCardFallback title="Care Team" description="Loading current care team members." />}>
          <DashboardCareTeamSection careHomeId={careHomeId} role={role} />
        </Suspense>
      </div>
    </div>
  )
}

async function DashboardOperationalSection({ careHomeId, role }: { careHomeId: string; role: MembershipRole }) {
  const supabase = (await getSupabaseServerClient()) as TypedSupabaseClient
  const canSeeMedications = role === 'admin' || role === 'nurse'
  const [openTasks, openIncidents, openMedicationAlerts] = await measureServerStep(
    'dashboard:operational-section',
    async () => {
      const [openTasksData, openIncidentsData, openMedicationAlertsData] = await Promise.all([
        loadOpenTasks(supabase, careHomeId),
        loadOpenIncidents(supabase, careHomeId),
        canSeeMedications ? loadOpenMedicationAlerts(supabase, careHomeId) : Promise.resolve([]),
      ])

      return [openTasksData, openIncidentsData, openMedicationAlertsData] as const
    },
    { careHomeId, role }
  )

  const residentNameById = await loadResidentNameMap(supabase, careHomeId, [
    ...openTasks.map((task) => task.residentId),
    ...openIncidents.map((incident) => incident.residentId),
    ...openMedicationAlerts.map((alert) => alert.residentId),
  ])

  return (
    <>
      <TodayGlance
        items={buildOperationalQueueItems({
          residentNameById,
          openTasks,
          openIncidents,
          openMedicationAlerts,
        })}
      />
      <CareAttention
        items={buildCareAttentionItems({
          residentNameById,
          openTasks,
          openIncidents,
          openMedicationAlerts,
        })}
      />
    </>
  )
}

async function DashboardRecentShiftReportsSection({ careHomeId }: { careHomeId: string }) {
  const supabase = (await getSupabaseServerClient()) as TypedSupabaseClient
  const recentShiftReports = await measureServerStep(
    'dashboard:recent-shift-reports-section',
    () => loadRecentShiftReports(supabase, careHomeId),
    { careHomeId }
  )

  return <RecentShiftReports reports={recentShiftReports} />
}

async function DashboardRecentActivitySection({ careHomeId, role }: { careHomeId: string; role: MembershipRole }) {
  const supabase = (await getSupabaseServerClient()) as TypedSupabaseClient
  const canSeeMedications = role === 'admin' || role === 'nurse'
  const [recentResidents, recentTasks, recentIncidents, recentShiftReports, recentMedications, recentMedicationAlerts] =
    await measureServerStep(
      'dashboard:recent-activity-section',
      async () => {
        const [recentResidentsData, recentTasksData, recentIncidentsData, recentShiftReportsData, recentMedicationsData, recentMedicationAlertsData] = await Promise.all([
          loadRecentResidents(supabase, careHomeId),
          loadRecentTasks(supabase, careHomeId),
          loadRecentIncidents(supabase, careHomeId),
          loadRecentShiftReports(supabase, careHomeId),
          canSeeMedications ? loadRecentMedications(supabase, careHomeId) : Promise.resolve([]),
          canSeeMedications ? loadRecentMedicationAlerts(supabase, careHomeId) : Promise.resolve([]),
        ])

        return [
          recentResidentsData,
          recentTasksData,
          recentIncidentsData,
          recentShiftReportsData,
          recentMedicationsData,
          recentMedicationAlertsData,
        ] as const
      },
      { careHomeId, role }
    )

  const residentNameById = await loadResidentNameMap(supabase, careHomeId, [
    ...recentTasks.map((task) => task.residentId),
    ...recentIncidents.map((incident) => incident.residentId),
    ...recentMedications.map((medication) => medication.residentId),
    ...recentMedicationAlerts.map((alert) => alert.residentId),
  ])

  return (
    <RecentActivity
      items={buildRecentActivityItems({
        residentNameById,
        recentResidents,
        tasks: recentTasks,
        incidents: recentIncidents,
        shiftReports: recentShiftReports,
        medications: recentMedications,
        medicationAlerts: recentMedicationAlerts,
      })}
    />
  )
}

async function DashboardCareTeamSection({
  careHomeId,
  role,
}: {
  careHomeId: string
  role: MembershipRole
}) {
  if (role !== 'admin' && role !== 'nurse') {
    return <CareTeam members={[]} />
  }

  const supabase = (await getSupabaseServerClient()) as TypedSupabaseClient
  const careTeamMembers = await measureServerStep(
    'dashboard:care-team-section',
    async () => {
      const { data, error } = await supabase.rpc('get_care_home_staff', {
        p_care_home_id: careHomeId,
      })

      if (error) {
        throw new Error(error.message)
      }

      return Array.isArray(data)
        ? data
            .map((member) => normalizeDashboardCareTeamMember(member))
            .filter((member): member is DashboardCareTeamMember => member !== null)
        : []
    },
    { careHomeId, role }
  )

  return <CareTeam members={careTeamMembers} />
}

function DashboardOperationalFallback() {
  return (
    <>
      <DashboardCardFallback title="Today's operational queue" description="Loading live tasks, incidents, and medication alerts needing attention." />
      <DashboardCardFallback title="Care attention needed" description="Loading residents and records flagged for review." />
    </>
  )
}

function DashboardCardFallback({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <Card data-dashboard-fallback="true" className="gap-0 rounded-2xl border-border bg-card p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="mt-5 space-y-3">
        <div className="h-4 w-5/6 rounded bg-muted/70" />
        <div className="h-4 w-2/3 rounded bg-muted/60" />
        <div className="h-4 w-3/4 rounded bg-muted/50" />
      </div>
    </Card>
  )
}

async function loadResidentNameMap(
  supabase: TypedSupabaseClient,
  careHomeId: string,
  residentIds: Array<string | null | undefined>
) {
  const resolvedResidentIds = Array.from(
    new Set(
      residentIds.filter((residentId): residentId is string => typeof residentId === 'string' && residentId.length > 0)
    )
  )

  if (resolvedResidentIds.length === 0) {
    return new Map<string, string>()
  }

  const { data, error } = await supabase
    .from('residents')
    .select('id, full_name')
    .eq('care_home_id', careHomeId)
    .is('deleted_at', null)
    .in('id', resolvedResidentIds)

  if (error) {
    throw new Error(error.message)
  }

  return new Map((data ?? []).map((resident) => [resident.id, resident.full_name]))
}

async function loadRecentResidents(supabase: TypedSupabaseClient, careHomeId: string) {
  const { data, error } = await supabase
    .from('residents')
    .select('id, full_name, status, created_at, updated_at')
    .eq('care_home_id', careHomeId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(DASHBOARD_RECENT_ACTIVITY_LIMIT)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => mapRecentResidentRowToActivity(row as ResidentActivityRow))
}

async function loadRecentTasks(supabase: TypedSupabaseClient, careHomeId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('care_home_id', careHomeId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(DASHBOARD_RECENT_ACTIVITY_LIMIT)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map(mapTaskRowToRecord)
}

async function loadOpenTasks(supabase: TypedSupabaseClient, careHomeId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('care_home_id', careHomeId)
    .in('status', ['open', 'in_progress'])
    .is('deleted_at', null)
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(DASHBOARD_OPEN_QUEUE_LIMIT)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map(mapTaskRowToRecord)
}

async function loadRecentIncidents(supabase: TypedSupabaseClient, careHomeId: string) {
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .eq('care_home_id', careHomeId)
    .is('deleted_at', null)
    .order('occurred_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(DASHBOARD_RECENT_ACTIVITY_LIMIT)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map(mapIncidentRowToRecord)
}

async function loadOpenIncidents(supabase: TypedSupabaseClient, careHomeId: string) {
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .eq('care_home_id', careHomeId)
    .in('status', ['open', 'reviewing'])
    .is('deleted_at', null)
    .order('occurred_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(DASHBOARD_OPEN_QUEUE_LIMIT)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map(mapIncidentRowToRecord)
}

async function loadRecentShiftReports(supabase: TypedSupabaseClient, careHomeId: string) {
  const { data, error } = await supabase
    .from('shift_reports')
    .select('*')
    .eq('care_home_id', careHomeId)
    .is('deleted_at', null)
    .order('shift_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(4)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map(mapShiftReportRowToRecord)
}

async function loadRecentMedications(supabase: TypedSupabaseClient, careHomeId: string) {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('care_home_id', careHomeId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(DASHBOARD_RECENT_MEDICATION_LIMIT)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map(mapMedicationRowToRecord)
}

async function loadRecentMedicationAlerts(supabase: TypedSupabaseClient, careHomeId: string) {
  const { data, error } = await supabase
    .from('medication_alerts')
    .select('*')
    .eq('care_home_id', careHomeId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(DASHBOARD_RECENT_MEDICATION_ALERT_LIMIT)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map(mapMedicationAlertRowToRecord)
}

async function loadOpenMedicationAlerts(supabase: TypedSupabaseClient, careHomeId: string) {
  const { data, error } = await supabase
    .from('medication_alerts')
    .select('*')
    .eq('care_home_id', careHomeId)
    .in('status', ['open', 'reviewing'])
    .is('deleted_at', null)
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(DASHBOARD_OPEN_QUEUE_LIMIT)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map(mapMedicationAlertRowToRecord)
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

  if (typeof item.membership_id !== 'string' || typeof item.user_id !== 'string' || !role) {
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
    description: [report.shiftType, report.summary.trim() ? truncateText(report.summary, 88) : 'No summary saved.'].join(' | '),
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
    description: [residentNameById.get(medication.residentId), medication.dosage || null, medication.frequency || null]
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
    description: [alert.residentId ? residentNameById.get(alert.residentId) : null, alert.message].filter(Boolean).join(' | '),
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
      subtitle: [task.category ? `Task: ${task.category}` : 'Open task', task.dueAt ? `Due ${formatShortDate(task.dueAt)}` : null]
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
    subtitle: [incident.status === 'reviewing' ? 'Review in progress' : 'Open incident', incident.location || null]
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
    subtitle: [alert.status === 'reviewing' ? 'Review required' : 'Open medication alert', alert.message]
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
        subtitle: [task.residentId ? residentNameById.get(task.residentId) : null, task.category ? `Task: ${task.category}` : null, `Priority: ${task.priority}`]
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
    subtitle: [incident.residentId ? residentNameById.get(incident.residentId) : null, incident.location || null, incident.status === 'reviewing' ? 'Needs review' : 'Open incident']
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
        subtitle: [alert.residentId ? residentNameById.get(alert.residentId) : null, alert.message].filter(Boolean).join(' | '),
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
  return item.status === 'overdue'
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






