import { cache } from 'react'
import { redirect } from 'next/navigation'
import { measureServerStep } from '@/app/lib/perf'
import { getCurrentUserServerAccess } from '@/app/lib/supabase/server-access'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'
import type { TypedSupabaseClient } from '@/app/lib/supabase/shared'

export const getAuthenticatedAppContext = cache(async () => {
  return measureServerStep('auth:authenticated-app-context', async () => {
    const supabase = (await getSupabaseServerClient()) as TypedSupabaseClient
    const access = await getCurrentUserServerAccess(supabase)

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
})
