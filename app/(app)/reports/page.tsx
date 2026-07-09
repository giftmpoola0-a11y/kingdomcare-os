import { getAuthenticatedAppContext } from '@/app/lib/authenticated-app'
import { getCurrentCareHomeIncidents, type IncidentRecord } from '@/app/lib/supabase/incidents'
import {
  getCurrentCareHomeMedicationAlerts,
  type MedicationAlertRecord,
} from '@/app/lib/supabase/medications'
import {
  getActiveCurrentCareHomeResidents,
  getCurrentCareHomeResidents,
  type ResidentRecord,
} from '@/app/lib/supabase/residents'
import { getCurrentCareHomeTasks, type TaskRecord } from '@/app/lib/supabase/tasks'
import ReportsClient from './ReportsClient'

export default async function ReportsPage() {
  const { supabase, access } = await getAuthenticatedAppContext()
  const membership = access.membership!

  let residents: ResidentRecord[] = []
  let activeResidentsCount = 0
  let tasks: TaskRecord[] = []
  let incidents: IncidentRecord[] = []
  let medicationAlerts: MedicationAlertRecord[] = []
  let loadError: string | null = null

  try {
    const [activeResidents, allResidents, allTasks, allIncidents, allMedicationAlerts] = await Promise.all([
      getActiveCurrentCareHomeResidents(),
      getCurrentCareHomeResidents(),
      getCurrentCareHomeTasks(),
      getCurrentCareHomeIncidents(),
      getCurrentCareHomeMedicationAlerts(),
    ])

    activeResidentsCount = activeResidents.length
    residents = allResidents
    tasks = allTasks
    incidents = allIncidents
    medicationAlerts = allMedicationAlerts
  } catch (error) {
    console.error('Failed to load report data:', error)
    loadError = 'Unable to load report data. Please refresh the page.'
  }

  let careTeamMembersCount = 0

  try {
    const { data: careTeamData, error } = await supabase.rpc('get_care_home_staff', {
      p_care_home_id: membership.careHomeId,
    })

    if (error) {
      throw new Error(error.message)
    }

    careTeamMembersCount = Array.isArray(careTeamData) ? careTeamData.length : 0
  } catch (error) {
    console.error('Failed to load care team members for reports:', error)
  }

  return (
    <ReportsClient
      residents={residents}
      activeResidentsCount={activeResidentsCount}
      tasks={tasks}
      incidents={incidents}
      medicationAlerts={medicationAlerts}
      careTeamMembersCount={careTeamMembersCount}
      loadError={loadError}
    />
  )
}


