import 'server-only'

import {
  EMPTY_SIDEBAR_BADGE_COUNTS,
  type SidebarBadgeCounts,
} from '@/app/lib/sidebar-badge-counts'
import { getRecentCurrentCareHomeIncidents } from '@/app/lib/supabase/incidents'
import { getOpenCurrentCareHomeMedicationAlerts } from '@/app/lib/supabase/medications'
import { getActiveCurrentCareHomeResidents } from '@/app/lib/supabase/residents'
import { getOpenCurrentCareHomeTasks } from '@/app/lib/supabase/tasks'

export async function getCurrentCareHomeSidebarBadgeCounts(): Promise<SidebarBadgeCounts> {
  const [activeResidents, openTasks, medicationAlerts, recentIncidents] = await Promise.all([
    getActiveCurrentCareHomeResidents(),
    getOpenCurrentCareHomeTasks(),
    getOpenCurrentCareHomeMedicationAlerts(),
    getRecentCurrentCareHomeIncidents(10),
  ])

  return {
    activeResidentsCount: activeResidents.length,
    openTasksCount: openTasks.length,
    medicationAlertsCount: medicationAlerts.length,
    recentIncidentsCount: recentIncidents.length,
  }
}

export { EMPTY_SIDEBAR_BADGE_COUNTS }
export type { SidebarBadgeCounts }
