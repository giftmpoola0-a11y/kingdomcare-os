import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { getCurrentUserAccess, type CurrentUserAccess } from '@/app/lib/supabase/access'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'

type TypedSupabaseClient = SupabaseClient<any>

export type MedicationStatus = 'active' | 'paused' | 'discontinued' | 'archived'
export type MedicationAlertType =
  | 'missed_dose'
  | 'refill_needed'
  | 'review_required'
  | 'allergy_warning'
  | 'interaction_warning'
  | 'other'
export type MedicationAlertSeverity = 'low' | 'medium' | 'high' | 'critical'
export type MedicationAlertStatus = 'open' | 'reviewing' | 'resolved' | 'archived'

interface MedicationRow {
  id: string
  care_home_id: string
  resident_id: string
  medication_name: string
  dosage: string | null
  route: string | null
  frequency: string | null
  schedule_notes: string | null
  start_date: string | null
  end_date: string | null
  prescribing_doctor: string | null
  pharmacy: string | null
  status: string
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

interface MedicationAlertRow {
  id: string
  care_home_id: string
  resident_id: string | null
  medication_id: string | null
  alert_type: string
  severity: string
  status: string
  message: string
  due_at: string | null
  resolved_at: string | null
  resolved_by: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

interface MedicationAccessContext {
  access: CurrentUserAccess
  careHomeId: string
  userId: string
}

export interface MedicationRecord {
  id: string
  careHomeId: string
  residentId: string
  medicationName: string
  dosage: string
  route: string
  frequency: string
  scheduleNotes: string
  startDate: string | null
  endDate: string | null
  prescribingDoctor: string
  pharmacy: string
  status: MedicationStatus
  createdBy: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface MedicationAlertRecord {
  id: string
  careHomeId: string
  residentId: string | null
  medicationId: string | null
  alertType: MedicationAlertType
  severity: MedicationAlertSeverity
  status: MedicationAlertStatus
  message: string
  dueAt: string | null
  resolvedAt: string | null
  resolvedBy: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface CreateMedicationInput {
  residentId: string
  medicationName: string
  dosage?: string | null
  route?: string | null
  frequency?: string | null
  scheduleNotes?: string | null
  startDate?: string | null
  endDate?: string | null
  prescribingDoctor?: string | null
  pharmacy?: string | null
  status?: MedicationStatus | null
}

export interface UpdateMedicationInput {
  id: string
  medicationName?: string
  dosage?: string | null
  route?: string | null
  frequency?: string | null
  scheduleNotes?: string | null
  startDate?: string | null
  endDate?: string | null
  prescribingDoctor?: string | null
  pharmacy?: string | null
  status?: MedicationStatus
}

export interface CreateMedicationAlertInput {
  residentId?: string | null
  medicationId?: string | null
  alertType: MedicationAlertType
  severity?: MedicationAlertSeverity | null
  message: string
  dueAt?: string | null
}

export interface UpdateMedicationAlertInput {
  id: string
  alertType?: MedicationAlertType
  severity?: MedicationAlertSeverity
  status?: MedicationAlertStatus
  message?: string
  dueAt?: string | null
  resolvedAt?: string | null
  resolvedBy?: string | null
}

// ============================================================
// Medication helpers
// ============================================================

export async function getCurrentCareHomeMedications(): Promise<MedicationRecord[]> {
  const { supabase, careHomeId } = await getMedicationContext('read')
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('care_home_id', careHomeId)
    .is('deleted_at', null)
    .order('medication_name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => mapMedicationRowToRecord(row as MedicationRow))
}

export async function getActiveCurrentCareHomeMedications(): Promise<MedicationRecord[]> {
  const { supabase, careHomeId } = await getMedicationContext('read')
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('care_home_id', careHomeId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('medication_name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => mapMedicationRowToRecord(row as MedicationRow))
}

export async function createMedication(input: CreateMedicationInput): Promise<MedicationRecord> {
  const { supabase, careHomeId, userId } = await getMedicationContext('manage')
  const payload = {
    care_home_id: careHomeId,
    resident_id: input.residentId,
    medication_name: input.medicationName.trim(),
    dosage: normalizeOptionalText(input.dosage),
    route: normalizeOptionalText(input.route),
    frequency: normalizeOptionalText(input.frequency),
    schedule_notes: normalizeOptionalText(input.scheduleNotes),
    start_date: normalizeOptionalText(input.startDate),
    end_date: normalizeOptionalText(input.endDate),
    prescribing_doctor: normalizeOptionalText(input.prescribingDoctor),
    pharmacy: normalizeOptionalText(input.pharmacy),
    status: normalizeMedicationStatus(input.status),
    created_by: userId,
    deleted_at: null,
  }

  const { data, error } = await supabase.from('medications').insert(payload).select('*').single()

  if (error) {
    throw new Error(error.message)
  }

  return mapMedicationRowToRecord(data as MedicationRow)
}

export async function updateMedication(input: UpdateMedicationInput): Promise<MedicationRecord> {
  const { supabase, careHomeId } = await getMedicationContext('manage')
  const updates = buildMedicationUpdatePayload(input)

  if (Object.keys(updates).length === 0) {
    const existing = await getMedicationRowById(supabase, careHomeId, input.id)

    if (!existing) {
      throw new Error('Medication not found.')
    }

    return mapMedicationRowToRecord(existing)
  }

  const { data, error } = await supabase
    .from('medications')
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
    throw new Error('Medication not found.')
  }

  return mapMedicationRowToRecord(data as MedicationRow)
}

export async function pauseMedication(medicationId: string): Promise<MedicationRecord> {
  const { supabase, careHomeId } = await getMedicationContext('manage')
  const { data, error } = await supabase
    .from('medications')
    .update({ status: 'paused' })
    .eq('care_home_id', careHomeId)
    .eq('id', medicationId)
    .is('deleted_at', null)
    .select('*')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Medication not found.')
  }

  return mapMedicationRowToRecord(data as MedicationRow)
}

export async function discontinueMedication(medicationId: string): Promise<MedicationRecord> {
  const { supabase, careHomeId } = await getMedicationContext('manage')
  const { data, error } = await supabase
    .from('medications')
    .update({ status: 'discontinued' })
    .eq('care_home_id', careHomeId)
    .eq('id', medicationId)
    .is('deleted_at', null)
    .select('*')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Medication not found.')
  }

  return mapMedicationRowToRecord(data as MedicationRow)
}

export async function archiveMedication(medicationId: string): Promise<MedicationRecord> {
  const { supabase, careHomeId } = await getMedicationContext('manage')
  const { data, error } = await supabase
    .from('medications')
    .update({ status: 'archived' })
    .eq('care_home_id', careHomeId)
    .eq('id', medicationId)
    .is('deleted_at', null)
    .select('*')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Medication not found.')
  }

  return mapMedicationRowToRecord(data as MedicationRow)
}

export async function softDeleteMedication(medicationId: string): Promise<void> {
  const { supabase, careHomeId } = await getMedicationContext('manage')
  const medication = await getMedicationRowById(supabase, careHomeId, medicationId)

  if (!medication) {
    throw new Error('Medication not found.')
  }

  const { error } = await supabase
    .from('medications')
    .update({
      deleted_at: new Date().toISOString(),
      status: 'archived',
    })
    .eq('care_home_id', careHomeId)
    .eq('id', medicationId)
    .is('deleted_at', null)

  if (error) {
    throw new Error(error.message)
  }

  const { data: stillVisible, error: verifyError } = await supabase
    .from('medications')
    .select('id')
    .eq('care_home_id', careHomeId)
    .eq('id', medicationId)
    .is('deleted_at', null)
    .maybeSingle()

  if (verifyError) {
    throw new Error(verifyError.message)
  }

  if (stillVisible) {
    throw new Error('Medication soft delete did not persist.')
  }
}

// ============================================================
// Medication alert helpers
// ============================================================

export async function getCurrentCareHomeMedicationAlerts(): Promise<MedicationAlertRecord[]> {
  const { supabase, careHomeId } = await getMedicationContext('read')
  const { data, error } = await supabase
    .from('medication_alerts')
    .select('*')
    .eq('care_home_id', careHomeId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => mapMedicationAlertRowToRecord(row as MedicationAlertRow))
}

export async function getOpenCurrentCareHomeMedicationAlerts(): Promise<MedicationAlertRecord[]> {
  const { supabase, careHomeId } = await getMedicationContext('read')
  const { data, error } = await supabase
    .from('medication_alerts')
    .select('*')
    .eq('care_home_id', careHomeId)
    .in('status', ['open', 'reviewing'])
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => mapMedicationAlertRowToRecord(row as MedicationAlertRow))
}

export async function getMedicationAlertsRequiringReview(): Promise<MedicationAlertRecord[]> {
  const { supabase, careHomeId } = await getMedicationContext('read')
  const { data, error } = await supabase
    .from('medication_alerts')
    .select('*')
    .eq('care_home_id', careHomeId)
    .eq('status', 'reviewing')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => mapMedicationAlertRowToRecord(row as MedicationAlertRow))
}

export async function createMedicationAlert(input: CreateMedicationAlertInput): Promise<MedicationAlertRecord> {
  const { supabase, careHomeId, userId } = await getMedicationContext('manage')
  const payload = {
    care_home_id: careHomeId,
    resident_id: normalizeOptionalText(input.residentId),
    medication_id: normalizeOptionalText(input.medicationId),
    alert_type: input.alertType,
    severity: normalizeMedicationAlertSeverity(input.severity),
    status: 'open',
    message: input.message.trim(),
    due_at: normalizeOptionalText(input.dueAt),
    created_by: userId,
    deleted_at: null,
  }

  const { data, error } = await supabase.from('medication_alerts').insert(payload).select('*').single()

  if (error) {
    throw new Error(error.message)
  }

  return mapMedicationAlertRowToRecord(data as MedicationAlertRow)
}

export async function updateMedicationAlert(input: UpdateMedicationAlertInput): Promise<MedicationAlertRecord> {
  const { supabase, careHomeId } = await getMedicationContext('manage')
  const updates = buildMedicationAlertUpdatePayload(input)

  if (Object.keys(updates).length === 0) {
    const existing = await getMedicationAlertRowById(supabase, careHomeId, input.id)

    if (!existing) {
      throw new Error('Medication alert not found.')
    }

    return mapMedicationAlertRowToRecord(existing)
  }

  const { data, error } = await supabase
    .from('medication_alerts')
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
    throw new Error('Medication alert not found.')
  }

  return mapMedicationAlertRowToRecord(data as MedicationAlertRow)
}

export async function resolveMedicationAlert(
  alertId: string,
  resolvedBy?: string,
): Promise<MedicationAlertRecord> {
  const { supabase, careHomeId, userId } = await getMedicationContext('manage')
  const { data, error } = await supabase
    .from('medication_alerts')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: resolvedBy ?? userId,
    })
    .eq('care_home_id', careHomeId)
    .eq('id', alertId)
    .is('deleted_at', null)
    .select('*')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Medication alert not found.')
  }

  return mapMedicationAlertRowToRecord(data as MedicationAlertRow)
}

export async function archiveMedicationAlert(alertId: string): Promise<MedicationAlertRecord> {
  const { supabase, careHomeId } = await getMedicationContext('manage')
  const { data, error } = await supabase
    .from('medication_alerts')
    .update({ status: 'archived', resolved_at: null, resolved_by: null })
    .eq('care_home_id', careHomeId)
    .eq('id', alertId)
    .is('deleted_at', null)
    .select('*')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Medication alert not found.')
  }

  return mapMedicationAlertRowToRecord(data as MedicationAlertRow)
}

export async function softDeleteMedicationAlert(alertId: string): Promise<void> {
  const { supabase, careHomeId } = await getMedicationContext('manage')
  const alert = await getMedicationAlertRowById(supabase, careHomeId, alertId)

  if (!alert) {
    throw new Error('Medication alert not found.')
  }

  const { error } = await supabase
    .from('medication_alerts')
    .update({
      deleted_at: new Date().toISOString(),
      status: 'archived',
    })
    .eq('care_home_id', careHomeId)
    .eq('id', alertId)
    .is('deleted_at', null)

  if (error) {
    throw new Error(error.message)
  }

  const { data: stillVisible, error: verifyError } = await supabase
    .from('medication_alerts')
    .select('id')
    .eq('care_home_id', careHomeId)
    .eq('id', alertId)
    .is('deleted_at', null)
    .maybeSingle()

  if (verifyError) {
    throw new Error(verifyError.message)
  }

  if (stillVisible) {
    throw new Error('Medication alert soft delete did not persist.')
  }
}

// ============================================================
// Mappers
// ============================================================

export function mapMedicationRowToRecord(row: MedicationRow): MedicationRecord {
  return {
    id: row.id,
    careHomeId: row.care_home_id,
    residentId: row.resident_id,
    medicationName: row.medication_name,
    dosage: row.dosage ?? '',
    route: row.route ?? '',
    frequency: row.frequency ?? '',
    scheduleNotes: row.schedule_notes ?? '',
    startDate: row.start_date,
    endDate: row.end_date,
    prescribingDoctor: row.prescribing_doctor ?? '',
    pharmacy: row.pharmacy ?? '',
    status: normalizeMedicationStatus(row.status),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }
}

export function mapMedicationAlertRowToRecord(row: MedicationAlertRow): MedicationAlertRecord {
  return {
    id: row.id,
    careHomeId: row.care_home_id,
    residentId: row.resident_id,
    medicationId: row.medication_id,
    alertType: normalizeMedicationAlertType(row.alert_type),
    severity: normalizeMedicationAlertSeverity(row.severity),
    status: normalizeMedicationAlertStatus(row.status),
    message: row.message,
    dueAt: row.due_at,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }
}

// ============================================================
// Context
// ============================================================

async function getMedicationContext(requiredAccess: 'read' | 'manage') {
  const supabase = (await getSupabaseServerClient()) as TypedSupabaseClient
  const access = await getCurrentUserAccess(supabase)
  const context = getMedicationAccessContext(access)

  if (requiredAccess === 'manage' && access.role !== 'admin' && access.role !== 'nurse') {
    throw new Error('Only care home admins and nurses can manage medications.')
  }

  return {
    supabase,
    ...context,
  }
}

function getMedicationAccessContext(access: CurrentUserAccess): MedicationAccessContext {
  if (!access.user) {
    throw new Error('You must be signed in to access medications.')
  }

  if (!access.membership || !access.careHomeId || !access.role) {
    throw new Error('You must belong to a care home to access medications.')
  }

  return {
    access,
    careHomeId: access.careHomeId,
    userId: access.user.id,
  }
}

// ============================================================
// Private row fetchers
// ============================================================

async function getMedicationRowById(
  supabase: TypedSupabaseClient,
  careHomeId: string,
  medicationId: string,
) {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('care_home_id', careHomeId)
    .eq('id', medicationId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data as MedicationRow | null
}

async function getMedicationAlertRowById(
  supabase: TypedSupabaseClient,
  careHomeId: string,
  alertId: string,
) {
  const { data, error } = await supabase
    .from('medication_alerts')
    .select('*')
    .eq('care_home_id', careHomeId)
    .eq('id', alertId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data as MedicationAlertRow | null
}

// ============================================================
// Update payload builders
// ============================================================

function buildMedicationUpdatePayload(input: UpdateMedicationInput) {
  const payload: Record<string, string | null> = {}

  if ('medicationName' in input && typeof input.medicationName === 'string') {
    payload.medication_name = input.medicationName.trim()
  }

  if ('dosage' in input) {
    payload.dosage = normalizeOptionalText(input.dosage)
  }

  if ('route' in input) {
    payload.route = normalizeOptionalText(input.route)
  }

  if ('frequency' in input) {
    payload.frequency = normalizeOptionalText(input.frequency)
  }

  if ('scheduleNotes' in input) {
    payload.schedule_notes = normalizeOptionalText(input.scheduleNotes)
  }

  if ('startDate' in input) {
    payload.start_date = normalizeOptionalText(input.startDate)
  }

  if ('endDate' in input) {
    payload.end_date = normalizeOptionalText(input.endDate)
  }

  if ('prescribingDoctor' in input) {
    payload.prescribing_doctor = normalizeOptionalText(input.prescribingDoctor)
  }

  if ('pharmacy' in input) {
    payload.pharmacy = normalizeOptionalText(input.pharmacy)
  }

  if ('status' in input && input.status) {
    payload.status = normalizeMedicationStatus(input.status)
  }

  return payload
}

function buildMedicationAlertUpdatePayload(input: UpdateMedicationAlertInput) {
  const payload: Record<string, string | null> = {}

  if ('alertType' in input && input.alertType) {
    payload.alert_type = normalizeMedicationAlertType(input.alertType)
  }

  if ('severity' in input && input.severity) {
    payload.severity = normalizeMedicationAlertSeverity(input.severity)
  }

  if ('status' in input && input.status) {
    payload.status = normalizeMedicationAlertStatus(input.status)
  }

  if ('message' in input && typeof input.message === 'string') {
    payload.message = input.message.trim()
  }

  if ('dueAt' in input) {
    payload.due_at = normalizeOptionalText(input.dueAt)
  }

  if ('resolvedAt' in input) {
    payload.resolved_at = normalizeOptionalText(input.resolvedAt)
  }

  if ('resolvedBy' in input) {
    payload.resolved_by = normalizeOptionalText(input.resolvedBy)
  }

  return payload
}

// ============================================================
// Normalizers
// ============================================================

function normalizeOptionalText(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizeMedicationStatus(status: string | null | undefined): MedicationStatus {
  return status === 'paused' || status === 'discontinued' || status === 'archived'
    ? status
    : 'active'
}

function normalizeMedicationAlertType(value: string | null | undefined): MedicationAlertType {
  const valid: MedicationAlertType[] = [
    'missed_dose',
    'refill_needed',
    'review_required',
    'allergy_warning',
    'interaction_warning',
    'other',
  ]
  return valid.includes(value as MedicationAlertType) ? (value as MedicationAlertType) : 'other'
}

function normalizeMedicationAlertSeverity(value: string | null | undefined): MedicationAlertSeverity {
  return value === 'low' || value === 'high' || value === 'critical' ? value : 'medium'
}

function normalizeMedicationAlertStatus(value: string | null | undefined): MedicationAlertStatus {
  return value === 'reviewing' || value === 'resolved' || value === 'archived' ? value : 'open'
}
