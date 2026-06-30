export interface SidebarBadgeCounts {
  openTasksCount: number
  medicationAlertsCount: number
  recentIncidentsCount: number
}

export const EMPTY_SIDEBAR_BADGE_COUNTS: SidebarBadgeCounts = {
  openTasksCount: 0,
  medicationAlertsCount: 0,
  recentIncidentsCount: 0,
}
