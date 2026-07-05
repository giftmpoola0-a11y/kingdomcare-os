import type { CurrentUserAccess, MembershipRole } from '@/app/lib/supabase/access'

export interface AppChromeProps {
  role: MembershipRole | null
  userDisplayName: string
  careHomeName: string
}

export function getAppChromeProps(access: CurrentUserAccess): AppChromeProps {
  return {
    role: access.role,
    userDisplayName: access.profile?.fullName || access.profile?.email || access.user?.email || '',
    careHomeName: access.careHomeName,
  }
}