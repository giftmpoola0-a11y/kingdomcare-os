import 'server-only'

import { cache } from 'react'
import type { User } from '@supabase/supabase-js'
import { logServerPerf, measureServerStep } from '@/app/lib/perf'
import {
  getCurrentUserAccess,
  normalizeMembershipRole,
  type CurrentUserAccess,
} from '@/app/lib/supabase/access'
import type { Database } from '@/app/lib/supabase/database.types'
import type { TypedSupabaseClient } from '@/app/lib/supabase/shared'

type CurrentUserAccessRpcRow = Database['public']['Functions']['get_current_user_access']['Returns'][number]

function getPerfNow() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

export const getCurrentUserServerAccess = cache(async (
  supabase: TypedSupabaseClient,
): Promise<CurrentUserAccess> => {
  return measureServerStep('getCurrentUserAccess', async () => {
    const rpcStart = getPerfNow()
    const { data, error } = await supabase.rpc('get_current_user_access')

    logServerPerf('getCurrentUserAccess:rpc', getPerfNow() - rpcStart)

    if (error) {
      if (isMissingCurrentUserAccessRpcError(error)) {
        logServerPerf('getCurrentUserAccess:rpc-fallback', 0, {
          reason: 'missing_rpc',
        })
        return getCurrentUserAccess(supabase)
      }

      throw new Error(error.message)
    }

    const row = Array.isArray(data) ? (data[0] as CurrentUserAccessRpcRow | undefined) : undefined

    if (!row?.user_id) {
      return {
        user: null,
        profile: null,
        membership: null,
        careHomeId: null,
        careHomeName: '',
        role: null,
        isSignedIn: false,
        hasCareHome: false,
      }
    }

    const role = normalizeMembershipRole(row.role)
    const careHomeName = typeof row.care_home_name === 'string' ? row.care_home_name : ''
    const email = typeof row.email === 'string' ? row.email : ''
    const fullName = typeof row.full_name === 'string' ? row.full_name : ''
    const user = {
      id: row.user_id,
      email: email || undefined,
    } as User

    return {
      user,
      profile: fullName || email ? { fullName, email } : null,
      membership:
        row.membership_id && row.care_home_id
          ? {
              id: row.membership_id,
              careHomeId: row.care_home_id,
              careHomeName,
              role,
            }
          : null,
      careHomeId: row.care_home_id ?? null,
      careHomeName,
      role,
      isSignedIn: true,
      hasCareHome: Boolean(row.care_home_id),
    }
  })
})

function isMissingCurrentUserAccessRpcError(error: { code?: string; message?: string }) {
  return error.code === 'PGRST202' || /get_current_user_access/i.test(error.message ?? '')
}
