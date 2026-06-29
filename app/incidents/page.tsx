import { redirect } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { getCurrentUserAccess } from '@/app/lib/supabase/access'
import {
  getCurrentCareHomeIncidents,
  type IncidentRecord,
} from '@/app/lib/supabase/incidents'
import { getCurrentCareHomeResidents, type ResidentRecord } from '@/app/lib/supabase/residents'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'
import IncidentsClient from './IncidentsClient'

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-v0-sans',
  subsets: ['latin'],
})

export default async function IncidentsPage() {
  const supabase = await getSupabaseServerClient()
  const access = await getCurrentUserAccess(supabase)

  if (!access.isSignedIn) {
    redirect('/auth/sign-in')
  }

  if (!access.hasCareHome) {
    redirect('/onboarding')
  }

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
    <div className={`${plusJakartaSans.variable} bg-background font-sans antialiased`}>
      <div className="v0-dashboard-theme dark">
        <IncidentsClient
          initialIncidents={incidents}
          activeResidents={residents.filter((resident) => resident.status !== 'archived')}
          canManageIncidents={access.role === 'admin' || access.role === 'nurse'}
          loadError={loadError}
          recentIncidentsCount={incidents.length}
        />
      </div>
    </div>
  )
}
