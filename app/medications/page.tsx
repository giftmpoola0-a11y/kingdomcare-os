import { redirect } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { getCurrentUserAccess } from '@/app/lib/supabase/access'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'
import { getCurrentCareHomeResidents, type ResidentRecord } from '@/app/lib/supabase/residents'
import {
  getCurrentCareHomeMedications,
  getCurrentCareHomeMedicationAlerts,
  type MedicationRecord,
  type MedicationAlertRecord,
} from '@/app/lib/supabase/medications'
import MedicationsClient from './MedicationsClient'

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-v0-sans',
  subsets: ['latin'],
})

export default async function MedicationsPage() {
  const supabase = await getSupabaseServerClient()
  const access = await getCurrentUserAccess(supabase)

  if (!access.isSignedIn) {
    redirect('/auth/sign-in')
  }

  if (!access.hasCareHome) {
    redirect('/onboarding')
  }

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

  const openMedicationAlertsCount = alerts.filter(
    (alert) => alert.status === 'open' || alert.status === 'reviewing',
  ).length

  return (
    <div className={`${plusJakartaSans.variable} bg-background font-sans antialiased`}>
      <div className="v0-dashboard-theme dark">
        <MedicationsClient
          initialMedications={medications}
          initialAlerts={alerts}
          activeResidents={residents.filter((r) => r.status !== 'archived')}
          canManage={access.role === 'admin' || access.role === 'nurse'}
          loadError={loadError}
          openMedicationAlertsCount={openMedicationAlertsCount}
        />
      </div>
    </div>
  )
}
