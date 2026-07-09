import { NextResponse } from 'next/server'
import { APP_NAV_HREFS, canAccessAppNavLabel } from '@/app/lib/app-navigation'
import { getCurrentUserAccess } from '@/app/lib/supabase/access'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'

export const dynamic = 'force-dynamic'

const TASK_ALERT_LIMIT = 4
const INCIDENT_ALERT_LIMIT = 4
const MEDICATION_ALERT_LIMIT = 3
const TOTAL_LIMIT = 8

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()
    const access = await getCurrentUserAccess(supabase)

    if (!access.isSignedIn) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    if (!access.careHomeId || !access.role) {
      return NextResponse.json({ error: 'Care home membership required.' }, { status: 403 })
    }

    const taskAlertsEnabled = canAccessAppNavLabel(access.role, 'Tasks')
    const incidentAlertsEnabled = canAccessAppNavLabel(access.role, 'Incidents')
    const medicationAlertsEnabled =
      canAccessAppNavLabel(access.role, 'Medications') && access.role !== 'caregiver'
    const nowIso = new Date().toISOString()

    const overdueTasksPromise = taskAlertsEnabled
      ? supabase
          .from('tasks')
          .select('id, resident_id, title, due_at')
          .eq('care_home_id', access.careHomeId)
          .is('deleted_at', null)
          .in('status', ['open', 'in_progress'])
          .lt('due_at', nowIso)
          .order('due_at', { ascending: true })
          .limit(TASK_ALERT_LIMIT)
      : Promise.resolve({ data: [], error: null })

    const openIncidentsPromise = incidentAlertsEnabled
      ? supabase
          .from('incidents')
          .select('id, resident_id, incident_type, severity, occurred_at')
          .eq('care_home_id', access.careHomeId)
          .is('deleted_at', null)
          .in('status', ['open', 'reviewing'])
          .order('occurred_at', { ascending: false })
          .limit(INCIDENT_ALERT_LIMIT)
      : Promise.resolve({ data: [], error: null })

    const medicationAlertsPromise = medicationAlertsEnabled
      ? supabase
          .from('medication_alerts')
          .select('id, resident_id, message, severity, due_at')
          .eq('care_home_id', access.careHomeId)
          .is('deleted_at', null)
          .in('status', ['open', 'reviewing'])
          .order('created_at', { ascending: false })
          .limit(MEDICATION_ALERT_LIMIT)
      : Promise.resolve({ data: [], error: null })

    const [overdueTasksResponse, openIncidentsResponse, medicationAlertsResponse] = await Promise.all([
      overdueTasksPromise,
      openIncidentsPromise,
      medicationAlertsPromise,
    ])

    const firstError = [
      overdueTasksResponse.error,
      openIncidentsResponse.error,
      medicationAlertsResponse.error,
    ].find(Boolean)

    if (firstError) {
      throw new Error(firstError.message)
    }

    const residentIds = new Set<string>()
    for (const record of [
      ...(overdueTasksResponse.data ?? []),
      ...(openIncidentsResponse.data ?? []),
      ...(medicationAlertsResponse.data ?? []),
    ]) {
      if (record?.resident_id) {
        residentIds.add(record.resident_id)
      }
    }

    const residentNameById = new Map<string, string>()

    if (residentIds.size > 0) {
      const { data: residents, error } = await supabase
        .from('residents')
        .select('id, full_name')
        .eq('care_home_id', access.careHomeId)
        .is('deleted_at', null)
        .in('id', Array.from(residentIds))

      if (error) {
        throw new Error(error.message)
      }

      for (const resident of residents ?? []) {
        residentNameById.set(resident.id, resident.full_name)
      }
    }

    const alerts = [
      ...(overdueTasksResponse.data ?? []).map((task) => ({
        id: task.id,
        kind: 'task' as const,
        title: task.title,
        subtitle: buildTaskAlertSubtitle(
          task.due_at,
          residentNameById.get(task.resident_id ?? '') ?? null,
        ),
        href: APP_NAV_HREFS.Tasks,
      })),
      ...(openIncidentsResponse.data ?? []).map((incident) => ({
        id: incident.id,
        kind: 'incident' as const,
        title: incident.incident_type,
        subtitle: buildIncidentAlertSubtitle(
          incident.severity,
          residentNameById.get(incident.resident_id ?? '') ?? null,
        ),
        href: `${APP_NAV_HREFS.Incidents}/${incident.id}`,
      })),
      ...(medicationAlertsResponse.data ?? []).map((alert) => ({
        id: alert.id,
        kind: 'medication_alert' as const,
        title: alert.message,
        subtitle: buildMedicationAlertSubtitle(
          alert.severity,
          residentNameById.get(alert.resident_id ?? '') ?? null,
        ),
        href: APP_NAV_HREFS.Medications,
      })),
    ].slice(0, TOTAL_LIMIT)

    return NextResponse.json({ items: alerts })
  } catch (error) {
    console.error('Topbar alerts failed:', error)
    return NextResponse.json({ error: 'Unable to load alerts right now.' }, { status: 500 })
  }
}

function buildTaskAlertSubtitle(dueAt: string | null, residentName: string | null) {
  const residentLabel = residentName ? `Resident: ${residentName}` : 'Resident task'
  const dueLabel = dueAt ? `Overdue since ${formatTimestamp(dueAt)}` : 'Overdue task'
  return `${residentLabel} - ${dueLabel}`
}

function buildIncidentAlertSubtitle(severity: string | null, residentName: string | null) {
  const residentLabel = residentName ? `Resident: ${residentName}` : 'Open incident'
  const severityLabel = severity ? `${capitalize(severity)} severity` : 'Needs review'
  return `${residentLabel} - ${severityLabel}`
}

function buildMedicationAlertSubtitle(severity: string | null, residentName: string | null) {
  const residentLabel = residentName ? `Resident: ${residentName}` : 'Medication alert'
  const severityLabel = severity ? `${capitalize(severity)} severity` : 'Needs follow-up'
  return `${residentLabel} - ${severityLabel}`
}

function formatTimestamp(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'earlier'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
