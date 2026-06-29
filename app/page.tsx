import { redirect } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { DashboardShell } from '@/components/kingdomos-v0/dashboard-shell'
import { getCurrentUserAccess } from '@/app/lib/supabase/access'
import { getActiveCurrentCareHomeResidents } from '@/app/lib/supabase/residents'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'
import { getOpenCurrentCareHomeTasks } from '@/app/lib/supabase/tasks'
import { getRecentCurrentCareHomeIncidents } from '@/app/lib/supabase/incidents'

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
  let recentIncidentsCount = 0

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
    const recentIncidents = await getRecentCurrentCareHomeIncidents()
    recentIncidentsCount = recentIncidents.length
  } catch (error) {
    console.error('Failed to load recent incidents count for dashboard:', error)
  }

  return (
    <div className={`${plusJakartaSans.variable} bg-background font-sans antialiased`}>
      <div className="v0-dashboard-theme dark">
        <DashboardShell
          activeResidentsCount={activeResidentsCount}
          openTasksCount={openTasksCount}
          recentIncidentsCount={recentIncidentsCount}
        />
      </div>
    </div>
  )
}
