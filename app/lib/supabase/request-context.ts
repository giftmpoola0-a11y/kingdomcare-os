import 'server-only'

import { cache } from 'react'
import { getCurrentUserServerAccess } from '@/app/lib/supabase/server-access'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'
import type { TypedSupabaseClient } from '@/app/lib/supabase/shared'

export const getCurrentRequestSupabase = cache(async (): Promise<TypedSupabaseClient> => {
  return (await getSupabaseServerClient()) as TypedSupabaseClient
})

export const getCurrentRequestSupabaseAccess = cache(async () => {
  const supabase = await getCurrentRequestSupabase()
  const access = await getCurrentUserServerAccess(supabase)

  return {
    supabase,
    access,
  }
})
