import 'server-only'

import { measureServerStep } from '@/app/lib/perf'
import {
  EMPTY_SIDEBAR_BADGE_COUNTS,
  type SidebarBadgeCounts,
} from '@/app/lib/sidebar-badge-counts'
import { type CurrentUserAccess } from '@/app/lib/supabase/access'
import { getCurrentUserServerAccess } from '@/app/lib/supabase/server-access'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'
import type { TypedSupabaseClient } from '@/app/lib/supabase/shared'

export async function getCurrentCareHomeSidebarBadgeCounts(
  access?: CurrentUserAccess,
  supabaseClient?: TypedSupabaseClient,
): Promise<SidebarBadgeCounts> {
  const supabase = supabaseClient ?? ((await getSupabaseServerClient()) as TypedSupabaseClient)
  const resolvedAccess = access ?? await getCurrentUserServerAccess(supabase)

  if (!resolvedAccess.careHomeId) {
    return EMPTY_SIDEBAR_BADGE_COUNTS
  }

  const careHomeId = resolvedAccess.careHomeId

  const [
    { count: activeResidentsCount, error: residentsError },
    { count: openTasksCount, error: tasksError },
    { count: medicationAlertsCount, error: medicationAlertsError },
    { count: recentIncidentsCount, error: incidentsError },
  ] = await measureServerStep(
    'supabase:sidebar-badge-counts',
    () =>
      Promise.all([
        supabase
          .from('residents')
          .select('id', { count: 'exact', head: true })
          .eq('care_home_id', careHomeId)
          .eq('status', 'active')
          .is('deleted_at', null),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('care_home_id', careHomeId)
          .in('status', ['open', 'in_progress'])
          .is('deleted_at', null),
        supabase
          .from('medication_alerts')
          .select('id', { count: 'exact', head: true })
          .eq('care_home_id', careHomeId)
          .in('status', ['open', 'reviewing'])
          .is('deleted_at', null),
        supabase
          .from('incidents')
          .select('id', { count: 'exact', head: true })
          .eq('care_home_id', careHomeId)
          .is('deleted_at', null),
      ]),
    { careHomeId }
  )

  if (residentsError) {
    throw new Error(residentsError.message)
  }

  if (tasksError) {
    throw new Error(tasksError.message)
  }

  if (medicationAlertsError) {
    throw new Error(medicationAlertsError.message)
  }

  if (incidentsError) {
    throw new Error(incidentsError.message)
  }

  return {
    activeResidentsCount: activeResidentsCount ?? 0,
    openTasksCount: openTasksCount ?? 0,
    medicationAlertsCount: medicationAlertsCount ?? 0,
    recentIncidentsCount: Math.min(recentIncidentsCount ?? 0, 10),
  }
}

export { EMPTY_SIDEBAR_BADGE_COUNTS }
export type { SidebarBadgeCounts }
