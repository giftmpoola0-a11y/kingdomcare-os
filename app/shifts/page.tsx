import { redirect } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { getCurrentUserAccess } from '@/app/lib/supabase/access'
import { getAppChromeProps } from '@/app/lib/app-chrome'
import {
  getCurrentCareHomeShiftReports,
  type ShiftReportRecord,
} from '@/app/lib/supabase/shiftReports'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'
import {
  EMPTY_SIDEBAR_BADGE_COUNTS,
  getCurrentCareHomeSidebarBadgeCounts,
} from '@/app/lib/supabase/sidebar-badge-counts'
import ShiftsClient from './ShiftsClient'

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-v0-sans',
  subsets: ['latin'],
})

export default async function ShiftsPage() {
  const supabase = await getSupabaseServerClient()
  const access = await getCurrentUserAccess(supabase)

  if (!access.isSignedIn) {
    redirect('/auth/sign-in')
  }

  if (!access.hasCareHome) {
    redirect('/onboarding')
  }

  let shiftReports: ShiftReportRecord[] = []
  let loadError: string | null = null
  let sidebarBadgeCounts = EMPTY_SIDEBAR_BADGE_COUNTS

  try {
    ;[shiftReports, sidebarBadgeCounts] = await Promise.all([
      getCurrentCareHomeShiftReports(),
      getCurrentCareHomeSidebarBadgeCounts(access, supabase),
    ])
  } catch (error) {
    console.error('Failed to load shift reports:', error)
    loadError = 'Unable to load shift reports. Please refresh the page.'
    try {
      sidebarBadgeCounts = await getCurrentCareHomeSidebarBadgeCounts(access, supabase)
    } catch (sidebarError) {
      console.error('Failed to load sidebar badge counts for shifts page:', sidebarError)
    }
  }

  return (
    <div className={`${plusJakartaSans.variable} bg-background font-sans antialiased`}>
      <div className="v0-dashboard-theme dark">
        <ShiftsClient
          {...getAppChromeProps(access)}
          shiftReports={shiftReports}
          sidebarBadgeCounts={sidebarBadgeCounts}
          loadError={loadError}
        />
      </div>
    </div>
  )
}
