import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { getCurrentUserAccess, type CurrentUserAccess } from '@/app/lib/supabase/access'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'

type TypedSupabaseClient = SupabaseClient<any>

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical'
export type IncidentStatus = 'open' | 'reviewing' | 'resolved' | 'archived'

interface IncidentRow {
  id: string
  care_home_id: string
  resident_id: string | null
  incident_type: string
  severity: string
  status: string
  occurred_at: string
  location: string | null
  description: string
  immediate_action: string | null
  follow_up_required: boolean
  follow_up_notes: string | null
  reported_by: string | null
  created_by: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

interface IncidentAccessContext {
  access: CurrentUserAccess
  careHomeId: string
  userId: string
}

export interface IncidentRecord {
  id: string
  careHomeId: string
  residentId: string | null
  incidentType: string
  severity: IncidentSeverity
  status: IncidentStatus
  occurredAt: string
  location: string
  description: string
  immediateAction: string
  followUpRequired: boolean
  whoNotified: string
  followUpNotes: string
  reportedBy: string | null
  createdBy: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface CreateIncidentInput {
  residentId?: string | null
  incidentType: string
  severity?: IncidentSeverity | null
  status?: IncidentStatus | null
  occurredAt?: string | null
  location?: string | null
  description: string
  immediateAction?: string | null
  followUpRequired?: boolean | null
  whoNotified?: string | null
  followUpNotes?: string | null
  reportedBy?: string | null
}

export interface UpdateIncidentInput {
  id: string
  residentId?: string | null
  incidentType?: string
  severity?: IncidentSeverity
  status?: IncidentStatus
  occurredAt?: string | null
  location?: string | null
  description?: string
  immediateAction?: string | null
  followUpRequired?: boolean | null
  whoNotified?: string | null
  followUpNotes?: string | null
  reportedBy?: string | null
  resolvedAt?: string | null
}

const INCIDENT_METADATA_PREFIX = '[[incident_meta]]'

export async function getCurrentCareHomeIncidents(): Promise<IncidentRecord[]> {
  const { supabase, careHomeId } = await getIncidentContext('read')
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .eq('care_home_id', careHomeId)
    .is('deleted_at', null)
    .order('occurred_at', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => mapIncidentRowToRecord(row as IncidentRow))
}

export async function getOpenCurrentCareHomeIncidents(): Promise<IncidentRecord[]> {
  const { supabase, careHomeId } = await getIncidentContext('read')
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .eq('care_home_id', careHomeId)
    .in('status', ['open', 'reviewing'])
    .is('deleted_at', null)
    .order('occurred_at', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => mapIncidentRowToRecord(row as IncidentRow))
}

export async function getRecentCurrentCareHomeIncidents(limit = 10): Promise<IncidentRecord[]> {
  const { supabase, careHomeId } = await getIncidentContext('read')
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 50) : 10
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .eq('care_home_id', careHomeId)
    .is('deleted_at', null)
    .order('occurred_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(safeLimit)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => mapIncidentRowToRecord(row as IncidentRow))
}

export async function createIncident(input: CreateIncidentInput): Promise<IncidentRecord> {
  const { supabase, careHomeId, userId } = await getIncidentContext('write')
  const payload = {
    care_home_id: careHomeId,
    resident_id: normalizeOptionalText(input.residentId),
    incident_type: input.incidentType.trim(),
    severity: normalizeIncidentSeverity(input.severity),
    status: normalizeIncidentStatus(input.status),
    occurred_at: normalizeTimestamp(input.occurredAt) ?? new Date().toISOString(),
    location: normalizeOptionalText(input.location),
    description: input.description.trim(),
    immediate_action: normalizeOptionalText(input.immediateAction),
    follow_up_required: normalizeFollowUpRequired(input.followUpRequired, input.followUpNotes),
    follow_up_notes: serializeIncidentMeta(input.whoNotified, input.followUpNotes),
    reported_by: normalizeOptionalText(input.reportedBy) ?? userId,
    created_by: userId,
    deleted_at: null,
  }

  const { data, error } = await supabase.from('incidents').insert(payload).select('*').single()

  if (error) {
    throw new Error(error.message)
  }

  return mapIncidentRowToRecord(data as IncidentRow)
}

export async function updateIncident(input: UpdateIncidentInput): Promise<IncidentRecord> {
  const { supabase, careHomeId } = await getIncidentContext('manage')
  const updates = buildIncidentUpdatePayload(input)

  if (Object.keys(updates).length === 0) {
    const existingIncident = await getIncidentRowById(supabase, careHomeId, input.id)

    if (!existingIncident) {
      throw new Error('Incident not found.')
    }

    return mapIncidentRowToRecord(existingIncident)
  }

  const { data, error } = await supabase
    .from('incidents')
    .update(updates)
    .eq('care_home_id', careHomeId)
    .eq('id', input.id)
    .is('deleted_at', null)
    .select('*')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Incident not found.')
  }

  return mapIncidentRowToRecord(data as IncidentRow)
}

export async function resolveIncident(incidentId: string): Promise<IncidentRecord> {
  const { supabase, careHomeId } = await getIncidentContext('manage')
  const { data, error } = await supabase
    .from('incidents')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    })
    .eq('care_home_id', careHomeId)
    .eq('id', incidentId)
    .is('deleted_at', null)
    .select('*')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Incident not found.')
  }

  return mapIncidentRowToRecord(data as IncidentRow)
}

export async function archiveIncident(incidentId: string): Promise<IncidentRecord> {
  const { supabase, careHomeId } = await getIncidentContext('manage')
  const { data, error } = await supabase
    .from('incidents')
    .update({
      status: 'archived',
      resolved_at: null,
    })
    .eq('care_home_id', careHomeId)
    .eq('id', incidentId)
    .is('deleted_at', null)
    .select('*')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Incident not found.')
  }

  return mapIncidentRowToRecord(data as IncidentRow)
}

export async function softDeleteIncident(incidentId: string): Promise<void> {
  const { supabase, careHomeId } = await getIncidentContext('manage')
  const incident = await getIncidentRowById(supabase, careHomeId, incidentId)

  if (!incident) {
    throw new Error('Incident not found.')
  }

  const { error } = await supabase
    .from('incidents')
    .update({
      deleted_at: new Date().toISOString(),
      status: 'archived',
    })
    .eq('care_home_id', careHomeId)
    .eq('id', incidentId)
    .is('deleted_at', null)

  if (error) {
    throw new Error(error.message)
  }

  const { data: stillVisibleIncident, error: verifyError } = await supabase
    .from('incidents')
    .select('id')
    .eq('care_home_id', careHomeId)
    .eq('id', incidentId)
    .is('deleted_at', null)
    .maybeSingle()

  if (verifyError) {
    throw new Error(verifyError.message)
  }

  if (stillVisibleIncident) {
    throw new Error('Incident soft delete did not persist.')
  }
}

export function mapIncidentRowToRecord(row: IncidentRow): IncidentRecord {
  const meta = parseIncidentMeta(row.follow_up_notes)

  return {
    id: row.id,
    careHomeId: row.care_home_id,
    residentId: row.resident_id,
    incidentType: row.incident_type,
    severity: normalizeIncidentSeverity(row.severity),
    status: normalizeIncidentStatus(row.status),
    occurredAt: row.occurred_at,
    location: row.location ?? '',
    description: row.description,
    immediateAction: row.immediate_action ?? '',
    followUpRequired: Boolean(row.follow_up_required),
    whoNotified: meta.whoNotified,
    followUpNotes: meta.followUpNotes,
    reportedBy: row.reported_by,
    createdBy: row.created_by,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }
}

async function getIncidentContext(requiredAccess: 'read' | 'write' | 'manage') {
  const supabase = (await getSupabaseServerClient()) as TypedSupabaseClient
  const access = await getCurrentUserAccess(supabase)
  const context = getIncidentAccessContext(access)

  if (requiredAccess === 'manage' && access.role !== 'admin' && access.role !== 'nurse') {
    throw new Error('Only care home admins and nurses can manage incidents.')
  }

  return {
    supabase,
    ...context,
  }
}

function getIncidentAccessContext(access: CurrentUserAccess): IncidentAccessContext {
  if (!access.user) {
    throw new Error('You must be signed in to access incidents.')
  }

  if (!access.membership || !access.careHomeId || !access.role) {
    throw new Error('You must belong to a care home to access incidents.')
  }

  return {
    access,
    careHomeId: access.careHomeId,
    userId: access.user.id,
  }
}

async function getIncidentRowById(
  supabase: TypedSupabaseClient,
  careHomeId: string,
  incidentId: string
) {
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .eq('care_home_id', careHomeId)
    .eq('id', incidentId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data as IncidentRow | null
}

function buildIncidentUpdatePayload(input: UpdateIncidentInput) {
  const payload: Record<string, string | boolean | null> = {}

  if ('residentId' in input) {
    payload.resident_id = normalizeOptionalText(input.residentId)
  }

  if ('incidentType' in input && typeof input.incidentType === 'string') {
    payload.incident_type = input.incidentType.trim()
  }

  if ('severity' in input && input.severity) {
    payload.severity = normalizeIncidentSeverity(input.severity)
  }

  if ('status' in input && input.status) {
    payload.status = normalizeIncidentStatus(input.status)
  }

  if ('occurredAt' in input) {
    payload.occurred_at = normalizeTimestamp(input.occurredAt)
  }

  if ('location' in input) {
    payload.location = normalizeOptionalText(input.location)
  }

  if ('description' in input && typeof input.description === 'string') {
    payload.description = input.description.trim()
  }

  if ('immediateAction' in input) {
    payload.immediate_action = normalizeOptionalText(input.immediateAction)
  }

  if ('followUpRequired' in input) {
    payload.follow_up_required = normalizeFollowUpRequired(input.followUpRequired, input.followUpNotes)
    payload.follow_up_notes = serializeIncidentMeta(input.whoNotified, input.followUpNotes)
  } else if ('followUpNotes' in input || 'whoNotified' in input) {
    payload.follow_up_notes = serializeIncidentMeta(input.whoNotified, input.followUpNotes)
  }

  if ('reportedBy' in input) {
    payload.reported_by = normalizeOptionalText(input.reportedBy)
  }

  if ('resolvedAt' in input) {
    payload.resolved_at = normalizeTimestamp(input.resolvedAt)
  }

  return payload
}

function normalizeOptionalText(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizeTimestamp(value: string | null | undefined) {
  const normalized = normalizeOptionalText(value)
  return normalized ? normalized : null
}

function normalizeFollowUpRequired(
  followUpRequired: boolean | null | undefined,
  notes: string | null | undefined
) {
  if (typeof followUpRequired === 'boolean') {
    return followUpRequired
  }

  return Boolean(normalizeOptionalText(notes))
}

function parseIncidentMeta(value: string | null | undefined) {
  const normalized = normalizeOptionalText(value)

  if (!normalized) {
    return {
      whoNotified: '',
      followUpNotes: '',
    }
  }

  if (normalized.startsWith(INCIDENT_METADATA_PREFIX)) {
    const payload = normalized.slice(INCIDENT_METADATA_PREFIX.length).trim()

    try {
      const parsed = JSON.parse(payload) as {
        whoNotified?: unknown
        followUpNotes?: unknown
      }

      return {
        whoNotified:
          typeof parsed?.whoNotified === 'string' ? parsed.whoNotified.trim() : '',
        followUpNotes:
          typeof parsed?.followUpNotes === 'string' ? parsed.followUpNotes.trim() : '',
      }
    } catch {
      return {
        whoNotified: '',
        followUpNotes: normalized,
      }
    }
  }

  return {
    whoNotified: '',
    followUpNotes: normalized,
  }
}

function serializeIncidentMeta(
  whoNotified: string | null | undefined,
  followUpNotes: string | null | undefined
) {
  const normalizedWhoNotified = normalizeOptionalText(whoNotified)
  const normalizedFollowUpNotes = normalizeOptionalText(followUpNotes)

  if (!normalizedWhoNotified && !normalizedFollowUpNotes) {
    return null
  }

  return `${INCIDENT_METADATA_PREFIX}\n${JSON.stringify({
    whoNotified: normalizedWhoNotified ?? '',
    followUpNotes: normalizedFollowUpNotes ?? '',
  })}`
}

function normalizeIncidentSeverity(value: string | null | undefined): IncidentSeverity {
  return value === 'low' || value === 'high' || value === 'critical' ? value : 'medium'
}

function normalizeIncidentStatus(value: string | null | undefined): IncidentStatus {
  return value === 'reviewing' || value === 'resolved' || value === 'archived' ? value : 'open'
}
