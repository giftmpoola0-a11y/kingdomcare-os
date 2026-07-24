import 'server-only'

import type { MembershipRole } from '@/app/lib/supabase/access'
import type { TypedSupabaseClient } from '@/app/lib/supabase/shared'
import type { DashboardCareTeamMember } from '@/components/kingdomos-v0/dashboard/staff-on-duty'
import type { DashboardCareAttentionItem } from '@/components/kingdomos-v0/dashboard/care-attention'
import type { DashboardOperationalQueueItem } from '@/components/kingdomos-v0/dashboard/today-glance'
import type { DashboardRecentActivityItem } from '@/components/kingdomos-v0/dashboard/recent-activity'
import type { ShiftReportRecord } from '@/app/lib/supabase/shiftReports'
import {
  buildCareAttentionItems,
  buildOperationalQueueItems,
  buildRecentActivityItems,
  loadOpenIncidents,
  loadOpenMedicationAlerts,
  loadOpenTasks,
  loadRecentIncidents,
  loadRecentMedicationAlerts,
  loadRecentMedications,
  loadRecentResidents,
  loadRecentShiftReports,
  loadRecentTasks,
  loadResidentNameMap,
  normalizeDashboardCareTeamMember,
} from '@/app/(app)/dashboard-deferred-content'

export interface DashboardCounts {
  activeResidentsCount: number
  openTasksCount: number
  overdueTasksCount: number
  openIncidentsCount: number
  medicationAlertsCount: number
}

export interface DashboardSnapshot {
  activeResidentsCount: number
  openTasksCount: number
  overdueTasksCount: number
  openIncidentsCount: number
  operationalQueueItems: DashboardOperationalQueueItem[]
  careAttentionItems: DashboardCareAttentionItem[]
  recentShiftReports: ShiftReportRecord[]
  recentActivityItems: DashboardRecentActivityItem[]
  careTeamMembers: DashboardCareTeamMember[]
  fetchedAt: string
}

export async function loadDashboardCounts({
  supabase,
  careHomeId,
  role,
}: {
  supabase: TypedSupabaseClient
  careHomeId: string
  role: MembershipRole
}): Promise<DashboardCounts> {
  const canSeeMedications = role === 'admin' || role === 'nurse'
  const nowIso = new Date().toISOString()

  const [activeResidentsCount, openTasksCount, overdueTasksCount, openIncidentsCount, medicationAlertsCount] =
    await Promise.all([
      loadActiveResidentsCount(supabase, careHomeId),
      loadOpenTasksCount(supabase, careHomeId),
      loadOverdueTasksCount(supabase, careHomeId, nowIso),
      loadOpenIncidentsCount(supabase, careHomeId),
      canSeeMedications ? loadOpenMedicationAlertsCount(supabase, careHomeId) : Promise.resolve(0),
    ])

  return {
    activeResidentsCount,
    openTasksCount,
    overdueTasksCount,
    openIncidentsCount,
    medicationAlertsCount,
  }
}

export async function loadDashboardSnapshot({
  supabase,
  careHomeId,
  role,
}: {
  supabase: TypedSupabaseClient
  careHomeId: string
  role: MembershipRole
}): Promise<DashboardSnapshot> {
  const canSeeMedications = role === 'admin' || role === 'nurse'
  const canSeeCareTeam = role === 'admin' || role === 'nurse'

  const [counts, openTasks, openIncidents, openMedicationAlerts, recentShiftReports, recentResidents, recentTasks, recentIncidents, recentMedications, recentMedicationAlerts, careTeamMembers] = await Promise.all([
    loadDashboardCounts({ supabase, careHomeId, role }),
    loadOpenTasks(supabase, careHomeId),
    loadOpenIncidents(supabase, careHomeId),
    canSeeMedications ? loadOpenMedicationAlerts(supabase, careHomeId) : Promise.resolve([]),
    loadRecentShiftReports(supabase, careHomeId),
    loadRecentResidents(supabase, careHomeId),
    loadRecentTasks(supabase, careHomeId),
    loadRecentIncidents(supabase, careHomeId),
    canSeeMedications ? loadRecentMedications(supabase, careHomeId) : Promise.resolve([]),
    canSeeMedications ? loadRecentMedicationAlerts(supabase, careHomeId) : Promise.resolve([]),
    canSeeCareTeam ? loadCareTeamMembers(supabase, careHomeId) : Promise.resolve([]),
  ])

  const { activeResidentsCount, openTasksCount, overdueTasksCount, openIncidentsCount } = counts

  const residentNameById = await loadResidentNameMap(supabase, careHomeId, [
    ...openTasks.map((task) => task.residentId),
    ...openIncidents.map((incident) => incident.residentId),
    ...openMedicationAlerts.map((alert) => alert.residentId),
    ...recentTasks.map((task) => task.residentId),
    ...recentIncidents.map((incident) => incident.residentId),
    ...recentMedications.map((medication) => medication.residentId),
    ...recentMedicationAlerts.map((alert) => alert.residentId),
  ])

  return {
    activeResidentsCount,
    openTasksCount,
    overdueTasksCount,
    openIncidentsCount,
    operationalQueueItems: buildOperationalQueueItems({
      residentNameById,
      openTasks,
      openIncidents,
      openMedicationAlerts,
    }),
    careAttentionItems: buildCareAttentionItems({
      residentNameById,
      openTasks,
      openIncidents,
      openMedicationAlerts,
    }),
    recentShiftReports,
    recentActivityItems: buildRecentActivityItems({
      residentNameById,
      recentResidents,
      tasks: recentTasks,
      incidents: recentIncidents,
      shiftReports: recentShiftReports,
      medications: recentMedications,
      medicationAlerts: recentMedicationAlerts,
    }),
    careTeamMembers,
    fetchedAt: new Date().toISOString(),
  }
}

async function loadActiveResidentsCount(supabase: TypedSupabaseClient, careHomeId: string) {
  const { count, error } = await supabase
    .from('residents')
    .select('id', { count: 'exact', head: true })
    .eq('care_home_id', careHomeId)
    .eq('status', 'active')
    .is('deleted_at', null)

  if (error) throw new Error(error.message)
  return count ?? 0
}

async function loadOpenTasksCount(supabase: TypedSupabaseClient, careHomeId: string) {
  const { count, error } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('care_home_id', careHomeId)
    .in('status', ['open', 'in_progress'])
    .is('deleted_at', null)

  if (error) throw new Error(error.message)
  return count ?? 0
}

async function loadOverdueTasksCount(supabase: TypedSupabaseClient, careHomeId: string, nowIso: string) {
  const { count, error } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('care_home_id', careHomeId)
    .in('status', ['open', 'in_progress'])
    .is('deleted_at', null)
    .lt('due_at', nowIso)

  if (error) throw new Error(error.message)
  return count ?? 0
}

async function loadOpenIncidentsCount(supabase: TypedSupabaseClient, careHomeId: string) {
  const { count, error } = await supabase
    .from('incidents')
    .select('id', { count: 'exact', head: true })
    .eq('care_home_id', careHomeId)
    .in('status', ['open', 'reviewing'])
    .is('deleted_at', null)

  if (error) throw new Error(error.message)
  return count ?? 0
}

async function loadOpenMedicationAlertsCount(supabase: TypedSupabaseClient, careHomeId: string) {
  const { count, error } = await supabase
    .from('medication_alerts')
    .select('id', { count: 'exact', head: true })
    .eq('care_home_id', careHomeId)
    .in('status', ['open', 'reviewing'])
    .is('deleted_at', null)

  if (error) throw new Error(error.message)
  return count ?? 0
}

async function loadCareTeamMembers(supabase: TypedSupabaseClient, careHomeId: string) {
  const { data, error } = await supabase.rpc('get_care_home_staff', {
    p_care_home_id: careHomeId,
  })

  if (error) throw new Error(error.message)

  return Array.isArray(data)
    ? data
        .map((member) => normalizeDashboardCareTeamMember(member))
        .filter((member): member is DashboardCareTeamMember => member !== null)
    : []
}
