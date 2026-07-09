import { getAuthenticatedAppContext } from '@/app/lib/authenticated-app'
import { getCurrentCareHomeResidents, type ResidentRecord } from '@/app/lib/supabase/residents'
import { getCurrentCareHomeTasks, type TaskRecord } from '@/app/lib/supabase/tasks'
import TasksClient from './TasksClient'

export default async function TasksPage() {
  const { access } = await getAuthenticatedAppContext()

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
    <TasksClient
      initialTasks={tasks}
      activeResidents={residents.filter((resident) => resident.status !== 'archived')}
      canManageTasks={access.role === 'admin' || access.role === 'nurse'}
      loadError={loadError}
    />
  )
}
