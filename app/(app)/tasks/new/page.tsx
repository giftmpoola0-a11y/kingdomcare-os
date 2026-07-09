import { redirect } from 'next/navigation'
import { getAuthenticatedAppContext } from '@/app/lib/authenticated-app'
import { getActiveCurrentCareHomeResidents, type ResidentRecord } from '@/app/lib/supabase/residents'
import NewTaskClient from './NewTaskClient'

export default async function NewTaskPage() {
  const { access } = await getAuthenticatedAppContext()

  if (access.role !== 'admin' && access.role !== 'nurse') {
    redirect('/tasks')
  }

  let activeResidents: ResidentRecord[] = []
  let loadError: string | null = null

  try {
    activeResidents = await getActiveCurrentCareHomeResidents()
  } catch (error) {
    console.error('Failed to load residents for new task:', error)
    loadError = 'Unable to load residents. You can still save a general care-home task if needed.'
  }

  return <NewTaskClient activeResidents={activeResidents} loadError={loadError} />
}
