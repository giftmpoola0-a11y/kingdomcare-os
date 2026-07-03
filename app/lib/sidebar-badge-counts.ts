export interface SidebarBadgeCounts {
  activeResidentsCount: number
  openTasksCount: number
  medicationAlertsCount: number
  recentIncidentsCount: number
}

export const EMPTY_SIDEBAR_BADGE_COUNTS: SidebarBadgeCounts = {
  activeResidentsCount: 0,
  openTasksCount: 0,
  medicationAlertsCount: 0,
  recentIncidentsCount: 0,
}
