import type { SupabaseClient, User } from '@supabase/supabase-js'

export type MembershipRole = 'admin' | 'nurse' | 'caregiver'

export interface UserProfileAccess {
  fullName: string
  email: string
}

export interface UserMembershipAccess {
  id: string
  careHomeId: string
  careHomeName: string
  role: MembershipRole | null
}

export interface CurrentUserAccess {
  user: User | null
  profile: UserProfileAccess | null
  membership: UserMembershipAccess | null
  careHomeId: string | null
  careHomeName: string
  role: MembershipRole | null
  isSignedIn: boolean
  hasCareHome: boolean
}

export async function getCurrentUserAccess(
  supabase: SupabaseClient,
  options?: { user?: User | null }
): Promise<CurrentUserAccess> {
  const user =
    options && 'user' in options
      ? options.user ?? null
      : (await supabase.auth.getUser()).data.user ?? null

  if (!user) {
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

  const [{ data: profile, error: profileError }, { data: membership, error: membershipError }] =
    await Promise.all([
      supabase.from('profiles').select('full_name, email').eq('id', user.id).maybeSingle(),
      supabase
        .from('care_home_members')
        .select('id, care_home_id, role, care_homes(name)')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle(),
    ])

  if (profileError) {
    throw new Error(profileError.message)
  }

  if (membershipError) {
    throw new Error(membershipError.message)
  }

  const role = normalizeMembershipRole(membership?.role)
  const careHomeName =
    membership?.care_homes && typeof membership.care_homes === 'object' && 'name' in membership.care_homes
      ? String(membership.care_homes.name ?? '')
      : ''

  return {
    user,
    profile: profile
      ? {
          fullName: typeof profile.full_name === 'string' ? profile.full_name : '',
          email: typeof profile.email === 'string' ? profile.email : user.email ?? '',
        }
      : null,
    membership:
      membership?.id && membership.care_home_id
        ? {
            id: membership.id,
            careHomeId: membership.care_home_id,
            careHomeName,
            role,
          }
        : null,
    careHomeId: membership?.care_home_id ?? null,
    careHomeName,
    role,
    isSignedIn: true,
    hasCareHome: Boolean(membership?.care_home_id),
  }
}

export function normalizeMembershipRole(role: string | null | undefined): MembershipRole | null {
  return role === 'admin' || role === 'nurse' || role === 'caregiver' ? role : null
}
