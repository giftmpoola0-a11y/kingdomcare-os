import { NextResponse } from 'next/server'
import { APP_NAV_HREFS, canAccessAppNavLabel } from '@/app/lib/app-navigation'
import { measureServerStep } from '@/app/lib/perf'
import { type CurrentUserAccess } from '@/app/lib/supabase/access'
import { getCurrentUserServerAccess } from '@/app/lib/supabase/server-access'
import type { TypedSupabaseClient } from '@/app/lib/supabase/shared'
import type { TablesInsert } from '@/app/lib/supabase/database.types'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'

export const dynamic = 'force-dynamic'

const TASK_ALERT_LIMIT = 4
const INCIDENT_ALERT_LIMIT = 4
const MEDICATION_ALERT_LIMIT = 3
const TOTAL_LIMIT = 8
const RESIDENT_ADDITION_LIMIT = 5

type TopbarNotificationKind = 'task' | 'incident' | 'medication_alert' | 'resident'
type TopbarNotificationGroup = 'operational' | 'resident'

interface TopbarNotificationItem {
  id: string
  kind: TopbarNotificationKind
  group: TopbarNotificationGroup
  title: string
  subtitle: string
  href: string
  checked: boolean
  checkable: boolean
  notificationKey: string | null
  statusLabel: string
}

interface AlertsPayload {
  totalCount: number
  unreadCount: number
  items: TopbarNotificationItem[]
}

interface ResidentAdditionRow {
  id: string
  full_name: string
  created_at: string
}

export async function GET() {
  try {
    const supabase = (await getSupabaseServerClient()) as TypedSupabaseClient
    const access = await getCurrentUserServerAccess(supabase)
    const authErrorResponse = getAlertsAuthErrorResponse(access)

    if (authErrorResponse) {
      return authErrorResponse
    }

    return NextResponse.json(
      await measureServerStep(
        'api:/api/chrome/alerts:GET',
        () => buildAlertsPayload(supabase, access),
        { role: access.role }
      )
    )
  } catch (error) {
    console.error('Topbar alerts failed:', error)
    return NextResponse.json({ error: 'Unable to load alerts right now.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = (await getSupabaseServerClient()) as TypedSupabaseClient
    const access = await getCurrentUserServerAccess(supabase)
    const authErrorResponse = getAlertsAuthErrorResponse(access)

    if (authErrorResponse) {
      return authErrorResponse
    }

    const payload = (await request.json().catch(() => null)) as {
      notificationKeys?: unknown
    } | null

    const submittedKeys = Array.isArray(payload?.notificationKeys)
      ? payload.notificationKeys.filter((key): key is string => typeof key === 'string' && key.trim().length > 0)
      : []

    if (submittedKeys.length === 0) {
      return NextResponse.json({ error: 'No notification keys were provided.' }, { status: 400 })
    }

    const visibleResidentAdditions = await getRecentResidentAdditions(supabase, access)
    const visibleResidentKeys = new Set(visibleResidentAdditions.map((resident) => buildResidentNotificationKey(resident)))
    const allowedKeys = Array.from(new Set(submittedKeys.filter((key) => visibleResidentKeys.has(key))))

    if (allowedKeys.length === 0) {
      return NextResponse.json({ error: 'No visible resident notifications were eligible to mark as checked.' }, { status: 400 })
    }

    const rows: TablesInsert<'notification_reads'>[] = allowedKeys.map((notificationKey) => ({
      user_id: access.user!.id,
      notification_key: notificationKey,
      read_at: new Date().toISOString(),
    }))

    const { error } = await supabase
      .from('notification_reads')
      .upsert(rows, { onConflict: 'user_id,notification_key' })

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json(
      await measureServerStep(
        'api:/api/chrome/alerts:POST',
        () => buildAlertsPayload(supabase, access),
        { role: access.role, keys: allowedKeys.length }
      )
    )
  } catch (error) {
    console.error('Topbar alert updates failed:', error)
    return NextResponse.json({ error: 'Unable to update notifications right now.' }, { status: 500 })
  }
}

async function buildAlertsPayload(supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>, access: CurrentUserAccess): Promise<AlertsPayload> {
  const taskAlertsEnabled = canAccessAppNavLabel(access.role, 'Tasks')
  const incidentAlertsEnabled = canAccessAppNavLabel(access.role, 'Incidents')
  const medicationAlertsEnabled =
    canAccessAppNavLabel(access.role, 'Medications') && access.role !== 'caregiver'
  const residentAdditionsEnabled = canAccessAppNavLabel(access.role, 'Residents')
  const nowIso = new Date().toISOString()

  const overdueTasksPromise = taskAlertsEnabled
    ? supabase
        .from('tasks')
        .select('id, resident_id, title, due_at')
        .eq('care_home_id', access.careHomeId!)
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
        .eq('care_home_id', access.careHomeId!)
        .is('deleted_at', null)
        .in('status', ['open', 'reviewing'])
        .order('occurred_at', { ascending: false })
        .limit(INCIDENT_ALERT_LIMIT)
    : Promise.resolve({ data: [], error: null })

  const medicationAlertsPromise = medicationAlertsEnabled
    ? supabase
        .from('medication_alerts')
        .select('id, resident_id, message, severity, due_at')
        .eq('care_home_id', access.careHomeId!)
        .is('deleted_at', null)
        .in('status', ['open', 'reviewing'])
        .order('created_at', { ascending: false })
        .limit(MEDICATION_ALERT_LIMIT)
    : Promise.resolve({ data: [], error: null })

  const recentResidentAdditionsPromise = residentAdditionsEnabled
    ? getRecentResidentAdditions(supabase, access)
    : Promise.resolve([])

  const [
    overdueTasksResponse,
    openIncidentsResponse,
    medicationAlertsResponse,
    recentResidentAdditions,
  ] = await Promise.all([
    overdueTasksPromise,
    openIncidentsPromise,
    medicationAlertsPromise,
    recentResidentAdditionsPromise,
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
      .eq('care_home_id', access.careHomeId!)
      .is('deleted_at', null)
      .in('id', Array.from(residentIds))

    if (error) {
      throw new Error(error.message)
    }

    for (const resident of residents ?? []) {
      residentNameById.set(resident.id, resident.full_name)
    }
  }

  const operationalItems: TopbarNotificationItem[] = [
    ...(overdueTasksResponse.data ?? []).map((task) => ({
      id: task.id,
      kind: 'task' as const,
      group: 'operational' as const,
      title: task.title,
      subtitle: buildTaskAlertSubtitle(
        task.due_at,
        residentNameById.get(task.resident_id ?? '') ?? null,
      ),
      href: APP_NAV_HREFS.Tasks,
      checked: false,
      checkable: false,
      notificationKey: null,
      statusLabel: 'Needs attention',
    })),
    ...(openIncidentsResponse.data ?? []).map((incident) => ({
      id: incident.id,
      kind: 'incident' as const,
      group: 'operational' as const,
      title: incident.incident_type,
      subtitle: buildIncidentAlertSubtitle(
        incident.severity,
        residentNameById.get(incident.resident_id ?? '') ?? null,
      ),
      href: `${APP_NAV_HREFS.Incidents}/${incident.id}`,
      checked: false,
      checkable: false,
      notificationKey: null,
      statusLabel: 'Needs attention',
    })),
    ...(medicationAlertsResponse.data ?? []).map((alert) => ({
      id: alert.id,
      kind: 'medication_alert' as const,
      group: 'operational' as const,
      title: alert.message,
      subtitle: buildMedicationAlertSubtitle(
        alert.severity,
        residentNameById.get(alert.resident_id ?? '') ?? null,
      ),
      href: APP_NAV_HREFS.Medications,
      checked: false,
      checkable: false,
      notificationKey: null,
      statusLabel: 'Needs attention',
    })),
  ].slice(0, TOTAL_LIMIT)

  const residentKeys = recentResidentAdditions.map((resident) => buildResidentNotificationKey(resident))
  const readKeys = residentKeys.length > 0 ? await getReadNotificationKeys(supabase, access.user!.id, residentKeys) : new Set<string>()

  const residentItems: TopbarNotificationItem[] = recentResidentAdditions.map((resident) => {
    const notificationKey = buildResidentNotificationKey(resident)
    const checked = readKeys.has(notificationKey)

    return {
      id: resident.id,
      kind: 'resident',
      group: 'resident',
      title: `Resident added: ${resident.full_name}`,
      subtitle: buildResidentAdditionSubtitle(resident.created_at),
      href: `${APP_NAV_HREFS.Residents}/${resident.id}`,
      checked,
      checkable: true,
      notificationKey,
      statusLabel: checked ? 'Checked' : 'Unchecked',
    }
  })

  const items = [...operationalItems, ...residentItems]

  return {
    totalCount: items.length,
    unreadCount: residentItems.filter((item) => !item.checked).length,
    items,
  }
}

async function getRecentResidentAdditions(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  access: CurrentUserAccess
) {
  return measureServerStep(
    'supabase:alerts:recent-residents',
    async () => {
      const { data, error } = await supabase
        .from('residents')
        .select('id, full_name, created_at')
        .eq('care_home_id', access.careHomeId!)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(RESIDENT_ADDITION_LIMIT)

      if (error) {
        throw new Error(error.message)
      }

      return (data ?? []) as ResidentAdditionRow[]
    },
    { careHomeId: access.careHomeId }
  )
}

async function getReadNotificationKeys(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  userId: string,
  notificationKeys: string[]
) {
  const data = await measureServerStep(
    'supabase:alerts:notification-reads',
    async () => {
      const { data, error } = await supabase
        .from('notification_reads')
        .select('notification_key')
        .eq('user_id', userId)
        .in('notification_key', notificationKeys)

      if (error) {
        throw new Error(error.message)
      }

      return data ?? []
    },
    { userId, keyCount: notificationKeys.length }
  )

  return new Set(data.map((row) => row.notification_key))
}

function getAlertsAuthErrorResponse(access: CurrentUserAccess) {
  if (!access.isSignedIn) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  if (!access.careHomeId || !access.role) {
    return NextResponse.json({ error: 'Care home membership required.' }, { status: 403 })
  }

  return null
}

function buildResidentNotificationKey(resident: ResidentAdditionRow) {
  return `resident-added:${resident.id}:${resident.created_at}`
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

function buildResidentAdditionSubtitle(createdAt: string) {
  return `Added ${formatTimestamp(createdAt)}`
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






