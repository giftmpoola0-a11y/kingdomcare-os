import { Plus_Jakarta_Sans } from 'next/font/google'
import { notFound, redirect } from 'next/navigation'
import { getCurrentUserAccess } from '@/app/lib/supabase/access'
import { getAppChromeProps } from '@/app/lib/app-chrome'
import {
  getCurrentCareHomeShiftReportById,
  type ShiftReportRecord,
} from '@/app/lib/supabase/shiftReports'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'
import {
  EMPTY_SIDEBAR_BADGE_COUNTS,
  getCurrentCareHomeSidebarBadgeCounts,
} from '@/app/lib/supabase/sidebar-badge-counts'
import ShiftReportDetailClient from './ShiftReportDetailClient'

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-v0-sans',
  subsets: ['latin'],
})

export default async function ShiftReportDetailPage(props: PageProps<'/shifts/[shiftReportId]'>) {
  const { shiftReportId } = await props.params
  const supabase = await getSupabaseServerClient()
  const access = await getCurrentUserAccess(supabase)

  if (!access.isSignedIn) {
    redirect('/auth/sign-in')
  }

  if (!access.hasCareHome) {
    redirect('/onboarding')
  }

  let shiftReport: ShiftReportRecord | null = null

  try {
    shiftReport = await getCurrentCareHomeShiftReportById(shiftReportId)
  } catch (error) {
    console.error('Failed to load shift report detail:', error)
    notFound()
  }

  if (!shiftReport) {
    notFound()
  }

  let sidebarBadgeCounts = EMPTY_SIDEBAR_BADGE_COUNTS

  try {
    sidebarBadgeCounts = await getCurrentCareHomeSidebarBadgeCounts()
  } catch (error) {
    console.error('Failed to load sidebar badge counts for shift report detail:', error)
  }

  return (
    <div className={`${plusJakartaSans.variable} bg-background font-sans antialiased`}>
      <div className="v0-dashboard-theme dark">
        <ShiftReportDetailClient
          {...getAppChromeProps(access)}
          shiftReport={shiftReport}
          sidebarBadgeCounts={sidebarBadgeCounts}
        />
      </div>
    </div>
  )
}
