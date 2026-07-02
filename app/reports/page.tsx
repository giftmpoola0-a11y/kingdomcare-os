import { redirect } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { getCurrentUserAccess } from '@/app/lib/supabase/access'
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
import { getSupabaseServerClient } from '@/app/lib/supabase/server'
import {
  EMPTY_SIDEBAR_BADGE_COUNTS,
  getCurrentCareHomeSidebarBadgeCounts,
} from '@/app/lib/supabase/sidebar-badge-counts'
import { getCurrentCareHomeTasks, type TaskRecord } from '@/app/lib/supabase/tasks'
import ReportsClient from './ReportsClient'

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-v0-sans',
  subsets: ['latin'],
})

export default async function ReportsPage() {
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

  let sidebarBadgeCounts = EMPTY_SIDEBAR_BADGE_COUNTS

  try {
    sidebarBadgeCounts = await getCurrentCareHomeSidebarBadgeCounts()
  } catch (error) {
    console.error('Failed to load sidebar badge counts for reports:', error)
  }

  return (
    <div className={`${plusJakartaSans.variable} bg-background font-sans antialiased`}>
      <div className="v0-dashboard-theme dark">
        <ReportsClient
          residents={residents}
          activeResidentsCount={activeResidentsCount}
          tasks={tasks}
          incidents={incidents}
          medicationAlerts={medicationAlerts}
          careTeamMembersCount={careTeamMembersCount}
          sidebarBadgeCounts={sidebarBadgeCounts}
          loadError={loadError}
        />
      </div>
    </div>
  )
}
