import { measureServerStep } from '@/app/lib/perf'
import { getAuthenticatedAppContext } from '@/app/lib/authenticated-app'
import {
  getCurrentCareHomeResidentListItems,
  type ResidentListItem,
} from '@/app/lib/supabase/residents'
import { getCurrentCareHomeTasks, type TaskRecord } from '@/app/lib/supabase/tasks'
import TasksClient from './TasksClient'

export default async function TasksPage() {
  return measureServerStep('route:/tasks', async () => {
    const { access } = await getAuthenticatedAppContext()

    let tasks: TaskRecord[] = []
    let residents: ResidentListItem[] = []
    let loadError: string | null = null

    try {
      ;[tasks, residents] = await Promise.all([
        getCurrentCareHomeTasks(),
        getCurrentCareHomeResidentListItems({ activeOnly: true }),
      ])
    } catch {
      loadError = 'Unable to load tasks. Please refresh the page.'
    }

    return (
      <TasksClient
        initialTasks={tasks}
        activeResidents={residents}
        canManageTasks={access.role === 'admin' || access.role === 'nurse'}
        loadError={loadError}
      />
    )
  })
}
