import { redirect } from 'next/navigation'
import {
  buildMedicationAlarmsPayload,
  type MedicationAlarmItem,
} from '@/app/lib/chrome-medication-alarms'
import { measureServerStep } from '@/app/lib/perf'
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
  getCurrentCareHomeResidentListItems,
  type ResidentListItem,
  type ResidentRecord,
} from '@/app/lib/supabase/residents'
import {
  getCurrentCareHomeShiftReports,
  type ShiftReportRecord,
} from '@/app/lib/supabase/shiftReports'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'
import { getOpenCurrentCareHomeTasks, type TaskRecord } from '@/app/lib/supabase/tasks'
import type { MembershipRole } from '@/app/lib/supabase/access'
import StaffClient from './StaffClient'

export default async function StaffPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  return measureServerStep('route:/staff', async () => {
    const { access } = await getAuthenticatedAppContext()
    const resolvedSearchParams = (await searchParams) ?? {}
    const focusParam = Array.isArray(resolvedSearchParams.focus)
      ? resolvedSearchParams.focus[0]
      : resolvedSearchParams.focus
    const highlightMedicationReminders = focusParam === 'medications'

    if (!access.role) {
      redirect('/onboarding')
    }

    let openTasks: TaskRecord[] = []
    let recentIncidents: IncidentRecord[] = []
    let medicationAlerts: MedicationAlertRecord[] = []
    let residents: ResidentListItem[] = []
    let activeResidents: ResidentRecord[] = []
    let recentShiftReports: ShiftReportRecord[] = []
    let caregiverMedicationReminders: MedicationAlarmItem[] = []
    let loadError: string | null = null

    try {
      if (access.role === 'caregiver') {
        const supabase = await getSupabaseServerClient()
        ;[openTasks, activeResidents, recentShiftReports, caregiverMedicationReminders] = await Promise.all([
          getOpenCurrentCareHomeTasks(),
          getActiveCurrentCareHomeResidents(),
          getCurrentCareHomeShiftReports(6),
          buildMedicationAlarmsPayload(supabase, access).then((payload) => payload.items),
        ])
        residents = activeResidents
      }

      if (access.role === 'nurse') {
        ;[medicationAlerts, recentIncidents, residents] = await Promise.all([
          getOpenCurrentCareHomeMedicationAlerts(),
          getRecentCurrentCareHomeIncidents(6),
          getCurrentCareHomeResidentListItems({ activeOnly: true }),
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
        caregiverMedicationReminders={caregiverMedicationReminders}
        highlightMedicationReminders={highlightMedicationReminders}
        loadError={loadError}
        incidentCreateHref="/incidents/new"
      />
    )
  })
}

