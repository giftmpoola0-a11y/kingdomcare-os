import { Plus_Jakarta_Sans } from 'next/font/google'
import { redirect } from 'next/navigation'
import { getCurrentUserAccess } from '@/app/lib/supabase/access'
import { getResidentById, type ResidentRecord } from '@/app/lib/supabase/residents'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'
import {
  EMPTY_SIDEBAR_BADGE_COUNTS,
  getCurrentCareHomeSidebarBadgeCounts,
} from '@/app/lib/supabase/sidebar-badge-counts'
import ResidentDetailClient from './ResidentDetailClient'

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-v0-sans',
  subsets: ['latin'],
})

export default async function ResidentDetailPage(props: PageProps<'/residents/[residentId]'>) {
  const { residentId } = await props.params
  const supabase = await getSupabaseServerClient()
  const access = await getCurrentUserAccess(supabase)

  if (!access.isSignedIn) {
    redirect('/auth/sign-in')
  }

  if (!access.hasCareHome) {
    redirect('/onboarding')
  }

  let resident: ResidentRecord | null = null

  try {
    resident = await getResidentById(residentId)
  } catch (error) {
    console.error('Failed to load resident detail:', error)
  }

  let sidebarBadgeCounts = EMPTY_SIDEBAR_BADGE_COUNTS

  try {
    sidebarBadgeCounts = await getCurrentCareHomeSidebarBadgeCounts()
  } catch (error) {
    console.error('Failed to load sidebar badge counts for resident detail:', error)
  }

  return (
    <div className={`${plusJakartaSans.variable} bg-background font-sans antialiased`}>
      <div className="v0-dashboard-theme dark">
        <ResidentDetailClient
          resident={resident}
          canManage={access.role === 'admin'}
          sidebarBadgeCounts={sidebarBadgeCounts}
        />
      </div>
    </div>
  )
}