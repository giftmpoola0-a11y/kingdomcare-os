import { Plus_Jakarta_Sans } from 'next/font/google'
import { notFound, redirect } from 'next/navigation'
import { getCurrentUserAccess } from '@/app/lib/supabase/access'
import { getAppChromeProps } from '@/app/lib/app-chrome'
import {
  getCurrentCareHomeIncidentById,
  type IncidentRecord,
} from '@/app/lib/supabase/incidents'
import { getResidentById, type ResidentRecord } from '@/app/lib/supabase/residents'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'
import {
  EMPTY_SIDEBAR_BADGE_COUNTS,
  getCurrentCareHomeSidebarBadgeCounts,
} from '@/app/lib/supabase/sidebar-badge-counts'
import IncidentDetailClient from './IncidentDetailClient'

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-v0-sans',
  subsets: ['latin'],
})

export default async function IncidentDetailPage(props: PageProps<'/incidents/[incidentId]'>) {
  const { incidentId } = await props.params
  const supabase = await getSupabaseServerClient()
  const access = await getCurrentUserAccess(supabase)

  if (!access.isSignedIn) {
    redirect('/auth/sign-in')
  }

  if (!access.hasCareHome) {
    redirect('/onboarding')
  }

  let incident: IncidentRecord | null = null

  try {
    incident = await getCurrentCareHomeIncidentById(incidentId)
  } catch (error) {
    console.error('Failed to load incident detail:', error)
    notFound()
  }

  if (!incident) {
    notFound()
  }

  let resident: ResidentRecord | null = null

  if (incident.residentId) {
    try {
      resident = await getResidentById(incident.residentId)
    } catch (error) {
      console.error('Failed to load resident for incident detail:', error)
    }
  }

  let sidebarBadgeCounts = EMPTY_SIDEBAR_BADGE_COUNTS

  try {
    sidebarBadgeCounts = await getCurrentCareHomeSidebarBadgeCounts()
  } catch (error) {
    console.error('Failed to load sidebar badge counts for incident detail:', error)
  }

  const residentName = resident?.name ?? (incident.residentId ? 'Resident record unavailable' : 'General incident')

  return (
    <div className={`${plusJakartaSans.variable} bg-background font-sans antialiased`}>
      <div className="v0-dashboard-theme dark">
        <IncidentDetailClient
          {...getAppChromeProps(access)}
          incident={incident}
          residentName={residentName}
          sidebarBadgeCounts={sidebarBadgeCounts}
        />
      </div>
    </div>
  )
}
