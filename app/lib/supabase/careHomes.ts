import type { SupabaseClient, User } from '@supabase/supabase-js'

export interface CareHomeMembership {
  id: string
  care_home_id: string
  role: string
}

/**
 * Upserts the authenticated user's public profile row.
 * Uses onConflict: 'id' so it is safe to call on every sign-in.
 */
export async function upsertProfile(
  supabase: SupabaseClient,
  user: User
): Promise<void> {
  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email ?? '',
      full_name: (user.user_metadata?.full_name as string | undefined) ?? '',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )
  if (error) throw new Error(error.message)
}

/**
 * Returns the first care_home_members row for the current user,
 * or null if the user has no care home yet.
 * RLS ensures only the caller's own rows are visible.
 */
export async function getMyMembership(
  supabase: SupabaseClient
): Promise<CareHomeMembership | null> {
  const { data, error } = await supabase
    .from('care_home_members')
    .select('id, care_home_id, role')
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

/**
 * Creates a care home and registers the given user as its admin.
 *
 * Two-step insert, ordered deliberately:
 *   1. care_homes row — RLS requires created_by = auth.uid()
 *   2. care_home_members row — the "creator can self-register as admin"
 *      RLS policy allows this because care_homes.created_by = userId.
 *
 * If step 2 fails the care_home row is orphaned (no admin). This is
 * acceptable for MVP; add a DB transaction or cleanup trigger later.
 */
export async function createCareHomeWithAdmin(
  supabase: SupabaseClient,
  userId: string,
  name: string
): Promise<void> {
  const { data: careHome, error: careHomeError } = await supabase
    .from('care_homes')
    .insert({ name: name.trim(), created_by: userId })
    .select('id')
    .single()

  if (careHomeError) throw new Error(careHomeError.message)

  const { error: memberError } = await supabase
    .from('care_home_members')
    .insert({ care_home_id: careHome.id, user_id: userId, role: 'admin' })

  if (memberError) throw new Error(memberError.message)
}
