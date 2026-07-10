import { measureServerStep } from '@/app/lib/perf'
import { getAuthenticatedAppContext } from '@/app/lib/authenticated-app'
import { getCurrentCareHomeResidents, type ResidentRecord } from '@/app/lib/supabase/residents'
import ResidentsClient from './ResidentsClient'

export default async function ResidentsPage() {
  return measureServerStep('route:/residents', async () => {
    const { access } = await getAuthenticatedAppContext()

    let residents: ResidentRecord[] = []
    let loadError: string | null = null

    try {
      residents = await getCurrentCareHomeResidents()
    } catch {
      loadError = 'Unable to load residents. Please refresh the page.'
    }

    return (
      <ResidentsClient
        key={residents.map((resident) => resident.id + ':' + resident.status).join('|')}
        initialResidents={residents}
        isAdmin={access.role === 'admin'}
        loadError={loadError}
      />
    )
  })
}
