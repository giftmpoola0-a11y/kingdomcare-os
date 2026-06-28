import { redirect } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { getCurrentUserAccess } from '@/app/lib/supabase/access'
import { getCurrentCareHomeResidents, type ResidentRecord } from '@/app/lib/supabase/residents'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'
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

  try {
    ;[tasks, residents] = await Promise.all([
      getCurrentCareHomeTasks(),
      getCurrentCareHomeResidents(),
    ])
  } catch {
    loadError = 'Unable to load tasks. Please refresh the page.'
  }

  return (
    <div className={`${plusJakartaSans.variable} bg-background font-sans antialiased`}>
      <div className="v0-dashboard-theme dark">
        <TasksClient
          initialTasks={tasks}
          activeResidents={residents.filter((resident) => resident.status !== 'archived')}
          canManageTasks={access.role === 'admin' || access.role === 'nurse'}
          loadError={loadError}
        />
      </div>
    </div>
  )
}
