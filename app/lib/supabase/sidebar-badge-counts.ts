import 'server-only'

import { measureServerStep } from '@/app/lib/perf'
import { loadDashboardCounts } from '@/app/lib/dashboard/snapshot'
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
  const role = resolvedAccess.membership?.role ?? resolvedAccess.role ?? 'caregiver'

  const counts = await measureServerStep(
    'supabase:sidebar-badge-counts',
    () => loadDashboardCounts({ supabase, careHomeId, role }),
    { careHomeId, role }
  )

  return {
    activeResidentsCount: counts.activeResidentsCount,
    openTasksCount: counts.openTasksCount,
    medicationAlertsCount: counts.medicationAlertsCount,
    recentIncidentsCount: counts.openIncidentsCount,
  }
}

export { EMPTY_SIDEBAR_BADGE_COUNTS }
export type { SidebarBadgeCounts }
