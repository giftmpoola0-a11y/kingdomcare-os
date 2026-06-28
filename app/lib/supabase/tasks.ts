import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { getCurrentUserAccess, type CurrentUserAccess } from '@/app/lib/supabase/access'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'

type TypedSupabaseClient = SupabaseClient<any>

type TaskStatus = 'open' | 'in_progress' | 'completed' | 'archived'
type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'

interface TaskRow {
  id: string
  care_home_id: string
  resident_id: string | null
  title: string
  description: string | null
  status: string
  priority: string
  due_at: string | null
  assigned_to: string | null
  created_by: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

interface TaskAccessContext {
  access: CurrentUserAccess
  careHomeId: string
  userId: string
}

export interface TaskRecord {
  id: string
  careHomeId: string
  residentId: string | null
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  dueAt: string | null
  assignedTo: string | null
  createdBy: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface CreateTaskInput {
  residentId?: string | null
  title: string
  description?: string | null
  priority?: TaskPriority | null
  dueAt?: string | null
  assignedTo?: string | null
}

export interface UpdateTaskInput {
  id: string
  residentId?: string | null
  title?: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  dueAt?: string | null
  assignedTo?: string | null
  completedAt?: string | null
}

export async function getCurrentCareHomeTasks(): Promise<TaskRecord[]> {
  const { supabase, careHomeId } = await getTaskContext('read')
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('care_home_id', careHomeId)
    .is('deleted_at', null)
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map(mapTaskRowToRecord)
}

export async function getOpenCurrentCareHomeTasks(): Promise<TaskRecord[]> {
  const { supabase, careHomeId } = await getTaskContext('read')
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('care_home_id', careHomeId)
    .in('status', ['open', 'in_progress'])
    .is('deleted_at', null)
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map(mapTaskRowToRecord)
}

export async function createTask(input: CreateTaskInput): Promise<TaskRecord> {
  const { supabase, careHomeId, userId } = await getTaskContext('write')
  const payload = {
    care_home_id: careHomeId,
    resident_id: normalizeOptionalText(input.residentId),
    title: input.title.trim(),
    description: normalizeOptionalText(input.description),
    status: 'open' as TaskStatus,
    priority: normalizeTaskPriority(input.priority),
    due_at: normalizeOptionalText(input.dueAt),
    assigned_to: normalizeOptionalText(input.assignedTo),
    created_by: userId,
    deleted_at: null,
  }

  const { data, error } = await supabase.from('tasks').insert(payload).select('*').single()

  if (error) {
    throw new Error(error.message)
  }

  return mapTaskRowToRecord(data)
}

export async function updateTask(input: UpdateTaskInput): Promise<TaskRecord> {
  const { supabase, careHomeId } = await getTaskContext('manage')
  const updates = buildTaskUpdatePayload(input)

  if (Object.keys(updates).length === 0) {
    const existingTask = await getTaskRowById(supabase, careHomeId, input.id)

    if (!existingTask) {
      throw new Error('Task not found.')
    }

    return mapTaskRowToRecord(existingTask)
  }

  const { data, error } = await supabase
    .from('tasks')
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
    throw new Error('Task not found.')
  }

  return mapTaskRowToRecord(data)
}

export async function completeTask(taskId: string): Promise<TaskRecord> {
  const { supabase, careHomeId } = await getTaskContext('status')
  const { data, error } = await supabase
    .from('tasks')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('care_home_id', careHomeId)
    .eq('id', taskId)
    .is('deleted_at', null)
    .select('*')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Task not found.')
  }

  return mapTaskRowToRecord(data)
}

export async function archiveTask(taskId: string): Promise<TaskRecord> {
  const { supabase, careHomeId } = await getTaskContext('manage')
  const { data, error } = await supabase
    .from('tasks')
    .update({
      status: 'archived',
      completed_at: null,
    })
    .eq('care_home_id', careHomeId)
    .eq('id', taskId)
    .is('deleted_at', null)
    .select('*')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Task not found.')
  }

  return mapTaskRowToRecord(data)
}

export async function softDeleteTask(taskId: string): Promise<void> {
  const { supabase, careHomeId } = await getTaskContext('manage')
  const task = await getTaskRowById(supabase, careHomeId, taskId)

  if (!task) {
    throw new Error('Task not found.')
  }

  const { error } = await supabase
    .from('tasks')
    .update({
      deleted_at: new Date().toISOString(),
      status: 'archived',
    })
    .eq('care_home_id', careHomeId)
    .eq('id', taskId)
    .is('deleted_at', null)

  if (error) {
    throw new Error(error.message)
  }

  const { data: stillVisibleTask, error: verifyError } = await supabase
    .from('tasks')
    .select('id')
    .eq('care_home_id', careHomeId)
    .eq('id', taskId)
    .is('deleted_at', null)
    .maybeSingle()

  if (verifyError) {
    throw new Error(verifyError.message)
  }

  if (stillVisibleTask) {
    throw new Error('Task soft delete did not persist.')
  }
}

export function mapTaskRowToRecord(row: TaskRow): TaskRecord {
  return {
    id: row.id,
    careHomeId: row.care_home_id,
    residentId: row.resident_id,
    title: row.title,
    description: row.description ?? '',
    status: normalizeTaskStatus(row.status),
    priority: normalizeTaskPriority(row.priority),
    dueAt: row.due_at,
    assignedTo: row.assigned_to,
    createdBy: row.created_by,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }
}

async function getTaskContext(requiredAccess: 'read' | 'write' | 'manage' | 'status') {
  const supabase = (await getSupabaseServerClient()) as TypedSupabaseClient
  const access = await getCurrentUserAccess(supabase)
  const context = getTaskAccessContext(access)

  if (requiredAccess === 'manage' && access.role !== 'admin' && access.role !== 'nurse') {
    throw new Error('Only care home admins and nurses can manage tasks.')
  }

  if (requiredAccess === 'status' && !access.role) {
    throw new Error('You must belong to a care home to update task status.')
  }

  return {
    supabase,
    ...context,
  }
}

function getTaskAccessContext(access: CurrentUserAccess): TaskAccessContext {
  if (!access.user) {
    throw new Error('You must be signed in to access tasks.')
  }

  if (!access.membership || !access.careHomeId || !access.role) {
    throw new Error('You must belong to a care home to access tasks.')
  }

  return {
    access,
    careHomeId: access.careHomeId,
    userId: access.user.id,
  }
}

async function getTaskRowById(
  supabase: TypedSupabaseClient,
  careHomeId: string,
  taskId: string
) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('care_home_id', careHomeId)
    .eq('id', taskId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data as TaskRow | null
}

function buildTaskUpdatePayload(input: UpdateTaskInput) {
  const payload: Record<string, string | null> = {}

  if ('residentId' in input) {
    payload.resident_id = normalizeOptionalText(input.residentId)
  }

  if ('title' in input && typeof input.title === 'string') {
    payload.title = input.title.trim()
  }

  if ('description' in input) {
    payload.description = normalizeOptionalText(input.description)
  }

  if ('status' in input && input.status) {
    payload.status = normalizeTaskStatus(input.status)
  }

  if ('priority' in input && input.priority) {
    payload.priority = normalizeTaskPriority(input.priority)
  }

  if ('dueAt' in input) {
    payload.due_at = normalizeOptionalText(input.dueAt)
  }

  if ('assignedTo' in input) {
    payload.assigned_to = normalizeOptionalText(input.assignedTo)
  }

  if ('completedAt' in input) {
    payload.completed_at = normalizeOptionalText(input.completedAt)
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

function normalizeTaskStatus(status: string | null | undefined): TaskStatus {
  return status === 'in_progress' || status === 'completed' || status === 'archived'
    ? status
    : 'open'
}

function normalizeTaskPriority(priority: string | null | undefined): TaskPriority {
  return priority === 'low' || priority === 'high' || priority === 'urgent'
    ? priority
    : 'normal'
}
