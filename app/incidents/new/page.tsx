import { redirect } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { getCurrentUserAccess } from '@/app/lib/supabase/access'
import { getActiveCurrentCareHomeResidents, type ResidentRecord } from '@/app/lib/supabase/residents'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'
import {
  EMPTY_SIDEBAR_BADGE_COUNTS,
  getCurrentCareHomeSidebarBadgeCounts,
} from '@/app/lib/supabase/sidebar-badge-counts'
import NewIncidentClient from './NewIncidentClient'

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-v0-sans',
  subsets: ['latin'],
})

export default async function NewIncidentPage() {
  const supabase = await getSupabaseServerClient()
  const access = await getCurrentUserAccess(supabase)

  if (!access.isSignedIn) {
    redirect('/auth/sign-in')
  }

  if (!access.hasCareHome) {
    redirect('/onboarding')
  }

  let activeResidents: ResidentRecord[] = []
  let loadError: string | null = null

  try {
    activeResidents = await getActiveCurrentCareHomeResidents()
  } catch (error) {
    console.error('Failed to load residents for new incident:', error)
    loadError = 'Unable to load residents. You can still log a general incident if needed.'
  }

  let sidebarBadgeCounts = EMPTY_SIDEBAR_BADGE_COUNTS

  try {
    sidebarBadgeCounts = await getCurrentCareHomeSidebarBadgeCounts()
  } catch (error) {
    console.error('Failed to load sidebar badge counts for new incident:', error)
  }

  return (
    <div className={`${plusJakartaSans.variable} bg-background font-sans antialiased`}>
      <div className="v0-dashboard-theme dark">
        <NewIncidentClient
          activeResidents={activeResidents}
          loadError={loadError}
          sidebarBadgeCounts={sidebarBadgeCounts}
        />
      </div>
    </div>
  )
}
