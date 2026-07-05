import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  EMPTY_SIDEBAR_BADGE_COUNTS,
  type SidebarBadgeCounts,
} from '@/app/lib/sidebar-badge-counts'
import { getCurrentUserAccess, type CurrentUserAccess } from '@/app/lib/supabase/access'
import type { Database } from '@/app/lib/supabase/database.types'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'

type TypedSupabaseClient = SupabaseClient<Database>

export async function getCurrentCareHomeSidebarBadgeCounts(
  access?: CurrentUserAccess,
  supabaseClient?: TypedSupabaseClient,
): Promise<SidebarBadgeCounts> {
  const supabase = supabaseClient ?? ((await getSupabaseServerClient()) as TypedSupabaseClient)
  const resolvedAccess = access ?? await getCurrentUserAccess(supabase)

  if (!resolvedAccess.careHomeId) {
    return EMPTY_SIDEBAR_BADGE_COUNTS
  }

  const careHomeId = resolvedAccess.careHomeId

  const [
    { count: activeResidentsCount, error: residentsError },
    { count: openTasksCount, error: tasksError },
    { count: medicationAlertsCount, error: medicationAlertsError },
    { data: recentIncidents, error: incidentsError },
  ] = await Promise.all([
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
      .select('id')
      .eq('care_home_id', careHomeId)
      .is('deleted_at', null)
      .order('occurred_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10),
  ])

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
    recentIncidentsCount: recentIncidents?.length ?? 0,
  }
}

export { EMPTY_SIDEBAR_BADGE_COUNTS }
export type { SidebarBadgeCounts }
