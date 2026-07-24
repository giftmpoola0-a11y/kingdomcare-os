import 'server-only'

import { measureServerStep } from '@/app/lib/perf'
import {
  getMedicationAlertUrgency,
  type MedicationAlertUrgency,
} from '@/app/lib/medicationReminders'
import {
  canManageMedicationsRole,
  getMembershipRoleFromAccess,
  type CurrentUserAccess,
} from '@/app/lib/supabase/access'
import type { TypedSupabaseClient } from '@/app/lib/supabase/shared'

const ACTIVE_ALARM_LIMIT = 20
export const CAREGIVER_STAFF_MEDICATIONS_HREF = '/staff?focus=medications#medication-reminders'

export interface MedicationAlarmItem {
  id: string
  residentId: string | null
  residentName: string | null
  medicationName: string | null
  message: string
  severity: string
  dueAt: string | null
  urgency: MedicationAlertUrgency
}

export interface MedicationAlarmsPayload {
  canManage: boolean
  actionHref: string
  actionLabel: string
  items: MedicationAlarmItem[]
}

interface MedicationAlertQueryRow {
  id: string
  resident_id: string | null
  medication_id: string | null
  message: string
  severity: string
  due_at: string | null
  status: 'open' | 'reviewing'
}

export async function buildMedicationAlarmsPayload(
  supabase: TypedSupabaseClient,
  access: CurrentUserAccess
): Promise<MedicationAlarmsPayload> {
  const membershipRole = getMembershipRoleFromAccess(access)
  const canManage = canManageMedicationsRole(membershipRole)
  const actionHref = canManage ? '/medications' : CAREGIVER_STAFF_MEDICATIONS_HREF
  const actionLabel = canManage ? 'Open medications' : 'Open staff workspace'

  const alertsResponse = await measureServerStep<{
    data: MedicationAlertQueryRow[] | null
    error: { message: string } | null
  }>(
    'supabase:medication-alarms:alerts',
    async () => {
      const { data, error } = await supabase
        .from('medication_alerts')
        .select('id, resident_id, medication_id, message, severity, due_at, status')
        .eq('care_home_id', access.careHomeId!)
        .is('deleted_at', null)
        .in('status', ['open', 'reviewing'])
        .order('due_at', { ascending: true, nullsFirst: false })
        .limit(ACTIVE_ALARM_LIMIT)

      return {
        data: (data ?? null) as MedicationAlertQueryRow[] | null,
        error: error ? { message: error.message } : null,
      }
    },
    { careHomeId: access.careHomeId, canManage }
  )
  const { data: alerts, error } = alertsResponse

  if (error) {
    throw new Error(error.message)
  }

  const activeAlerts = (alerts ?? [])
    .map((alert) => ({
      ...alert,
      urgency: getMedicationAlertUrgency({
        status: alert.status as 'open' | 'reviewing',
        dueAt: alert.due_at,
      }),
    }))
    .filter((alert) => alert.urgency === 'overdue' || alert.urgency === 'due_soon')

  const residentIds = new Set<string>()
  const medicationIds = new Set<string>()

  for (const alert of activeAlerts) {
    if (alert.resident_id) residentIds.add(alert.resident_id)
    if (canManage && alert.medication_id) medicationIds.add(alert.medication_id)
  }

  const [residentNameById, medicationNameById] = await measureServerStep(
    'supabase:medication-alarms:lookups',
    () =>
      Promise.all([
        loadResidentNames(supabase, access.careHomeId!, residentIds),
        canManage
          ? loadMedicationNames(supabase, access.careHomeId!, medicationIds)
          : Promise.resolve(new Map<string, string>()),
      ]),
    {
      careHomeId: access.careHomeId,
      residentIds: residentIds.size,
      medicationIds: medicationIds.size,
      canManage,
    }
  )

  return measureServerStep(
    'supabase:medication-alarms:shape',
    async () => ({
      canManage,
      actionHref,
      actionLabel,
      items: activeAlerts.map((alert) => ({
        id: alert.id,
        residentId: alert.resident_id,
        residentName: alert.resident_id ? residentNameById.get(alert.resident_id) ?? null : null,
        medicationName:
          canManage && alert.medication_id ? medicationNameById.get(alert.medication_id) ?? null : null,
        message: alert.message,
        severity: alert.severity,
        dueAt: alert.due_at,
        urgency: alert.urgency,
      })),
    }),
    { itemCount: activeAlerts.length, canManage }
  )
}

async function loadResidentNames(
  supabase: TypedSupabaseClient,
  careHomeId: string,
  residentIds: Set<string>
) {
  const nameById = new Map<string, string>()

  if (residentIds.size === 0) {
    return nameById
  }

  const { data, error } = await supabase
    .from('residents')
    .select('id, full_name')
    .eq('care_home_id', careHomeId)
    .is('deleted_at', null)
    .in('id', Array.from(residentIds))

  if (error) {
    throw new Error(error.message)
  }

  for (const resident of data ?? []) {
    nameById.set(resident.id, resident.full_name)
  }

  return nameById
}

async function loadMedicationNames(
  supabase: TypedSupabaseClient,
  careHomeId: string,
  medicationIds: Set<string>
) {
  const nameById = new Map<string, string>()

  if (medicationIds.size === 0) {
    return nameById
  }

  const { data, error } = await supabase
    .from('medications')
    .select('id, medication_name')
    .eq('care_home_id', careHomeId)
    .is('deleted_at', null)
    .in('id', Array.from(medicationIds))

  if (error) {
    throw new Error(error.message)
  }

  for (const medication of data ?? []) {
    nameById.set(medication.id, medication.medication_name)
  }

  return nameById
}


