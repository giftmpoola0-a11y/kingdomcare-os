import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'
import { getCurrentUserAccess } from '@/app/lib/supabase/access'
import { getCurrentCareHomeResidents, type ResidentRecord } from '@/app/lib/supabase/residents'
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

  try {
    residents = await getCurrentCareHomeResidents()
  } catch {
    loadError = 'Unable to load residents. Please refresh the page.'
  }

  return (
    <ResidentsClient
      initialResidents={residents}
      isAdmin={access.role === 'admin'}
      loadError={loadError}
    />
  )
}
