import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentUserAccess } from '@/app/lib/supabase/access'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'

export const getAuthenticatedAppContext = cache(async () => {
  const supabase = await getSupabaseServerClient()
  const access = await getCurrentUserAccess(supabase)

  if (!access.isSignedIn) {
    redirect('/auth/sign-in')
  }

  if (!access.hasCareHome) {
    redirect('/onboarding')
  }

  if (!access.membership) {
    redirect('/onboarding')
  }

  return {
    supabase,
    access,
  }
})
