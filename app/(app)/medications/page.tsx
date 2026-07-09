import { getAuthenticatedAppContext } from '@/app/lib/authenticated-app'
import { getCurrentCareHomeResidents, type ResidentRecord } from '@/app/lib/supabase/residents'
import {
  getCurrentCareHomeMedications,
  getCurrentCareHomeMedicationAlerts,
  type MedicationRecord,
  type MedicationAlertRecord,
} from '@/app/lib/supabase/medications'
import MedicationsClient from './MedicationsClient'

export default async function MedicationsPage() {
  const { access } = await getAuthenticatedAppContext()

  let medications: MedicationRecord[] = []
  let alerts: MedicationAlertRecord[] = []
  let residents: ResidentRecord[] = []
  let loadError: string | null = null

  try {
    ;[medications, alerts, residents] = await Promise.all([
      getCurrentCareHomeMedications(),
      getCurrentCareHomeMedicationAlerts(),
      getCurrentCareHomeResidents(),
    ])
  } catch {
    loadError = 'Unable to load medications. Please refresh the page.'
  }

  return (
    <MedicationsClient
      initialMedications={medications}
      initialAlerts={alerts}
      activeResidents={residents.filter((r) => r.status !== 'archived')}
      canManage={access.role === 'admin' || access.role === 'nurse'}
      loadError={loadError}
    />
  )
}
