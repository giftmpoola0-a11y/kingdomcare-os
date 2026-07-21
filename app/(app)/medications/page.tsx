import { redirect } from 'next/navigation'
import { getAuthenticatedAppContext } from '@/app/lib/authenticated-app'
import { canManageMedicationsRole, getMembershipRoleFromAccess } from '@/app/lib/supabase/access'
import {
  getCurrentCareHomeResidentListItems,
  type ResidentListItem,
} from '@/app/lib/supabase/residents'
import {
  getCurrentCareHomeMedications,
  getCurrentCareHomeMedicationAlerts,
  type MedicationRecord,
  type MedicationAlertRecord,
} from '@/app/lib/supabase/medications'
import MedicationsClient from './MedicationsClient'

export default async function MedicationsPage() {
  const { access } = await getAuthenticatedAppContext()
  const membershipRole = getMembershipRoleFromAccess(access)
  const canManageMedications = canManageMedicationsRole(membershipRole)

  // Medications are hidden from caregivers entirely (nav already excludes
  // this route) - block direct URL access too, consistent with that
  // product decision.
  if (membershipRole === 'caregiver') {
    redirect('/staff')
  }

  let medications: MedicationRecord[] = []
  let alerts: MedicationAlertRecord[] = []
  let residents: ResidentListItem[] = []
  let loadError: string | null = null

  try {
    ;[medications, alerts, residents] = await Promise.all([
      getCurrentCareHomeMedications(),
      getCurrentCareHomeMedicationAlerts(),
      getCurrentCareHomeResidentListItems({ activeOnly: true }),
    ])
  } catch {
    loadError = 'Unable to load medications. Please refresh the page.'
  }

  return (
    <MedicationsClient
      initialMedications={medications}
      initialAlerts={alerts}
      activeResidents={residents}
      canManage={canManageMedications}
      loadError={loadError}
    />
  )
}

