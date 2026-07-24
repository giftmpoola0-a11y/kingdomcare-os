'use server'

import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { logServerPerf, measureServerStep } from '@/app/lib/perf'
import { TASK_CATEGORIES, type TaskCategory } from '@/app/lib/taskTypes'
import { createTask, type TaskPriority } from '@/app/lib/supabase/tasks'
import { getCurrentRequestSupabaseAccess } from '@/app/lib/supabase/request-context'
import { GENERAL_TASK_RESIDENT_VALUE, type TaskCreateFormState } from './form-state'

const ALLOWED_PRIORITIES = new Set<TaskPriority>(['low', 'normal', 'high', 'urgent'])

export async function createTaskFromFormAction(
  _prevState: TaskCreateFormState,
  formData: FormData
): Promise<TaskCreateFormState> {
  const startedAt = performance.now()
  const { access } = await measureServerStep('action:create-task:access', async () =>
    getCurrentRequestSupabaseAccess()
  )

  if (!access.isSignedIn) {
    return {
      error: 'You must be signed in to create a task.',
      fieldErrors: {},
    }
  }

  if (!access.hasCareHome || !access.role) {
    return {
      error: 'You must belong to a care home to create a task.',
      fieldErrors: {},
    }
  }

  if (access.role !== 'admin' && access.role !== 'nurse') {
    return {
      error: 'Only care home admins and nurses can create tasks.',
      fieldErrors: {},
    }
  }

  const title = readRequiredText(formData, 'title')
  const description = readOptionalText(formData, 'description')
  const residentIdRaw = readOptionalText(formData, 'residentId')
  const residentId = residentIdRaw === GENERAL_TASK_RESIDENT_VALUE ? null : residentIdRaw
  const categoryRaw = readRequiredText(formData, 'category')
  const priorityRaw = readRequiredText(formData, 'priority')
  const dueDate = readOptionalText(formData, 'dueDate')
  const dueTime = readOptionalText(formData, 'dueTime')

  const fieldErrors: TaskCreateFormState['fieldErrors'] = {}

  if (!title) {
    fieldErrors.title = 'Task title is required.'
  }

  const category = normalizeCategory(categoryRaw)
  if (!category) {
    fieldErrors.category = 'Task category is required.'
  }

  const priority = normalizePriority(priorityRaw)
  if (!priority) {
    fieldErrors.priority = 'Task priority is required.'
  }

  const dueAt = normalizeDueAt(dueDate, dueTime)
  if ((dueDate || dueTime) && !dueAt) {
    fieldErrors.dueAt = dueDate
      ? 'Due date or time is invalid.'
      : 'Choose a due date before adding a due time.'
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      error: 'Please correct the highlighted task details and try again.',
      fieldErrors,
    }
  }

  try {
    await measureServerStep('action:create-task:insert', () =>
      createTask({
        title,
        description,
        residentId,
        category,
        priority,
        dueAt,
      })
    )
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to save task. Please try again.',
      fieldErrors: {},
    }
  }

  after(() => {
    const revalidationStartedAt = performance.now()
    revalidatePath('/tasks')
    revalidatePath('/staff')
    revalidatePath('/')
    logServerPerf('action:create-task:revalidate-paths', performance.now() - revalidationStartedAt, {
      paths: ['/tasks', '/staff', '/'],
    })
  })

  logServerPerf('action:create-task:redirect', 0, {
    location: '/tasks',
  })
  logServerPerf('action:create-task:total', performance.now() - startedAt)

  redirect('/tasks')
}

function readOptionalText(formData: FormData, field: string) {
  const value = formData.get(field)
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function readRequiredText(formData: FormData, field: string) {
  return readOptionalText(formData, field) ?? ''
}

function normalizeCategory(value: string): TaskCategory | null {
  return TASK_CATEGORIES.includes(value as TaskCategory) ? (value as TaskCategory) : null
}

function normalizePriority(value: string): TaskPriority | null {
  return ALLOWED_PRIORITIES.has(value as TaskPriority) ? (value as TaskPriority) : null
}

function normalizeDueAt(dueDate: string | null, dueTime: string | null) {
  if (!dueDate) {
    return dueTime ? null : null
  }

  const parsed = new Date(`${dueDate}T${dueTime ?? '09:00'}`)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toISOString()
}
