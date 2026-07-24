import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { TASK_CATEGORIES, type TaskCategory } from '@/app/lib/taskTypes'
import { type CurrentUserAccess } from '@/app/lib/supabase/access'
import type { Database, Tables, TablesInsert, TablesUpdate } from '@/app/lib/supabase/database.types'
import { getCurrentRequestSupabaseAccess } from '@/app/lib/supabase/request-context'
import { logServerPerf, measureServerStep } from '@/app/lib/perf'

type TypedSupabaseClient = SupabaseClient<Database>
type TaskRow = Tables<'tasks'>
type TaskInsert = TablesInsert<'tasks'>
type TaskUpdate = TablesUpdate<'tasks'>

export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'archived'
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'

const TASK_CATEGORY_MARKER = /^\[\[category:(.+?)\]\]\n?/i

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
  category: TaskCategory
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
  category?: TaskCategory | null
  priority?: TaskPriority | null
  dueAt?: string | null
  assignedTo?: string | null
}

export interface UpdateTaskInput {
  id: string
  residentId?: string | null
  title?: string
  description?: string | null
  category?: TaskCategory | null
  status?: TaskStatus
  priority?: TaskPriority
  dueAt?: string | null
  assignedTo?: string | null
  completedAt?: string | null
}

export async function getCurrentCareHomeTasks(): Promise<TaskRecord[]> {
  const { supabase, careHomeId } = await getTaskContext('read')
  const data = await measureServerStep(
    'supabase:tasks:list',
    async () => {
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

      return data ?? []
    },
    { careHomeId }
  )

  return data.map((row) => mapTaskRowToRecord(row))
}

export async function getOpenCurrentCareHomeTasks(): Promise<TaskRecord[]> {
  const { supabase, careHomeId } = await getTaskContext('read')
  const data = await measureServerStep(
    'supabase:tasks:open',
    async () => {
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

      return data ?? []
    },
    { careHomeId }
  )

  return data.map((row) => mapTaskRowToRecord(row))
}

export interface CreateTaskResult {
  id: string
}

export async function createTask(input: CreateTaskInput): Promise<CreateTaskResult> {
  const taskCreateStartedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const { supabase, careHomeId, userId } = await getTaskContext('create')
  const title = input.title.trim()

  if (!title) {
    throw new Error('Task title is required.')
  }

  const residentId = normalizeOptionalText(input.residentId)

  if (residentId) {
    const resident = await measureServerStep(
      'supabase:tasks:create:resident-validation',
      () => getResidentRowById(supabase, careHomeId, residentId),
      { careHomeId, residentId }
    )

    if (!resident) {
      throw new Error('Resident selection is invalid.')
    }
  }

  const payload: TaskInsert = {
    care_home_id: careHomeId,
    resident_id: residentId,
    title,
    description: serializeTaskDescription(input.category, input.description),
    status: 'open',
    priority: normalizeTaskPriority(input.priority),
    due_at: normalizeOptionalText(input.dueAt),
    assigned_to: normalizeOptionalText(input.assignedTo),
    created_by: userId,
    deleted_at: null,
  }

  const data = await measureServerStep(
    'supabase:tasks:create:insert',
    async () => {
      const { data, error } = await supabase.from('tasks').insert(payload).select('id').single()

      if (error) {
        throw new Error(error.message)
      }

      return data
    },
    {
      careHomeId,
      hasResidentId: Boolean(residentId),
      hasDueAt: Boolean(payload.due_at),
      hasDescription: Boolean(input.description),
    }
  )

  logServerPerf('supabase:tasks:create:total', (typeof performance !== 'undefined' ? performance.now() : Date.now()) - taskCreateStartedAt, {
    careHomeId,
    hasResidentId: Boolean(residentId),
  })

  return { id: data.id }
}

export async function updateTask(input: UpdateTaskInput): Promise<TaskRecord> {
  const requiresStatusAccessOnly = isStatusOnlyUpdate(input)
  const { supabase, careHomeId } = await getTaskContext(requiresStatusAccessOnly ? 'status' : 'manage')
  const needsExistingTask = Object.keys(input).length === 1 || 'category' in input || 'description' in input
  const existingTask = needsExistingTask ? await getTaskRowById(supabase, careHomeId, input.id) : null
  const updates = buildTaskUpdatePayload(input, existingTask)

  if (Object.keys(updates).length === 0) {
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
  const normalizedTaskId = taskId.trim()

  if (!normalizedTaskId) {
    throw new Error('Task id is required.')
  }

  const existingTask = await getTaskRowById(supabase, careHomeId, normalizedTaskId)

  if (!existingTask) {
    throw new Error('Task not found.')
  }

  const normalizedStatus = normalizeTaskStatus(existingTask.status)

  if (normalizedStatus === 'completed') {
    throw new Error('Task is already completed.')
  }

  if (normalizedStatus === 'archived' || existingTask.deleted_at) {
    throw new Error('Task is no longer available.')
  }

  const { data, error } = await supabase
    .from('tasks')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('care_home_id', careHomeId)
    .eq('id', normalizedTaskId)
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
  const parsed = parseStoredTaskDescription(row.description)

  return {
    id: row.id,
    careHomeId: row.care_home_id,
    residentId: row.resident_id,
    title: row.title,
    description: parsed.description,
    category: parsed.category,
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

async function getTaskContext(requiredAccess: 'read' | 'create' | 'manage' | 'status') {
  const { supabase, access } = await getCurrentRequestSupabaseAccess()
  const context = getTaskAccessContext(access)

  if (requiredAccess === 'create' && access.role !== 'admin' && access.role !== 'nurse') {
    throw new Error('Only care home admins and nurses can create tasks.')
  }

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

  return data
}

async function getResidentRowById(
  supabase: TypedSupabaseClient,
  careHomeId: string,
  residentId: string
) {
  const { data, error } = await supabase
    .from('residents')
    .select('id')
    .eq('care_home_id', careHomeId)
    .eq('id', residentId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

function buildTaskUpdatePayload(input: UpdateTaskInput, existingTask: TaskRow | null): TaskUpdate {
  const payload: TaskUpdate = {}

  if ('residentId' in input) {
    payload.resident_id = normalizeOptionalText(input.residentId)
  }

  if ('title' in input && typeof input.title === 'string') {
    payload.title = input.title.trim()
  }

  if ('category' in input || 'description' in input) {
    const parsedExisting = parseStoredTaskDescription(existingTask?.description ?? null)
    payload.description = serializeTaskDescription(
      'category' in input ? input.category : parsedExisting.category,
      'description' in input ? input.description : parsedExisting.description,
    )
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

function parseStoredTaskDescription(value: string | null | undefined) {
  const raw = value ?? ''
  const match = raw.match(TASK_CATEGORY_MARKER)
  const categoryCandidate = match?.[1]?.trim()
  const category = normalizeTaskCategory(categoryCandidate)
  const description = match ? raw.replace(TASK_CATEGORY_MARKER, '').trim() : raw.trim()

  return {
    category,
    description,
  }
}

function serializeTaskDescription(category: TaskCategory | null | undefined, description: string | null | undefined) {
  const normalizedCategory = normalizeTaskCategory(category)
  const normalizedDescription = normalizeOptionalText(description)
  return normalizedDescription
    ? `[[category:${normalizedCategory}]]\n${normalizedDescription}`
    : `[[category:${normalizedCategory}]]`
}

function isStatusOnlyUpdate(input: UpdateTaskInput) {
  const keys = Object.keys(input).filter((key) => key !== 'id')
  return keys.length > 0 && keys.every((key) => key === 'status' || key === 'completedAt')
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

function normalizeTaskCategory(category: string | null | undefined): TaskCategory {
  return typeof category === 'string' && TASK_CATEGORIES.includes(category as TaskCategory)
    ? (category as TaskCategory)
    : 'Other'
}






