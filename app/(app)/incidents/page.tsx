import { measureServerStep } from '@/app/lib/perf'
import { getAuthenticatedAppContext } from '@/app/lib/authenticated-app'
import {
  getCurrentCareHomeIncidents,
  type IncidentRecord,
} from '@/app/lib/supabase/incidents'
import {
  getCurrentCareHomeResidentListItems,
  type ResidentListItem,
} from '@/app/lib/supabase/residents'
import IncidentsClient from './IncidentsClient'

export default async function IncidentsPage() {
  return measureServerStep('route:/incidents', async () => {
    const { access } = await getAuthenticatedAppContext()

    let incidents: IncidentRecord[] = []
    let residents: ResidentListItem[] = []
    let loadError: string | null = null

    try {
      ;[incidents, residents] = await Promise.all([
        getCurrentCareHomeIncidents(),
        getCurrentCareHomeResidentListItems({ activeOnly: true }),
      ])
    } catch {
      loadError = 'Unable to load incidents. Please refresh the page.'
    }

    return (
      <IncidentsClient
        initialIncidents={incidents}
        activeResidents={residents}
        canManageIncidents={access.role === 'admin' || access.role === 'nurse'}
        loadError={loadError}
      />
    )
  })
}
