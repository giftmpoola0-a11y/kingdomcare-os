import { redirect } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { DashboardShell } from '@/components/kingdomos-v0/dashboard-shell'
import type { DashboardRecentActivityItem } from '@/components/kingdomos-v0/dashboard/recent-activity'
import { getCurrentUserAccess } from '@/app/lib/supabase/access'
import {
  getCurrentCareHomeIncidents,
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

  let activeResidentsCount = 0
  let openTasksCount = 0
  let medicationAlertsCount = 0
  let recentIncidentsCount = 0
  let recentActivityItems: DashboardRecentActivityItem[] = []

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

  return (
    <div className={`${plusJakartaSans.variable} bg-background font-sans antialiased`}>
      <div className="v0-dashboard-theme dark">
        <DashboardShell
          activeResidentsCount={activeResidentsCount}
          openTasksCount={openTasksCount}
          medicationAlertsCount={medicationAlertsCount}
          recentIncidentsCount={recentIncidentsCount}
          recentActivityItems={recentActivityItems}
        />
      </div>
    </div>
  )
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
