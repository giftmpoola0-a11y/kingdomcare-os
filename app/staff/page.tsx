import { redirect } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { getCurrentUserAccess, type MembershipRole } from '@/app/lib/supabase/access'
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
import { getSupabaseServerClient } from '@/app/lib/supabase/server'
import {
  EMPTY_SIDEBAR_BADGE_COUNTS,
  getCurrentCareHomeSidebarBadgeCounts,
} from '@/app/lib/supabase/sidebar-badge-counts'
import {
  getCurrentCareHomeShiftReports,
  type ShiftReportRecord,
} from '@/app/lib/supabase/shiftReports'
import { getOpenCurrentCareHomeTasks, type TaskRecord } from '@/app/lib/supabase/tasks'
import StaffClient from './StaffClient'

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-v0-sans',
  subsets: ['latin'],
})

export default async function StaffPage() {
  const supabase = await getSupabaseServerClient()
  const access = await getCurrentUserAccess(supabase)

  if (!access.isSignedIn) {
    redirect('/auth/sign-in')
  }

  if (!access.hasCareHome || !access.membership || !access.role) {
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

  let sidebarBadgeCounts = EMPTY_SIDEBAR_BADGE_COUNTS

  try {
    sidebarBadgeCounts = await getCurrentCareHomeSidebarBadgeCounts()
  } catch (error) {
    console.error('Failed to load sidebar badge counts for staff page:', error)
  }

  const residentNamesById = Object.fromEntries(
    residents.map((resident) => [resident.id, resident.name])
  ) as Record<string, string>

  return (
    <div className={`${plusJakartaSans.variable} bg-background font-sans antialiased`}>
      <div className="v0-dashboard-theme dark">
        <StaffClient
          role={access.role as MembershipRole}
          careHomeName={access.careHomeName}
          openTasks={openTasks}
          recentIncidents={recentIncidents}
          medicationAlerts={medicationAlerts}
          residentNamesById={residentNamesById}
          activeResidents={activeResidents}
          recentShiftReports={recentShiftReports}
          sidebarBadgeCounts={sidebarBadgeCounts}
          loadError={loadError}
          incidentCreateHref={null}
        />
      </div>
    </div>
  )
}
