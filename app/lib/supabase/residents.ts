import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { logServerPerf, measureServerStep } from '@/app/lib/perf'
import type { DemoResident, ResidentStatus } from '@/app/lib/reportTypes'
import { type CurrentUserAccess } from '@/app/lib/supabase/access'
import { getCurrentUserServerAccess } from '@/app/lib/supabase/server-access'
import type { Database, Tables, TablesInsert, TablesUpdate } from '@/app/lib/supabase/database.types'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'

type ResidentRow = Tables<'residents'>
type ResidentRecordRow = Pick<
  ResidentRow,
  | 'id'
  | 'full_name'
  | 'age'
  | 'care_level'
  | 'primary_support_needs'
  | 'notes'
  | 'sex'
  | 'status'
  | 'created_at'
  | 'updated_at'
  | 'photo_path'
>
type ResidentInsert = TablesInsert<'residents'>
type ResidentUpdate = TablesUpdate<'residents'>
type TypedSupabaseClient = SupabaseClient<Database>

export type ResidentSex = 'male' | 'female' | 'other' | 'unknown'

export interface ResidentRecord extends DemoResident {
  status: ResidentStatus
  sex: ResidentSex
  photoUrl: string | null
}

export interface ResidentListRecord extends ResidentRecord {
  photoPath: string | null
}

export interface ResidentListItem {
  id: string
  name: string
  status: ResidentStatus
}

const RESIDENT_PHOTOS_BUCKET = 'resident-photos'
const RESIDENT_PHOTO_SIGNED_URL_TTL_SECONDS = 60 * 60
const MAX_RESIDENT_PHOTO_BYTES = 5 * 1024 * 1024
const RESIDENT_RECORD_SELECT =
  'id, full_name, age, care_level, primary_support_needs, notes, sex, status, created_at, updated_at, photo_path'
const RESIDENT_LIST_ITEM_SELECT = 'id, full_name, status'
const RESIDENT_PHOTO_EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
const RESIDENT_PHOTO_TYPE_ERROR_MESSAGE = 'Photo must be a JPG, JPEG, PNG, or WebP image.'
const RESIDENT_PHOTO_SIZE_ERROR_MESSAGE = 'Photo must be smaller than 5MB.'

export interface ResidentActivityRecord {
  id: string
  name: string
  status: ResidentStatus
  createdAt: string
  updatedAt: string
}

export type CreateResidentInput = Omit<ResidentRecord, 'id' | 'status' | 'photoUrl'> & {
  legacyLocalId?: string | null
}

export type UpdateResidentInput = Partial<Omit<ResidentRecord, 'id' | 'photoUrl'>> & {
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
  const data = await measureServerStep(
    'supabase:residents:list',
    async () => {
      const { data, error } = await supabase
        .from('residents')
        .select(RESIDENT_RECORD_SELECT)
        .eq('care_home_id', careHomeId)
        .is('deleted_at', null)
        .order('status', { ascending: true })
        .order('full_name', { ascending: true })

      if (error) {
        throw new Error(error.message)
      }

      return (data ?? []) as unknown as ResidentRecordRow[]
    },
    { careHomeId }
  )
  return mapResidentRowsToRecords(supabase, data)
}

export async function getCurrentCareHomeResidentCards(): Promise<ResidentListRecord[]> {
  const { supabase, careHomeId } = await getResidentContext('read')
  const data = await measureServerStep(
    'supabase:residents:list',
    async () => {
      const { data, error } = await supabase
        .from('residents')
        .select(RESIDENT_RECORD_SELECT)
        .eq('care_home_id', careHomeId)
        .is('deleted_at', null)
        .order('status', { ascending: true })
        .order('full_name', { ascending: true })

      if (error) {
        throw new Error(error.message)
      }

      return (data ?? []) as unknown as ResidentRecordRow[]
    },
    { careHomeId }
  )

  logServerPerf('supabase:residents:list-payload', 0, {
    careHomeId,
    residentCount: data.length,
    photoCount: data.filter((row) => typeof row.photo_path === 'string' && row.photo_path.length > 0).length,
    payloadBytes: Buffer.byteLength(JSON.stringify(data), 'utf8'),
  })

  return data.map(mapResidentRowToListRecord)
}

export async function getActiveCurrentCareHomeResidents(): Promise<ResidentRecord[]> {
  const { supabase, careHomeId } = await getResidentContext('read')
  const data = await measureServerStep(
    'supabase:residents:active',
    async () => {
      const { data, error } = await supabase
        .from('residents')
        .select(RESIDENT_RECORD_SELECT)
        .eq('care_home_id', careHomeId)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('full_name', { ascending: true })

      if (error) {
        throw new Error(error.message)
      }

      return (data ?? []) as unknown as ResidentRecordRow[]
    },
    { careHomeId }
  )
  return mapResidentRowsToRecords(supabase, data)
}

export async function getCurrentCareHomeResidentListItems(options?: {
  activeOnly?: boolean
}): Promise<ResidentListItem[]> {
  const { supabase, careHomeId } = await getResidentContext('read')
  const activeOnly = options?.activeOnly === true
  let query = supabase
    .from('residents')
    .select(RESIDENT_LIST_ITEM_SELECT)
    .eq('care_home_id', careHomeId)
    .is('deleted_at', null)
    .order('status', { ascending: true })
    .order('full_name', { ascending: true })

  if (activeOnly) {
    query = query.eq('status', 'active')
  }

  const data = await measureServerStep(
    activeOnly ? 'supabase:residents:list-items:active' : 'supabase:residents:list-items',
    async () => {
      const { data, error } = await query

      if (error) {
        throw new Error(error.message)
      }

      return data ?? []
    },
    { careHomeId, activeOnly }
  )

  return data.map((row) => ({
    id: row.id,
    name: row.full_name,
    status: normalizeResidentStatus(row.status),
  }))
}

export async function getRecentCurrentCareHomeResidents(limit = 10): Promise<ResidentActivityRecord[]> {
  const { supabase, careHomeId } = await getResidentContext('read')
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 50) : 10
  const data = await measureServerStep(
    'supabase:residents:recent',
    async () => {
      const { data, error } = await supabase
        .from('residents')
        .select('id, full_name, status, created_at, updated_at')
        .eq('care_home_id', careHomeId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(safeLimit)

      if (error) {
        throw new Error(error.message)
      }

      return data ?? []
    },
    { careHomeId, limit: safeLimit }
  )

  return data.map((row) => ({
    id: row.id,
    name: row.full_name,
    status: normalizeResidentStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

export async function getResidentById(residentId: string): Promise<ResidentRecord | null> {
  const { supabase, careHomeId } = await getResidentContext('read')
  const resident = await measureServerStep(
    'supabase:residents:by-id',
    () => getResidentRowById(supabase, careHomeId, residentId),
    { careHomeId, residentId }
  )

  return resident ? mapResidentRowToRecord(supabase, resident) : null
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
    sex: normalizeResidentSex(input.sex),
    status: 'active',
    legacy_local_id: normalizeOptionalText(input.legacyLocalId),
    deleted_at: null,
  }

  const { data, error } = await supabase.from('residents').insert(payload).select('*').single()

  if (error) {
    throw new Error(error.message)
  }

  return mapResidentRowToRecord(supabase, data)
}

export async function updateResident(input: UpdateResidentInput): Promise<ResidentRecord> {
  const { supabase, careHomeId } = await getResidentContext('admin')
  const updates = buildResidentUpdatePayload(input)

  if (Object.keys(updates).length === 0) {
    const existingResident = await getResidentRowById(supabase, careHomeId, input.id)

    if (!existingResident) {
      throw new Error('Resident not found.')
    }

    return mapResidentRowToRecord(supabase, existingResident)
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

  return mapResidentRowToRecord(supabase, data)
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

  return mapResidentRowToRecord(supabase, data)
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

export async function mapResidentRowToRecord(
  supabase: TypedSupabaseClient,
  row: ResidentRecordRow
): Promise<ResidentRecord> {
  return {
    id: row.id,
    name: row.full_name,
    age: typeof row.age === 'number' ? row.age : 0,
    careLevel: row.care_level,
    primarySupportNeeds: parsePrimarySupportNeeds(row.primary_support_needs),
    notes: row.notes ?? '',
    sex: normalizeResidentSex(row.sex),
    status: normalizeResidentStatus(row.status),
    photoUrl: await getResidentPhotoSignedUrl(supabase, row.photo_path),
  }
}

function mapResidentRowToListRecord(row: ResidentRecordRow): ResidentListRecord {
  return {
    id: row.id,
    name: row.full_name,
    age: typeof row.age === 'number' ? row.age : 0,
    careLevel: row.care_level,
    primarySupportNeeds: parsePrimarySupportNeeds(row.primary_support_needs),
    notes: row.notes ?? '',
    sex: normalizeResidentSex(row.sex),
    status: normalizeResidentStatus(row.status),
    photoUrl: null,
    photoPath: row.photo_path,
  }
}

async function mapResidentRowsToRecords(
  supabase: TypedSupabaseClient,
  rows: ResidentRecordRow[]
): Promise<ResidentRecord[]> {
  if (rows.length === 0) {
    return []
  }

  const signedUrlByPath = await getResidentPhotoSignedUrls(supabase, rows)

  return rows.map((row) => ({
    id: row.id,
    name: row.full_name,
    age: typeof row.age === 'number' ? row.age : 0,
    careLevel: row.care_level,
    primarySupportNeeds: parsePrimarySupportNeeds(row.primary_support_needs),
    notes: row.notes ?? '',
    sex: normalizeResidentSex(row.sex),
    status: normalizeResidentStatus(row.status),
    photoUrl: row.photo_path ? signedUrlByPath.get(row.photo_path) ?? null : null,
  }))
}

async function getResidentPhotoSignedUrl(
  supabase: TypedSupabaseClient,
  photoPath: string | null
): Promise<string | null> {
  if (!photoPath) {
    return null
  }

  const { data, error } = await supabase.storage
    .from(RESIDENT_PHOTOS_BUCKET)
    .createSignedUrl(photoPath, RESIDENT_PHOTO_SIGNED_URL_TTL_SECONDS)

  if (error || !data?.signedUrl) {
    console.error('Failed to create resident photo signed URL:', {
      photoPath,
      error: error?.message ?? 'Missing signed URL',
    })
    return null
  }

  return data.signedUrl
}

async function getResidentPhotoSignedUrls(
  supabase: TypedSupabaseClient,
  rows: ResidentRecordRow[]
) {
  const photoPaths = rows
    .map((row) => row.photo_path)
    .filter((photoPath): photoPath is string => typeof photoPath === 'string' && photoPath.length > 0)

  if (photoPaths.length === 0) {
    return new Map<string, string>()
  }

  const uniquePhotoPaths = Array.from(new Set(photoPaths))

  try {
    const signedPaths = await measureServerStep(
      'supabase:resident-photos:signed-urls',
      async () => {
        const { data, error } = await supabase.storage
          .from(RESIDENT_PHOTOS_BUCKET)
          .createSignedUrls(uniquePhotoPaths, RESIDENT_PHOTO_SIGNED_URL_TTL_SECONDS)

        if (error) {
          throw new Error(error.message)
        }

        return data ?? []
      },
      { photoCount: uniquePhotoPaths.length }
    )

    return new Map(
      signedPaths.flatMap((entry, index) => {
        const photoPath = uniquePhotoPaths[index]

        if (!photoPath || !entry?.signedUrl) {
          return []
        }

        return [[photoPath, entry.signedUrl] as const]
      })
    )
  } catch (error) {
    console.error('Failed to batch create resident photo signed URLs, falling back to per-photo signing.', error)

    const signedPairs = await Promise.all(
      uniquePhotoPaths.map(async (photoPath) => [photoPath, await getResidentPhotoSignedUrl(supabase, photoPath)] as const)
    )

    return new Map(
      signedPairs.filter((entry): entry is readonly [string, string] => typeof entry[1] === 'string')
    )
  }
}

async function cleanupStaleResidentPhotoVariants(
  supabase: TypedSupabaseClient,
  stalePaths: string[],
  residentId: string
) {
  const { error } = await supabase.storage.from(RESIDENT_PHOTOS_BUCKET).remove(stalePaths)

  if (error) {
    console.error('Failed to remove stale resident photo variants:', {
      residentId,
      stalePaths,
      error: error.message,
    })
  }
}

export async function uploadResidentPhoto(residentId: string, formData: FormData): Promise<ResidentRecord> {
  const { supabase, careHomeId } = await getResidentContext('admin')

  const file = formData.get('photo')
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('No photo file was provided.')
  }

  const extension = RESIDENT_PHOTO_EXTENSION_BY_MIME_TYPE[file.type]
  if (!extension) {
    throw new Error(RESIDENT_PHOTO_TYPE_ERROR_MESSAGE)
  }

  if (file.size > MAX_RESIDENT_PHOTO_BYTES) {
    throw new Error(RESIDENT_PHOTO_SIZE_ERROR_MESSAGE)
  }

  const existingResident = await getResidentRowById(supabase, careHomeId, residentId)

  if (!existingResident) {
    throw new Error('Resident not found.')
  }

  const photoPath = `${careHomeId}/${residentId}/profile.${extension}`

  const { error: uploadError } = await supabase.storage
    .from(RESIDENT_PHOTOS_BUCKET)
    .upload(photoPath, file, { upsert: true, contentType: file.type })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const stalePaths = Object.values(RESIDENT_PHOTO_EXTENSION_BY_MIME_TYPE)
    .map((candidateExtension) => `${careHomeId}/${residentId}/profile.${candidateExtension}`)
    .filter((candidatePath) => candidatePath !== photoPath)

  if (stalePaths.length > 0) {
    await cleanupStaleResidentPhotoVariants(supabase, stalePaths, residentId)
  }

  const { data, error } = await supabase
    .from('residents')
    .update({ photo_path: photoPath })
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

  return mapResidentRowToRecord(supabase, data)
}

export async function removeResidentPhoto(residentId: string): Promise<ResidentRecord> {
  const { supabase, careHomeId } = await getResidentContext('admin')
  const existingResident = await getResidentRowById(supabase, careHomeId, residentId)

  if (!existingResident) {
    throw new Error('Resident not found.')
  }

  if (existingResident.photo_path) {
    const { error: removeError } = await supabase.storage
      .from(RESIDENT_PHOTOS_BUCKET)
      .remove([existingResident.photo_path])

    if (removeError) {
      throw new Error(removeError.message)
    }
  }

  const { data, error } = await supabase
    .from('residents')
    .update({ photo_path: null })
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

  return mapResidentRowToRecord(supabase, data)
}

async function getResidentContext(requiredAccess: 'read' | 'admin') {
  const supabase = (await getSupabaseServerClient()) as TypedSupabaseClient
  const access = await getCurrentUserServerAccess(supabase)
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
    .select(RESIDENT_RECORD_SELECT)
    .eq('care_home_id', careHomeId)
    .eq('id', residentId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data as unknown as ResidentRecordRow | null
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

  if ('sex' in input && input.sex) {
    payload.sex = normalizeResidentSex(input.sex)
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

function normalizeResidentSex(value: string | null | undefined): ResidentSex {
  return value === 'male' || value === 'female' || value === 'other' ? value : 'unknown'
}









