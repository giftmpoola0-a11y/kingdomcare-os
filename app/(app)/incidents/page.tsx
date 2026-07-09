import { getAuthenticatedAppContext } from '@/app/lib/authenticated-app'
import {
  getCurrentCareHomeIncidents,
  type IncidentRecord,
} from '@/app/lib/supabase/incidents'
import { getCurrentCareHomeResidents, type ResidentRecord } from '@/app/lib/supabase/residents'
import IncidentsClient from './IncidentsClient'

export default async function IncidentsPage() {
  const { access } = await getAuthenticatedAppContext()

  let incidents: IncidentRecord[] = []
  let residents: ResidentRecord[] = []
  let loadError: string | null = null

  try {
    ;[incidents, residents] = await Promise.all([
      getCurrentCareHomeIncidents(),
      getCurrentCareHomeResidents(),
    ])
  } catch {
    loadError = 'Unable to load incidents. Please refresh the page.'
  }

  return (
    <IncidentsClient
      initialIncidents={incidents}
      activeResidents={residents.filter((resident) => resident.status !== 'archived')}
      canManageIncidents={access.role === 'admin' || access.role === 'nurse'}
      loadError={loadError}
    />
  )
}
