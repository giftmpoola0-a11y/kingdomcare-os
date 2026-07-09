import { redirect } from 'next/navigation'
import { getAuthenticatedAppContext } from '@/app/lib/authenticated-app'
import {
  getRecentCurrentCareHomeIncidents,
  type IncidentRecord,
} from '@/app/lib/supabase/incidents'
import {
  getOpenCurrentCareHomeMedicationAlerts,
  type MedicationAlertRecord,
} from '@/app/lib/supabase/medications'
import {
  getActiveCurrentCareHomeResidents,
  getCurrentCareHomeResidents,
  type ResidentRecord,
} from '@/app/lib/supabase/residents'
import {
  getCurrentCareHomeShiftReports,
  type ShiftReportRecord,
} from '@/app/lib/supabase/shiftReports'
import { getOpenCurrentCareHomeTasks, type TaskRecord } from '@/app/lib/supabase/tasks'
import type { MembershipRole } from '@/app/lib/supabase/access'
import StaffClient from './StaffClient'

export default async function StaffPage() {
  const { access } = await getAuthenticatedAppContext()

  if (!access.role) {
    redirect('/onboarding')
  }

  let openTasks: TaskRecord[] = []
  let recentIncidents: IncidentRecord[] = []
  let medicationAlerts: MedicationAlertRecord[] = []
  let residents: ResidentRecord[] = []
  let activeResidents: ResidentRecord[] = []
  let recentShiftReports: ShiftReportRecord[] = []
  let loadError: string | null = null

  try {
    if (access.role === 'caregiver') {
      ;[openTasks, activeResidents, recentShiftReports] = await Promise.all([
        getOpenCurrentCareHomeTasks(),
        getActiveCurrentCareHomeResidents(),
        getCurrentCareHomeShiftReports(6),
      ])
      residents = activeResidents
    }

    if (access.role === 'nurse') {
      ;[medicationAlerts, recentIncidents, residents] = await Promise.all([
        getOpenCurrentCareHomeMedicationAlerts(),
        getRecentCurrentCareHomeIncidents(6),
        getCurrentCareHomeResidents(),
      ])
    }
  } catch (error) {
    console.error('Failed to load staff workspace data:', error)
    loadError = 'Unable to load staff workspace data. Please refresh the page.'
  }

  const residentNamesById = Object.fromEntries(
    residents.map((resident) => [resident.id, resident.name])
  ) as Record<string, string>

  return (
    <StaffClient
      role={access.role as MembershipRole}
      careHomeName={access.careHomeName}
      openTasks={openTasks}
      recentIncidents={recentIncidents}
      medicationAlerts={medicationAlerts}
      residentNamesById={residentNamesById}
      activeResidents={activeResidents}
      recentShiftReports={recentShiftReports}
      loadError={loadError}
      incidentCreateHref="/incidents/new"
    />
  )
}
