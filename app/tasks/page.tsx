import { redirect } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { getCurrentUserAccess } from '@/app/lib/supabase/access'
import { getCurrentCareHomeResidents, type ResidentRecord } from '@/app/lib/supabase/residents'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'
import {
  EMPTY_SIDEBAR_BADGE_COUNTS,
  getCurrentCareHomeSidebarBadgeCounts,
} from '@/app/lib/supabase/sidebar-badge-counts'
import { getCurrentCareHomeTasks, type TaskRecord } from '@/app/lib/supabase/tasks'
import TasksClient from './TasksClient'

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-v0-sans',
  subsets: ['latin'],
})

export default async function TasksPage() {
  const supabase = await getSupabaseServerClient()
  const access = await getCurrentUserAccess(supabase)

  if (!access.isSignedIn) {
    redirect('/auth/sign-in')
  }

  if (!access.hasCareHome) {
    redirect('/onboarding')
  }

  let tasks: TaskRecord[] = []
  let residents: ResidentRecord[] = []
  let loadError: string | null = null
  let sidebarBadgeCounts = EMPTY_SIDEBAR_BADGE_COUNTS

  try {
    ;[tasks, residents] = await Promise.all([
      getCurrentCareHomeTasks(),
      getCurrentCareHomeResidents(),
    ])
  } catch {
    loadError = 'Unable to load tasks. Please refresh the page.'
  }

  try {
    sidebarBadgeCounts = await getCurrentCareHomeSidebarBadgeCounts()
  } catch (error) {
    console.error('Failed to load sidebar badge counts for tasks page:', error)
  }

  return (
    <div className={`${plusJakartaSans.variable} bg-background font-sans antialiased`}>
      <div className="v0-dashboard-theme dark">
        <TasksClient
          initialTasks={tasks}
          activeResidents={residents.filter((resident) => resident.status !== 'archived')}
          canManageTasks={access.role === 'admin' || access.role === 'nurse'}
          loadError={loadError}
          sidebarBadgeCounts={sidebarBadgeCounts}
        />
      </div>
    </div>
  )
}
