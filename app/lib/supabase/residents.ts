import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { DemoResident, ResidentStatus } from '@/app/lib/reportTypes'
import { getCurrentUserAccess, type CurrentUserAccess } from '@/app/lib/supabase/access'
import type { Database, Tables, TablesInsert, TablesUpdate } from '@/app/lib/supabase/database.types'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'

type ResidentRow = Tables<'residents'>
type ResidentInsert = TablesInsert<'residents'>
type ResidentUpdate = TablesUpdate<'residents'>
type TypedSupabaseClient = SupabaseClient<Database>

export interface ResidentRecord extends DemoResident {
  status: ResidentStatus
}

export type CreateResidentInput = Omit<ResidentRecord, 'id' | 'status'> & {
  legacyLocalId?: string | null
}

export type UpdateResidentInput = Partial<Omit<ResidentRecord, 'id'>> & {
  id: string
  legacyLocalId?: string | null
}

interface ResidentAccessContext {
  access: CurrentUserAccess
  careHomeId: string
  userId: string
}

export async function getCurrentCareHomeResidents(): Promise<ResidentRecord[]> {
  const { supabase, careHomeId } = await getResidentContext('read')
  const { data, error } = await supabase
    .from('residents')
    .select('*')
    .eq('care_home_id', careHomeId)
    .is('deleted_at', null)
    .order('status', { ascending: true })
    .order('full_name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map(mapResidentRowToRecord)
}

export async function getActiveCurrentCareHomeResidents(): Promise<ResidentRecord[]> {
  const { supabase, careHomeId } = await getResidentContext('read')
  const { data, error } = await supabase
    .from('residents')
    .select('*')
    .eq('care_home_id', careHomeId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('full_name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map(mapResidentRowToRecord)
}

export async function getResidentById(residentId: string): Promise<ResidentRecord | null> {
  const { supabase, careHomeId } = await getResidentContext('read')
  const resident = await getResidentRowById(supabase, careHomeId, residentId)

  return resident ? mapResidentRowToRecord(resident) : null
}

export async function createResident(input: CreateResidentInput): Promise<ResidentRecord> {
  const { supabase, careHomeId, userId } = await getResidentContext('admin')
  const payload: ResidentInsert = {
    care_home_id: careHomeId,
    created_by: userId,
    full_name: input.name.trim(),
    age: normalizeResidentAgeForWrite(input.age),
    care_level: input.careLevel.trim(),
    primary_support_needs: serializePrimarySupportNeeds(input.primarySupportNeeds),
    notes: normalizeOptionalText(input.notes),
    status: 'active',
    legacy_local_id: normalizeOptionalText(input.legacyLocalId),
    deleted_at: null,
  }

  const { data, error } = await supabase.from('residents').insert(payload).select('*').single()

  if (error) {
    throw new Error(error.message)
  }

  return mapResidentRowToRecord(data)
}

export async function updateResident(input: UpdateResidentInput): Promise<ResidentRecord> {
  const { supabase, careHomeId } = await getResidentContext('admin')
  const updates = buildResidentUpdatePayload(input)

  if (Object.keys(updates).length === 0) {
    const existingResident = await getResidentRowById(supabase, careHomeId, input.id)

    if (!existingResident) {
      throw new Error('Resident not found.')
    }

    return mapResidentRowToRecord(existingResident)
  }

  const { data, error } = await supabase
    .from('residents')
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
    throw new Error('Resident not found.')
  }

  return mapResidentRowToRecord(data)
}

export async function archiveResident(residentId: string): Promise<ResidentRecord> {
  const { supabase, careHomeId } = await getResidentContext('admin')
  const { data, error } = await supabase
    .from('residents')
    .update({ status: 'archived' })
    .eq('care_home_id', careHomeId)
    .eq('id', residentId)
    .is('deleted_at', null)
    .select('*')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Resident not found.')
  }

  return mapResidentRowToRecord(data)
}

export async function softDeleteResident(residentId: string): Promise<void> {
  const { supabase, careHomeId } = await getResidentContext('admin')
  const resident = await getResidentRowById(supabase, careHomeId, residentId)

  if (!resident) {
    throw new Error('Resident not found.')
  }

  const { error } = await supabase
    .from('residents')
    .update({
      deleted_at: new Date().toISOString(),
      status: 'archived',
    })
    .eq('care_home_id', careHomeId)
    .eq('id', residentId)
    .is('deleted_at', null)

  if (error) {
    throw new Error(error.message)
  }

  const { data: stillVisibleResident, error: verifyError } = await supabase
    .from('residents')
    .select('id')
    .eq('care_home_id', careHomeId)
    .eq('id', residentId)
    .is('deleted_at', null)
    .maybeSingle()

  if (verifyError) {
    throw new Error(verifyError.message)
  }

  if (stillVisibleResident) {
    throw new Error('Resident soft delete did not persist.')
  }
}

export function mapResidentRowToRecord(row: ResidentRow): ResidentRecord {
  return {
    id: row.id,
    name: row.full_name,
    // The current UI expects a number, so null DB ages are mapped to 0 until the UI is migrated.
    age: typeof row.age === 'number' ? row.age : 0,
    careLevel: row.care_level,
    primarySupportNeeds: parsePrimarySupportNeeds(row.primary_support_needs),
    notes: row.notes ?? '',
    status: normalizeResidentStatus(row.status),
  }
}

async function getResidentContext(requiredAccess: 'read' | 'admin') {
  const supabase = (await getSupabaseServerClient()) as TypedSupabaseClient
  const access = await getCurrentUserAccess(supabase)
  const context = getResidentAccessContext(access)

  if (requiredAccess === 'admin' && access.role !== 'admin') {
    throw new Error('Only care home admins can manage residents.')
  }

  return {
    supabase,
    ...context,
  }
}

function getResidentAccessContext(access: CurrentUserAccess): ResidentAccessContext {
  if (!access.user) {
    throw new Error('You must be signed in to access residents.')
  }

  if (!access.membership || !access.careHomeId || !access.role) {
    throw new Error('You must belong to a care home to access residents.')
  }

  return {
    access,
    careHomeId: access.careHomeId,
    userId: access.user.id,
  }
}

async function getResidentRowById(
  supabase: TypedSupabaseClient,
  careHomeId: string,
  residentId: string
) {
  const { data, error } = await supabase
    .from('residents')
    .select('*')
    .eq('care_home_id', careHomeId)
    .eq('id', residentId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

function buildResidentUpdatePayload(input: UpdateResidentInput): ResidentUpdate {
  const payload: ResidentUpdate = {}

  if ('name' in input && typeof input.name === 'string') {
    payload.full_name = input.name.trim()
  }

  if ('age' in input) {
    payload.age = normalizeResidentAgeForWrite(input.age ?? null)
  }

  if ('careLevel' in input && typeof input.careLevel === 'string') {
    payload.care_level = input.careLevel.trim()
  }

  if ('primarySupportNeeds' in input && Array.isArray(input.primarySupportNeeds)) {
    payload.primary_support_needs = serializePrimarySupportNeeds(input.primarySupportNeeds)
  }

  if ('notes' in input && typeof input.notes === 'string') {
    payload.notes = normalizeOptionalText(input.notes)
  }

  if ('status' in input && input.status) {
    payload.status = normalizeResidentStatus(input.status)
  }

  if ('legacyLocalId' in input) {
    payload.legacy_local_id = normalizeOptionalText(input.legacyLocalId)
  }

  return payload
}

function normalizeResidentAgeForWrite(age: number | null | undefined) {
  if (typeof age !== 'number' || !Number.isFinite(age)) {
    return null
  }

  return Math.trunc(age)
}

function normalizeOptionalText(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function parsePrimarySupportNeeds(value: string | null): string[] {
  if (!value) {
    return []
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return []
  }

  try {
    const parsed = JSON.parse(trimmed)

    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    }
  } catch {
    // Fallback for any pre-JSON text values that may exist during migration.
  }

  return trimmed
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function serializePrimarySupportNeeds(value: string[]): string | null {
  const normalized = value.map((item) => item.trim()).filter(Boolean)
  return normalized.length > 0 ? JSON.stringify(normalized) : null
}

function normalizeResidentStatus(status: string): ResidentStatus {
  return status === 'archived' ? 'archived' : 'active'
}
