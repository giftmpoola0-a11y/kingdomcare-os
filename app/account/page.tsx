import { redirect } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { getCurrentUserAccess } from '@/app/lib/supabase/access'
import { getAppChromeProps } from '@/app/lib/app-chrome'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'
import {
  EMPTY_SIDEBAR_BADGE_COUNTS,
  getCurrentCareHomeSidebarBadgeCounts,
} from '@/app/lib/supabase/sidebar-badge-counts'
import AccountClient from './AccountClient'

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-v0-sans',
  subsets: ['latin'],
})

export default async function AccountPage() {
  const supabase = await getSupabaseServerClient()
  const access = await getCurrentUserAccess(supabase)

  if (!access.isSignedIn) {
    redirect('/auth/sign-in')
  }

  if (!access.hasCareHome || !access.membership) {
    redirect('/onboarding')
  }

  let sidebarBadgeCounts = EMPTY_SIDEBAR_BADGE_COUNTS

  try {
    sidebarBadgeCounts = await getCurrentCareHomeSidebarBadgeCounts(access, supabase)
  } catch (error) {
    console.error('Failed to load sidebar badge counts for account page:', error)
  }

  return (
    <div className={`${plusJakartaSans.variable} bg-background font-sans antialiased`}>
      <div className="v0-dashboard-theme dark">
        <AccountClient {...getAppChromeProps(access)} sidebarBadgeCounts={sidebarBadgeCounts} />
      </div>
    </div>
  )
}
