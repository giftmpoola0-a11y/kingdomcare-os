import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'
import { getCurrentUserAccess } from '@/app/lib/supabase/access'
import { getAppChromeProps } from '@/app/lib/app-chrome'
import { dashboardFont } from '@/app/lib/dashboard-font'
import { getCurrentCareHomeResidents, type ResidentRecord } from '@/app/lib/supabase/residents'
import {
  EMPTY_SIDEBAR_BADGE_COUNTS,
  getCurrentCareHomeSidebarBadgeCounts,
} from '@/app/lib/supabase/sidebar-badge-counts'
import ResidentsClient from './ResidentsClient'


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
    ;[residents, sidebarBadgeCounts] = await Promise.all([
      getCurrentCareHomeResidents(),
      getCurrentCareHomeSidebarBadgeCounts(access, supabase),
    ])
  } catch {
    loadError = 'Unable to load residents. Please refresh the page.'
    try {
      sidebarBadgeCounts = await getCurrentCareHomeSidebarBadgeCounts(access, supabase)
    } catch (error) {
      console.error('Failed to load sidebar badge counts for residents page:', error)
    }
  }

  return (
    <div className={`${dashboardFont.variable} bg-background font-sans antialiased`}>
      <div className="v0-dashboard-theme dark">
        <ResidentsClient
          key={residents.map((resident) => resident.id + ':' + resident.status).join('|')}
          {...getAppChromeProps(access)}
          initialResidents={residents}
          isAdmin={access.role === 'admin'}
          loadError={loadError}
          sidebarBadgeCounts={sidebarBadgeCounts}
        />
      </div>
    </div>
  )
}




