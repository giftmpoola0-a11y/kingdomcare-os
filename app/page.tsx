import { redirect } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { DashboardShell } from '@/components/kingdomos-v0/dashboard-shell'
import type { DashboardCareAttentionItem } from '@/components/kingdomos-v0/dashboard/care-attention'
import type { DashboardCareTeamMember } from '@/components/kingdomos-v0/dashboard/staff-on-duty'
import type { DashboardRecentActivityItem } from '@/components/kingdomos-v0/dashboard/recent-activity'
import type { DashboardOperationalQueueItem } from '@/components/kingdomos-v0/dashboard/today-glance'
import { getCurrentUserAccess, normalizeMembershipRole } from '@/app/lib/supabase/access'
import {
  getCurrentCareHomeIncidents,
  getOpenCurrentCareHomeIncidents,
  type IncidentRecord,
} from '@/app/lib/supabase/incidents'
import {
  getCurrentCareHomeMedicationAlerts,
  getCurrentCareHomeMedications,
  getOpenCurrentCareHomeMedicationAlerts,
  type MedicationAlertRecord,
  type MedicationRecord,
} from '@/app/lib/supabase/medications'
import {
  getActiveCurrentCareHomeResidents,
  getCurrentCareHomeResidents,
  getRecentCurrentCareHomeResidents,
  type ResidentActivityRecord,
  type ResidentRecord,
} from '@/app/lib/supabase/residents'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'
import { getCurrentCareHomeTasks, getOpenCurrentCareHomeTasks, type TaskRecord } from '@/app/lib/supabase/tasks'

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-v0-sans',
  subsets: ['latin'],
})

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient()
  const access = await getCurrentUserAccess(supabase)

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

  let activeResidentsCount = 0
  let openTasksCount = 0
  let medicationAlertsCount = 0
  let recentIncidentsCount = 0
  let recentActivityItems: DashboardRecentActivityItem[] = []
  let careAttentionItems: DashboardCareAttentionItem[] = []
  let operationalQueueItems: DashboardOperationalQueueItem[] = []
  let careTeamMembers: DashboardCareTeamMember[] = []

  try {
    const activeResidents = await getActiveCurrentCareHomeResidents()
    activeResidentsCount = activeResidents.length
  } catch (error) {
    console.error('Failed to load active residents count for dashboard:', error)
  }

  try {
    const openTasks = await getOpenCurrentCareHomeTasks()
    openTasksCount = openTasks.length
  } catch (error) {
    console.error('Failed to load open tasks count for dashboard:', error)
  }

  try {
    const openMedicationAlerts = await getOpenCurrentCareHomeMedicationAlerts()
    medicationAlertsCount = openMedicationAlerts.length
  } catch (error) {
    console.error('Failed to load medication alerts count for dashboard:', error)
  }

  try {
    const recentIncidents = await getCurrentCareHomeIncidents()
    recentIncidentsCount = Math.min(recentIncidents.length, 10)
  } catch (error) {
    console.error('Failed to load recent incidents count for dashboard:', error)
  }

  try {
    const { data: careTeamData, error } = await supabase.rpc('get_care_home_staff', {
      p_care_home_id: membership.careHomeId,
    })

    if (error) {
      throw new Error(error.message)
    }

    careTeamMembers = Array.isArray(careTeamData)
      ? careTeamData
          .map((member) => normalizeDashboardCareTeamMember(member))
          .filter((member): member is DashboardCareTeamMember => member !== null)
      : []
  } catch (error) {
    console.error('Failed to load care team members for dashboard:', error)
  }

  try {
    const [residents, recentResidents, tasks, incidents, medications, medicationAlerts] = await Promise.all([
      getCurrentCareHomeResidents(),
      getRecentCurrentCareHomeResidents(5),
      getCurrentCareHomeTasks(),
      getCurrentCareHomeIncidents(),
      getCurrentCareHomeMedications(),
      getCurrentCareHomeMedicationAlerts(),
    ])

    recentActivityItems = buildRecentActivityItems({
      residents,
      recentResidents,
      tasks,
      incidents,
      medications,
      medicationAlerts,
    })
  } catch (error) {
    console.error('Failed to load recent activity for dashboard:', error)
  }

  try {
    const [residents, openTasks, openIncidents, openMedicationAlerts] = await Promise.all([
      getCurrentCareHomeResidents(),
      getOpenCurrentCareHomeTasks(),
      getOpenCurrentCareHomeIncidents(),
      getOpenCurrentCareHomeMedicationAlerts(),
    ])

    careAttentionItems = buildCareAttentionItems({
      residents,
      openTasks,
      openIncidents,
      openMedicationAlerts,
    })

    operationalQueueItems = buildOperationalQueueItems({
      residents,
      openTasks,
      openIncidents,
      openMedicationAlerts,
    })
  } catch (error) {
    console.error('Failed to load operational queue for dashboard:', error)
  }

  return (
    <div className={`${plusJakartaSans.variable} bg-background font-sans antialiased`}>
      <div className="v0-dashboard-theme dark">
        <DashboardShell
          activeResidentsCount={activeResidentsCount}
          openTasksCount={openTasksCount}
          medicationAlertsCount={medicationAlertsCount}
          recentIncidentsCount={recentIncidentsCount}
          recentActivityItems={recentActivityItems}
          careAttentionItems={careAttentionItems}
          operationalQueueItems={operationalQueueItems}
          careTeamMembers={careTeamMembers}
        />
      </div>
    </div>
  )
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
  residents,
  recentResidents,
  tasks,
  incidents,
  medications,
  medicationAlerts,
}: {
  residents: ResidentRecord[]
  recentResidents: ResidentActivityRecord[]
  tasks: TaskRecord[]
  incidents: IncidentRecord[]
  medications: MedicationRecord[]
  medicationAlerts: MedicationAlertRecord[]
}): DashboardRecentActivityItem[] {
  const residentNameById = new Map(residents.map((resident) => [resident.id, resident.name]))

  const residentItems: DashboardRecentActivityItem[] = recentResidents.map((resident) => ({
    id: `resident-${resident.id}`,
    type: 'resident',
    title: `Resident added: ${resident.name}`,
    description: resident.status === 'archived' ? 'Resident record was later archived.' : 'New resident record created.',
    timestamp: resident.createdAt,
    tone: resident.status === 'archived' ? 'gray' : 'green',
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
      .join(' · ') || 'Task activity recorded.',
    timestamp: task.completedAt ?? task.updatedAt ?? task.createdAt,
    tone: task.status === 'completed' ? 'green' : task.status === 'archived' ? 'gray' : 'amber',
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
      .join(' · ') || 'Incident activity recorded.',
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
      .join(' · ') || 'Medication record updated.',
    timestamp: medication.updatedAt ?? medication.createdAt,
    tone:
      medication.status === 'active'
        ? 'green'
        : medication.status === 'paused'
          ? 'amber'
          : medication.status === 'discontinued'
            ? 'red'
            : 'gray',
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
      .join(' · '),
    timestamp: alert.resolvedAt ?? alert.updatedAt ?? alert.createdAt,
    tone:
      alert.status === 'resolved'
        ? 'green'
        : alert.status === 'archived'
          ? 'gray'
          : alert.severity === 'high' || alert.severity === 'critical'
            ? 'red'
            : 'amber',
  }))

  return [...residentItems, ...taskItems, ...incidentItems, ...medicationItems, ...alertItems]
    .filter((item) => item.timestamp)
    .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp))
    .slice(0, 5)
}

function buildCareAttentionItems({
  residents,
  openTasks,
  openIncidents,
  openMedicationAlerts,
}: {
  residents: ResidentRecord[]
  openTasks: TaskRecord[]
  openIncidents: IncidentRecord[]
  openMedicationAlerts: MedicationAlertRecord[]
}): DashboardCareAttentionItem[] {
  const residentNameById = new Map(residents.map((resident) => [resident.id, resident.name]))

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
        .join(' · '),
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
      .join(' · '),
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
      .join(' · '),
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
  residents,
  openTasks,
  openIncidents,
  openMedicationAlerts,
}: {
  residents: ResidentRecord[]
  openTasks: TaskRecord[]
  openIncidents: IncidentRecord[]
  openMedicationAlerts: MedicationAlertRecord[]
}): DashboardOperationalQueueItem[] {
  const residentNameById = new Map(residents.map((resident) => [resident.id, resident.name]))
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
          .join(' · '),
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
      .join(' · '),
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
          .join(' · '),
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
