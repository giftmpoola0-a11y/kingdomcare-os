import { redirect } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'
import { getCurrentUserAccess } from '@/app/lib/supabase/access'
import { getCurrentCareHomeResidents, type ResidentRecord } from '@/app/lib/supabase/residents'
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

  try {
    residents = await getCurrentCareHomeResidents()
  } catch {
    loadError = 'Unable to load residents. Please refresh the page.'
  }

  return (
    <div className={`${plusJakartaSans.variable} bg-background font-sans antialiased`}>
      <div className="v0-dashboard-theme dark">
        <ResidentsClient
          initialResidents={residents}
          isAdmin={access.role === 'admin'}
          loadError={loadError}
        />
      </div>
    </div>
  )
}
