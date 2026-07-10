import { NextResponse } from 'next/server'
import { APP_NAV_HREFS, canAccessAppNavLabel } from '@/app/lib/app-navigation'
import { getCurrentUserServerAccess } from '@/app/lib/supabase/server-access'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'
import type { TypedSupabaseClient } from '@/app/lib/supabase/shared'

export const dynamic = 'force-dynamic'

const CATEGORY_LIMIT = 5
const TOTAL_LIMIT = 10

interface SearchResult {
  id: string
  kind: 'resident' | 'task' | 'incident' | 'shift_report'
  title: string
  subtitle: string
  href: string
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? ''

  if (query.length < 2) {
    return NextResponse.json({ query, results: [] satisfies SearchResult[] })
  }

  try {
    const supabase = (await getSupabaseServerClient()) as TypedSupabaseClient
    const access = await getCurrentUserServerAccess(supabase)

    if (!access.isSignedIn) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    if (!access.careHomeId || !access.role) {
      return NextResponse.json({ error: 'Care home membership required.' }, { status: 403 })
    }

    const likeQuery = `%${escapeLikeQuery(query)}%`
    const residentSearchEnabled = canAccessAppNavLabel(access.role, 'Residents')
    const taskSearchEnabled = canAccessAppNavLabel(access.role, 'Tasks')
    const incidentSearchEnabled = canAccessAppNavLabel(access.role, 'Incidents')
    const shiftSearchEnabled = canAccessAppNavLabel(access.role, 'Shifts')

    const residentsPromise = residentSearchEnabled
      ? supabase
          .from('residents')
          .select('id, full_name, status')
          .eq('care_home_id', access.careHomeId)
          .is('deleted_at', null)
          .ilike('full_name', likeQuery)
          .order('full_name', { ascending: true })
          .limit(CATEGORY_LIMIT)
      : Promise.resolve({ data: [], error: null })

    const residentNameMatchesPromise = residentSearchEnabled
      ? supabase
          .from('residents')
          .select('id, full_name')
          .eq('care_home_id', access.careHomeId)
          .is('deleted_at', null)
          .ilike('full_name', likeQuery)
          .limit(CATEGORY_LIMIT)
      : Promise.resolve({ data: [], error: null })

    const taskTitlePromise = taskSearchEnabled
      ? supabase
          .from('tasks')
          .select('id, resident_id, title, description, due_at, status')
          .eq('care_home_id', access.careHomeId)
          .is('deleted_at', null)
          .in('status', ['open', 'in_progress'])
          .ilike('title', likeQuery)
          .order('due_at', { ascending: true, nullsFirst: false })
          .limit(CATEGORY_LIMIT)
      : Promise.resolve({ data: [], error: null })

    const taskDescriptionPromise = taskSearchEnabled
      ? supabase
          .from('tasks')
          .select('id, resident_id, title, description, due_at, status')
          .eq('care_home_id', access.careHomeId)
          .is('deleted_at', null)
          .in('status', ['open', 'in_progress'])
          .ilike('description', likeQuery)
          .order('due_at', { ascending: true, nullsFirst: false })
          .limit(CATEGORY_LIMIT)
      : Promise.resolve({ data: [], error: null })

    const incidentTypePromise = incidentSearchEnabled
      ? supabase
          .from('incidents')
          .select('id, resident_id, incident_type, description, severity, status, occurred_at')
          .eq('care_home_id', access.careHomeId)
          .is('deleted_at', null)
          .ilike('incident_type', likeQuery)
          .order('occurred_at', { ascending: false })
          .limit(CATEGORY_LIMIT)
      : Promise.resolve({ data: [], error: null })

    const incidentDescriptionPromise = incidentSearchEnabled
      ? supabase
          .from('incidents')
          .select('id, resident_id, incident_type, description, severity, status, occurred_at')
          .eq('care_home_id', access.careHomeId)
          .is('deleted_at', null)
          .ilike('description', likeQuery)
          .order('occurred_at', { ascending: false })
          .limit(CATEGORY_LIMIT)
      : Promise.resolve({ data: [], error: null })

    const shiftResidentPromise = shiftSearchEnabled
      ? supabase
          .from('shift_reports')
          .select('id, resident_id, resident_name_snapshot, summary, shift_date, shift_type')
          .eq('care_home_id', access.careHomeId)
          .is('deleted_at', null)
          .ilike('resident_name_snapshot', likeQuery)
          .order('shift_date', { ascending: false })
          .limit(CATEGORY_LIMIT)
      : Promise.resolve({ data: [], error: null })

    const shiftSummaryPromise = shiftSearchEnabled
      ? supabase
          .from('shift_reports')
          .select('id, resident_id, resident_name_snapshot, summary, shift_date, shift_type')
          .eq('care_home_id', access.careHomeId)
          .is('deleted_at', null)
          .ilike('summary', likeQuery)
          .order('shift_date', { ascending: false })
          .limit(CATEGORY_LIMIT)
      : Promise.resolve({ data: [], error: null })

    const [
      residentsResponse,
      residentNameMatchesResponse,
      taskTitleResponse,
      taskDescriptionResponse,
      incidentTypeResponse,
      incidentDescriptionResponse,
      shiftResidentResponse,
      shiftSummaryResponse,
    ] = await Promise.all([
      residentsPromise,
      residentNameMatchesPromise,
      taskTitlePromise,
      taskDescriptionPromise,
      incidentTypePromise,
      incidentDescriptionPromise,
      shiftResidentPromise,
      shiftSummaryPromise,
    ])

    const firstError = [
      residentsResponse.error,
      residentNameMatchesResponse.error,
      taskTitleResponse.error,
      taskDescriptionResponse.error,
      incidentTypeResponse.error,
      incidentDescriptionResponse.error,
      shiftResidentResponse.error,
      shiftSummaryResponse.error,
    ].find(Boolean)

    if (firstError) {
      throw new Error(firstError.message)
    }

    const matchedResidentIds = new Set<string>()
    for (const resident of residentNameMatchesResponse.data ?? []) {
      if (resident?.id) {
        matchedResidentIds.add(resident.id)
      }
    }

    const taskResidentResponse = taskSearchEnabled && matchedResidentIds.size > 0
      ? await supabase
          .from('tasks')
          .select('id, resident_id, title, description, due_at, status')
          .eq('care_home_id', access.careHomeId)
          .is('deleted_at', null)
          .in('status', ['open', 'in_progress'])
          .in('resident_id', Array.from(matchedResidentIds))
          .order('due_at', { ascending: true, nullsFirst: false })
          .limit(CATEGORY_LIMIT)
      : { data: [], error: null }

    const incidentResidentResponse = incidentSearchEnabled && matchedResidentIds.size > 0
      ? await supabase
          .from('incidents')
          .select('id, resident_id, incident_type, description, severity, status, occurred_at')
          .eq('care_home_id', access.careHomeId)
          .is('deleted_at', null)
          .in('resident_id', Array.from(matchedResidentIds))
          .order('occurred_at', { ascending: false })
          .limit(CATEGORY_LIMIT)
      : { data: [], error: null }

    if (taskResidentResponse.error) {
      throw new Error(taskResidentResponse.error.message)
    }

    if (incidentResidentResponse.error) {
      throw new Error(incidentResidentResponse.error.message)
    }

    const residentNameById = new Map<string, string>()
    for (const resident of residentsResponse.data ?? []) {
      residentNameById.set(resident.id, resident.full_name)
    }
    for (const resident of residentNameMatchesResponse.data ?? []) {
      residentNameById.set(resident.id, resident.full_name)
    }

    const supplementalResidentIds = new Set<string>()
    for (const record of [
      ...(taskTitleResponse.data ?? []),
      ...(taskDescriptionResponse.data ?? []),
      ...(taskResidentResponse.data ?? []),
      ...(incidentTypeResponse.data ?? []),
      ...(incidentDescriptionResponse.data ?? []),
      ...(incidentResidentResponse.data ?? []),
    ]) {
      if (record?.resident_id && !residentNameById.has(record.resident_id)) {
        supplementalResidentIds.add(record.resident_id)
      }
    }

    if (supplementalResidentIds.size > 0) {
      const { data: residentNames, error } = await supabase
        .from('residents')
        .select('id, full_name')
        .eq('care_home_id', access.careHomeId)
        .is('deleted_at', null)
        .in('id', Array.from(supplementalResidentIds))

      if (error) {
        throw new Error(error.message)
      }

      for (const resident of residentNames ?? []) {
        residentNameById.set(resident.id, resident.full_name)
      }
    }

    const residents = dedupeById(
      (residentsResponse.data ?? []).map((resident) => ({
        id: resident.id,
        kind: 'resident' as const,
        title: resident.full_name,
        subtitle: resident.status === 'archived' ? 'Archived resident record' : 'Resident record',
        href: `${APP_NAV_HREFS.Residents}/${resident.id}`,
      })),
      CATEGORY_LIMIT,
    )

    const tasks = dedupeById(
      [
        ...(taskTitleResponse.data ?? []),
        ...(taskDescriptionResponse.data ?? []),
        ...(taskResidentResponse.data ?? []),
      ].map((task) => ({
        id: task.id,
        kind: 'task' as const,
        title: task.title,
        subtitle: buildTaskSubtitle(task.description, residentNameById.get(task.resident_id ?? '') ?? null),
        href: APP_NAV_HREFS.Tasks,
      })),
      CATEGORY_LIMIT,
    )

    const incidents = dedupeById(
      [
        ...(incidentTypeResponse.data ?? []),
        ...(incidentDescriptionResponse.data ?? []),
        ...(incidentResidentResponse.data ?? []),
      ].map((incident) => ({
        id: incident.id,
        kind: 'incident' as const,
        title: incident.incident_type,
        subtitle: buildIncidentSubtitle(
          incident.description,
          residentNameById.get(incident.resident_id ?? '') ?? null,
        ),
        href: `${APP_NAV_HREFS.Incidents}/${incident.id}`,
      })),
      CATEGORY_LIMIT,
    )

    const shiftReports = dedupeById(
      [
        ...(shiftResidentResponse.data ?? []),
        ...(shiftSummaryResponse.data ?? []),
      ].map((shiftReport) => ({
        id: shiftReport.id,
        kind: 'shift_report' as const,
        title: shiftReport.resident_name_snapshot || 'Shift report',
        subtitle: buildShiftSubtitle(shiftReport.shift_type, shiftReport.summary),
        href: `${APP_NAV_HREFS.Shifts}/${shiftReport.id}`,
      })),
      CATEGORY_LIMIT,
    )

    const results = [...residents, ...tasks, ...incidents, ...shiftReports].slice(0, TOTAL_LIMIT)

    return NextResponse.json({ query, results })
  } catch (error) {
    console.error('Topbar search failed:', error)
    return NextResponse.json({ error: 'Unable to search right now.' }, { status: 500 })
  }
}

function dedupeById<T extends SearchResult>(results: T[], limit: number) {
  const seen = new Set<string>()
  const deduped: T[] = []

  for (const result of results) {
    const key = `${result.kind}:${result.id}`
    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    deduped.push(result)

    if (deduped.length >= limit) {
      break
    }
  }

  return deduped
}

function buildTaskSubtitle(description: string | null, residentName: string | null) {
  const residentLabel = residentName ? `Open task for ${residentName}` : 'Open task'
  const summary = trimSnippet(description)
  return summary ? `${residentLabel} - ${summary}` : residentLabel
}

function buildIncidentSubtitle(description: string | null, residentName: string | null) {
  const residentLabel = residentName ? `Incident for ${residentName}` : 'Incident record'
  const summary = trimSnippet(description)
  return summary ? `${residentLabel} - ${summary}` : residentLabel
}

function buildShiftSubtitle(shiftType: string | null, summary: string | null) {
  const prefix = shiftType ? `${shiftType} shift report` : 'Shift report'
  const snippet = trimSnippet(summary)
  return snippet ? `${prefix} - ${snippet}` : prefix
}

function trimSnippet(value: string | null | undefined, maxLength = 72) {
  if (typeof value !== 'string') {
    return ''
  }

  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return ''
  }

  if (normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}...`
}

function escapeLikeQuery(value: string) {
  return value.replace(/[%_]/g, '')
}


