import type { MembershipRole } from '@/app/lib/supabase/access'

export const APP_NAV_HREFS = {
  Dashboard: '/',
  Residents: '/residents',
  Shifts: '/shifts',
  'New Shift': '/shifts/new',
  Reports: '/reports',
  Incidents: '/incidents',
  Medications: '/medications',
  Tasks: '/tasks',
  Staff: '/staff',
  Account: '/account',
} as const

export type AppNavLabel = keyof typeof APP_NAV_HREFS

export const ROLE_NAV_LABELS: Record<MembershipRole, ReadonlySet<AppNavLabel>> = {
  admin: new Set<AppNavLabel>([
    'Dashboard',
    'Residents',
    'Shifts',
    'New Shift',
    'Reports',
    'Incidents',
    'Medications',
    'Tasks',
    'Staff',
    'Account',
  ]),
  nurse: new Set<AppNavLabel>([
    'Dashboard',
    'Residents',
    'Shifts',
    'Tasks',
    'Incidents',
    'Medications',
    'Account',
  ]),
  caregiver: new Set<AppNavLabel>([
    'Dashboard',
    'Residents',
    'Shifts',
    'New Shift',
    'Tasks',
    'Incidents',
    'Account',
  ]),
}

export function canAccessAppNavLabel(
  role: MembershipRole | null | undefined,
  label: AppNavLabel,
) {
  if (!role) {
    return true
  }

  return ROLE_NAV_LABELS[role].has(label)
}
