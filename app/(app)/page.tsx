import { performance } from 'node:perf_hooks'
import { redirect } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { DashboardShell } from '@/components/kingdomos-v0/dashboard-shell'
import { getAuthenticatedAppContext } from '@/app/lib/authenticated-app'
import { DashboardDeferredContent } from './dashboard-deferred-content'
import { type MembershipRole } from '@/app/lib/supabase/access'

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-v0-sans',
  subsets: ['latin'],
})

type DashboardTimingEntry = {
  label: string
  ms: number
}

const DASHBOARD_PROFILE_ENABLED = process.env.KC_PROFILE_DASHBOARD === '1'

export default async function DashboardPage() {
  const dashboardTimings: DashboardTimingEntry[] = []
  const { supabase, access } = await measureDashboardStep(dashboardTimings, 'getAuthenticatedAppContext', () =>
    getAuthenticatedAppContext()
  )

  const membership = access.membership

  if (!membership) {
    redirect('/onboarding')
  }

  const nowIso = new Date().toISOString()

  const [activeResidentsCount, openTasksCount, overdueTasksCount, openIncidentsCount] = await Promise.all([
    loadDashboardData(dashboardTimings, 'activeResidentsCount', 0, async () => {
      const { count, error } = await supabase
        .from('residents')
        .select('id', { count: 'exact', head: true })
        .eq('care_home_id', membership.careHomeId)
        .eq('status', 'active')
        .is('deleted_at', null)

      if (error) {
        throw new Error(error.message)
      }

      return count ?? 0
    }),
    loadDashboardData(dashboardTimings, 'openTasksCount', 0, async () => {
      const { count, error } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('care_home_id', membership.careHomeId)
        .in('status', ['open', 'in_progress'])
        .is('deleted_at', null)

      if (error) {
        throw new Error(error.message)
      }

      return count ?? 0
    }),
    loadDashboardData(dashboardTimings, 'overdueTasksCount', 0, async () => {
      const { count, error } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('care_home_id', membership.careHomeId)
        .in('status', ['open', 'in_progress'])
        .is('deleted_at', null)
        .lt('due_at', nowIso)

      if (error) {
        throw new Error(error.message)
      }

      return count ?? 0
    }),
    loadDashboardData(dashboardTimings, 'openIncidentsCount', 0, async () => {
      const { count, error } = await supabase
        .from('incidents')
        .select('id', { count: 'exact', head: true })
        .eq('care_home_id', membership.careHomeId)
        .in('status', ['open', 'reviewing'])
        .is('deleted_at', null)

      if (error) {
        throw new Error(error.message)
      }

      return count ?? 0
    }),
  ])

  if (DASHBOARD_PROFILE_ENABLED) {
    console.log(
      `[dashboard-timing] ${JSON.stringify(
        dashboardTimings
          .slice()
          .sort((left, right) => right.ms - left.ms)
          .map((entry) => ({ ...entry, ms: Number(entry.ms.toFixed(1)) }))
      )}`
    )
  }

  return (
    <div className={`${plusJakartaSans.variable} bg-background font-sans antialiased`}>
      <div className="v0-dashboard-theme dark">
        <DashboardShell
          roleLabel={dashboardRoleLabel(access.role)}
          role={access.role}
          userDisplayName={access.profile?.fullName || access.profile?.email || access.user?.email || ''}
          careHomeName={access.careHomeName}
          activeResidentsCount={activeResidentsCount}
          openTasksCount={openTasksCount}
          overdueTasksCount={overdueTasksCount}
          openIncidentsCount={openIncidentsCount}
          dashboardContent={<DashboardDeferredContent careHomeId={membership.careHomeId} role={membership.role ?? access.role ?? 'caregiver'} />}
        />
      </div>
    </div>
  )
}

async function measureDashboardStep<T>(
  timings: DashboardTimingEntry[],
  label: string,
  task: () => Promise<T>
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

async function loadDashboardData<T>(
  timings: DashboardTimingEntry[],
  label: string,
  fallback: T,
  task: () => Promise<T>
): Promise<T> {
  try {
    return await measureDashboardStep(timings, label, task)
  } catch (error) {
    console.error(`Failed to load ${label} for dashboard:`, error)
    return fallback
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

