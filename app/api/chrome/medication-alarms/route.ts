import { NextResponse } from 'next/server'
import { measureServerStep } from '@/app/lib/perf'
import {
  getMedicationAlertUrgency,
  type MedicationAlertUrgency,
} from '@/app/lib/medicationReminders'
import { type CurrentUserAccess } from '@/app/lib/supabase/access'
import { getCurrentUserServerAccess } from '@/app/lib/supabase/server-access'
import type { TypedSupabaseClient } from '@/app/lib/supabase/shared'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ACTIVE_ALARM_LIMIT = 20

interface MedicationAlarmItem {
  id: string
  residentName: string | null
  medicationName: string | null
  message: string
  severity: string
  dueAt: string | null
  urgency: MedicationAlertUrgency
}

interface MedicationAlarmsPayload {
  items: MedicationAlarmItem[]
}

/**
 * Admin/nurse-only feed of active (open/reviewing) medication alerts with
 * enough detail to render an in-app overdue alarm. Deliberately separate
 * from /api/chrome/alerts, which combines and truncates several alert
 * types together and doesn't carry medication name / due_at.
 */
export async function GET() {
  try {
    const supabase = (await getSupabaseServerClient()) as TypedSupabaseClient
    const access = await getCurrentUserServerAccess(supabase)

    if (!access.isSignedIn) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    if (!access.careHomeId || !access.role) {
      return NextResponse.json({ error: 'Care home membership required.' }, { status: 403 })
    }

    if (access.role !== 'admin' && access.role !== 'nurse') {
      return NextResponse.json({ error: 'Only admins and nurses can view medication alarms.' }, { status: 403 })
    }

    return NextResponse.json(
      await measureServerStep(
        'api:/api/chrome/medication-alarms:GET',
        () => buildMedicationAlarmsPayload(supabase, access),
        { role: access.role }
      )
    )
  } catch (error) {
    console.error('Medication alarms fetch failed:', error)
    return NextResponse.json({ error: 'Unable to load medication alarms right now.' }, { status: 500 })
  }
}

async function buildMedicationAlarmsPayload(
  supabase: TypedSupabaseClient,
  access: CurrentUserAccess
): Promise<MedicationAlarmsPayload> {
  const { data: alerts, error } = await supabase
    .from('medication_alerts')
    .select('id, resident_id, medication_id, message, severity, due_at, status')
    .eq('care_home_id', access.careHomeId!)
    .is('deleted_at', null)
    .in('status', ['open', 'reviewing'])
    .order('due_at', { ascending: true, nullsFirst: false })
    .limit(ACTIVE_ALARM_LIMIT)

  if (error) {
    throw new Error(error.message)
  }

  const activeAlerts = alerts ?? []

  const residentIds = new Set<string>()
  const medicationIds = new Set<string>()
  for (const alert of activeAlerts) {
    if (alert.resident_id) residentIds.add(alert.resident_id)
    if (alert.medication_id) medicationIds.add(alert.medication_id)
  }

  const [residentNameById, medicationNameById] = await Promise.all([
    loadResidentNames(supabase, access.careHomeId!, residentIds),
    loadMedicationNames(supabase, access.careHomeId!, medicationIds),
  ])

  const items: MedicationAlarmItem[] = activeAlerts.map((alert) => ({
    id: alert.id,
    residentName: alert.resident_id ? residentNameById.get(alert.resident_id) ?? null : null,
    medicationName: alert.medication_id ? medicationNameById.get(alert.medication_id) ?? null : null,
    message: alert.message,
    severity: alert.severity,
    dueAt: alert.due_at,
    urgency: getMedicationAlertUrgency({
      // The query above already filters to status in ('open', 'reviewing').
      status: alert.status as 'open' | 'reviewing',
      dueAt: alert.due_at,
    }),
  }))

  return { items }
}

async function loadResidentNames(supabase: TypedSupabaseClient, careHomeId: string, residentIds: Set<string>) {
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

async function loadMedicationNames(supabase: TypedSupabaseClient, careHomeId: string, medicationIds: Set<string>) {
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
