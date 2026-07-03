import { redirect } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { getCurrentUserAccess } from '@/app/lib/supabase/access'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'
import {
  EMPTY_SIDEBAR_BADGE_COUNTS,
  getCurrentCareHomeSidebarBadgeCounts,
} from '@/app/lib/supabase/sidebar-badge-counts'
import StaffManagementClient from './StaffManagementClient'

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-v0-sans',
  subsets: ['latin'],
})

export default async function StaffManagementPage() {
  const supabase = await getSupabaseServerClient()
  const access = await getCurrentUserAccess(supabase)

  if (!access.isSignedIn) {
    redirect('/auth/sign-in')
  }

  if (!access.hasCareHome || !access.membership) {
    redirect('/onboarding')
  }

  if (access.role !== 'admin') {
    redirect('/staff')
  }

  let sidebarBadgeCounts = EMPTY_SIDEBAR_BADGE_COUNTS

  try {
    sidebarBadgeCounts = await getCurrentCareHomeSidebarBadgeCounts()
  } catch (error) {
    console.error('Failed to load sidebar badge counts for staff management:', error)
  }

  return (
    <div className={`${plusJakartaSans.variable} bg-background font-sans antialiased`}>
      <div className="v0-dashboard-theme dark">
        <StaffManagementClient sidebarBadgeCounts={sidebarBadgeCounts} />
      </div>
    </div>
  )
}
