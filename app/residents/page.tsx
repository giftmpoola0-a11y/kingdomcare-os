import { redirect } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'
import { getCurrentUserAccess } from '@/app/lib/supabase/access'
import { getCurrentCareHomeResidents, type ResidentRecord } from '@/app/lib/supabase/residents'
import {
  EMPTY_SIDEBAR_BADGE_COUNTS,
  getCurrentCareHomeSidebarBadgeCounts,
} from '@/app/lib/supabase/sidebar-badge-counts'
import ResidentsClient from './ResidentsClient'

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-v0-sans',
  subsets: ['latin'],
})

export default async function ResidentsPage() {
  const supabase = await getSupabaseServerClient()
  const access = await getCurrentUserAccess(supabase)

  if (!access.isSignedIn) {
    redirect('/auth/sign-in')
  }

  if (!access.hasCareHome) {
    redirect('/onboarding')
  }

  let residents: ResidentRecord[] = []
  let loadError: string | null = null
  let sidebarBadgeCounts = EMPTY_SIDEBAR_BADGE_COUNTS

  try {
    residents = await getCurrentCareHomeResidents()
  } catch {
    loadError = 'Unable to load residents. Please refresh the page.'
  }

  try {
    sidebarBadgeCounts = await getCurrentCareHomeSidebarBadgeCounts()
  } catch (error) {
    console.error('Failed to load sidebar badge counts for residents page:', error)
  }

  return (
    <div className={`${plusJakartaSans.variable} bg-background font-sans antialiased`}>
      <div className="v0-dashboard-theme dark">
        <ResidentsClient
          initialResidents={residents}
          isAdmin={access.role === 'admin'}
          loadError={loadError}
          sidebarBadgeCounts={sidebarBadgeCounts}
        />
      </div>
    </div>
  )
}
