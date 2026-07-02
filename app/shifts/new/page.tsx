import { redirect } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { getCurrentUserAccess } from '@/app/lib/supabase/access'
import { getActiveCurrentCareHomeResidents, type ResidentRecord } from '@/app/lib/supabase/residents'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'
import {
  EMPTY_SIDEBAR_BADGE_COUNTS,
  getCurrentCareHomeSidebarBadgeCounts,
} from '@/app/lib/supabase/sidebar-badge-counts'
import NewShiftClient from './NewShiftClient'

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-v0-sans',
  subsets: ['latin'],
})

interface NewShiftPageProps {
  searchParams: Promise<{ residentId?: string | string[] }>
}

export default async function NewShiftPage({ searchParams }: NewShiftPageProps) {
  const resolvedSearchParams = await searchParams
  const residentIdParam = resolvedSearchParams.residentId
  const initialResidentId = typeof residentIdParam === 'string' ? residentIdParam : null

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
    console.error('Failed to load residents for new shift report:', error)
    loadError = 'Unable to load residents. Please refresh the page.'
  }

  let sidebarBadgeCounts = EMPTY_SIDEBAR_BADGE_COUNTS

  try {
    sidebarBadgeCounts = await getCurrentCareHomeSidebarBadgeCounts()
  } catch (error) {
    console.error('Failed to load sidebar badge counts for new shift report:', error)
  }

  return (
    <div className={`${plusJakartaSans.variable} bg-background font-sans antialiased`}>
      <div className="v0-dashboard-theme dark">
        <NewShiftClient
          activeResidents={activeResidents}
          initialResidentId={initialResidentId}
          loadError={loadError}
          sidebarBadgeCounts={sidebarBadgeCounts}
        />
      </div>
    </div>
  )
}
