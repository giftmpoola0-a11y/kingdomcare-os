import { performance } from 'node:perf_hooks'
import { redirect } from 'next/navigation'
import { getAuthenticatedAppContext } from '@/app/lib/authenticated-app'
import { loadDashboardSnapshot } from '@/app/lib/dashboard/snapshot'
import { DashboardLiveClient } from './dashboard-live-client'
import { type MembershipRole } from '@/app/lib/supabase/access'

type DashboardTimingEntry = {
  label: string
  ms: number
}

const DASHBOARD_PROFILE_ENABLED = process.env.KC_PROFILE_DASHBOARD === '1'

export default async function DashboardPage() {
  const dashboardTimings: DashboardTimingEntry[] = []
  const { supabase, access } = await measureDashboardStep(dashboardTimings, 'getAuthenticatedAppContext', () =>
    getAuthenticatedAppContext(),
  )

  const membership = access.membership

  if (!membership) {
    redirect('/onboarding')
  }

  const snapshot = await measureDashboardStep(dashboardTimings, 'loadDashboardSnapshot', () =>
    loadDashboardSnapshot({
      supabase,
      careHomeId: membership.careHomeId,
      role: membership.role ?? access.role ?? 'caregiver',
    }),
  )

  if (DASHBOARD_PROFILE_ENABLED) {
    console.log(
      `[dashboard-timing] ${JSON.stringify(
        dashboardTimings
          .slice()
          .sort((left, right) => right.ms - left.ms)
          .map((entry) => ({ ...entry, ms: Number(entry.ms.toFixed(1)) })),
      )}`,
    )
  }

  return <DashboardLiveClient roleLabel={dashboardRoleLabel(access.role)} initialSnapshot={snapshot} />
}

async function measureDashboardStep<T>(
  timings: DashboardTimingEntry[],
  label: string,
  task: () => Promise<T>,
): Promise<T> {
  const start = performance.now()

  try {
    return await task()
  } finally {
    if (DASHBOARD_PROFILE_ENABLED) {
      timings.push({
        label,
        ms: performance.now() - start,
      })
    }
  }
}

function dashboardRoleLabel(role: MembershipRole | null | undefined) {
  switch (role) {
    case 'admin':
      return 'Admin'
    case 'nurse':
      return 'Nurse'
    case 'caregiver':
      return 'Caregiver'
    default:
      return 'Care Team'
  }
}
