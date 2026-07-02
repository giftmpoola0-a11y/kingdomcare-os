import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { getCurrentUserAccess, type CurrentUserAccess } from '@/app/lib/supabase/access'
import type { Database, Json, Tables, TablesInsert } from '@/app/lib/supabase/database.types'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'

type TypedSupabaseClient = SupabaseClient<Database>
type ShiftReportRow = Tables<'shift_reports'>
type ShiftReportInsert = TablesInsert<'shift_reports'>

export type ShiftType = 'Morning' | 'Evening' | 'Overnight'

export interface ShiftReportNoteField {
  label: string
  value: string
}

interface ShiftReportAccessContext {
  access: CurrentUserAccess
  careHomeId: string
  userId: string
}

export interface ShiftReportRecord {
  id: string
  careHomeId: string
  residentId: string | null
  residentName: string
  createdBy: string
  shiftDate: string
  shiftType: ShiftType
  summary: string
  notes: ShiftReportNoteField[]
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface CreateShiftReportInput {
  residentId: string
  residentName: string
  shiftDate: string
  shiftType: ShiftType
  summary: string
  notes: ShiftReportNoteField[]
}

export async function getCurrentCareHomeShiftReports(limit = 20): Promise<ShiftReportRecord[]> {
  const { supabase, careHomeId } = await getShiftReportContext()
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 50) : 20
  const { data, error } = await supabase
    .from('shift_reports')
    .select('*')
    .eq('care_home_id', careHomeId)
    .is('deleted_at', null)
    .order('shift_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(safeLimit)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map(mapShiftReportRowToRecord)
}

export async function getCurrentCareHomeShiftReportById(id: string): Promise<ShiftReportRecord | null> {
  const normalizedId = id.trim()

  if (!normalizedId) {
    return null
  }

  const { supabase, careHomeId } = await getShiftReportContext()
  const { data, error } = await supabase
    .from('shift_reports')
    .select('*')
    .eq('id', normalizedId)
    .eq('care_home_id', careHomeId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data ? mapShiftReportRowToRecord(data) : null
}

export async function createShiftReport(input: CreateShiftReportInput): Promise<ShiftReportRecord> {
  const { supabase, careHomeId, userId } = await getShiftReportContext()
  const payload: ShiftReportInsert = {
    care_home_id: careHomeId,
    resident_id: input.residentId,
    resident_name_snapshot: input.residentName.trim(),
    created_by: userId,
    shift_date: input.shiftDate,
    shift_type: input.shiftType,
    summary: input.summary.trim(),
    notes: serializeNoteFields(input.notes),
    deleted_at: null,
  }

  const { data, error } = await supabase.from('shift_reports').insert(payload).select('*').single()

  if (error) {
    throw new Error(error.message)
  }

  return mapShiftReportRowToRecord(data)
}

export function mapShiftReportRowToRecord(row: ShiftReportRow): ShiftReportRecord {
  return {
    id: row.id,
    careHomeId: row.care_home_id,
    residentId: row.resident_id,
    residentName: row.resident_name_snapshot,
    createdBy: row.created_by,
    shiftDate: row.shift_date,
    shiftType: normalizeShiftType(row.shift_type),
    summary: row.summary,
    notes: normalizeNoteFields(row.notes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }
}

async function getShiftReportContext() {
  const supabase = await getSupabaseServerClient()
  const access = await getCurrentUserAccess(supabase)
  const context = getShiftReportAccessContext(access)

  return {
    supabase: supabase as TypedSupabaseClient,
    ...context,
  }
}

function getShiftReportAccessContext(access: CurrentUserAccess): ShiftReportAccessContext {
  if (!access.user) {
    throw new Error('You must be signed in to access shift reports.')
  }

  if (!access.membership || !access.careHomeId || !access.role) {
    throw new Error('You must belong to a care home to access shift reports.')
  }

  return {
    access,
    careHomeId: access.careHomeId,
    userId: access.user.id,
  }
}

function normalizeShiftType(value: string | null | undefined): ShiftType {
  return value === 'Evening' || value === 'Overnight' ? value : 'Morning'
}

function normalizeNoteFields(value: Json): ShiftReportNoteField[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((entry) => {
    if (!entry || Array.isArray(entry) || typeof entry !== 'object') {
      return []
    }

    const label = 'label' in entry ? entry.label : undefined
    const noteValue = 'value' in entry ? entry.value : undefined

    if (typeof label !== 'string' || typeof noteValue !== 'string') {
      return []
    }

    return [{ label, value: noteValue }]
  })
}

function serializeNoteFields(notes: ShiftReportNoteField[]): Json {
  return notes.map((note) => ({
    label: note.label,
    value: note.value,
  }))
}
