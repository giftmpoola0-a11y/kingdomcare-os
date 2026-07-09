import { getAuthenticatedAppContext } from '@/app/lib/authenticated-app'
import { getActiveCurrentCareHomeResidents, type ResidentRecord } from '@/app/lib/supabase/residents'
import NewIncidentClient from './NewIncidentClient'

export default async function NewIncidentPage() {
  await getAuthenticatedAppContext()

  let activeResidents: ResidentRecord[] = []
  let loadError: string | null = null

  try {
    activeResidents = await getActiveCurrentCareHomeResidents()
  } catch (error) {
    console.error('Failed to load residents for new incident:', error)
    loadError = 'Unable to load residents. You can still log a general incident if needed.'
  }

  return <NewIncidentClient activeResidents={activeResidents} loadError={loadError} />
}
