'use server'

import { getCurrentUserAccess } from '@/app/lib/supabase/access'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'

export type OnboardingActionResult =
  | { success: true }
  | { success: false; error: string }

/**
 * Server action: bootstraps care home onboarding via a single DB RPC call.
 *
 * The RPC function (create_care_home_onboarding) runs SECURITY DEFINER on
 * the database side, so it bypasses RLS entirely while still verifying
 * auth.uid() internally. This avoids the "new row violates row-level
 * security" error that occurs when the Supabase client's JWT is not
 * forwarded correctly to individual INSERT statements.
 */
export async function createCareHomeAction(
  name: string
): Promise<OnboardingActionResult> {
  if (!name.trim()) {
    return { success: false, error: 'Care home name is required.' }
  }

  try {
    const supabase = await getSupabaseServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'You must be signed in to create a care home. Please sign in and try again.',
      }
    }

    const access = await getCurrentUserAccess(supabase, { user })
    if (access.hasCareHome) {
      return { success: true }
    }

    const { error: rpcError } = await supabase.rpc('create_care_home_onboarding', {
      care_home_name:    name.trim(),
      profile_full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
      profile_email:     user.email ?? null,
    })

    if (rpcError) {
      return { success: false, error: rpcError.message }
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
    }
  }
}
