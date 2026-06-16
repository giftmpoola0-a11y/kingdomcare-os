import type {
  SavedTask,
  TaskAssignedToType,
  TaskCategory,
  TaskInput,
  TaskPriority,
} from '@/app/lib/taskTypes'
import {
  TASK_ASSIGNED_TO_TYPES,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
} from '@/app/lib/taskTypes'

const STORAGE_KEY = 'kingdomcare_tasks'
const SCHEMA_VERSION = 1

interface TaskStoragePayload {
  schemaVersion: number
  items: SavedTask[]
}

type LegacyTask = Partial<SavedTask>

export function loadTasks(): SavedTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as TaskStoragePayload | LegacyTask[]
    const legacyItems = Array.isArray(parsed) ? parsed : parsed?.items
    if (!Array.isArray(legacyItems)) return []

    const normalized = legacyItems
      .map(normalizeTask)
      .filter((task): task is SavedTask => task !== null)
      .sort(compareTasks)

    const needsMigration =
      Array.isArray(parsed) ||
      !isVersionedPayload(parsed) ||
      normalized.some((task, index) => legacyItems[index] !== task)

    if (needsMigration) {
      writeTasks(normalized)
    }

    return normalized
  } catch {
    return []
  }
}

export function saveTask(task: TaskInput): SavedTask {
  const timestamp = new Date().toISOString()
  const saved: SavedTask = {
    ...task,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: timestamp,
    completedAt: task.completed ? resolveTimestamp(task.completedAt, timestamp) : undefined,
  }

  const existing = loadTasks()
  writeTasks([saved, ...existing])
  return saved
}

export function updateTask(updatedTask: SavedTask): SavedTask {
  const existing = loadTasks()
  const nextTasks = existing.map((task) => (task.id === updatedTask.id ? updatedTask : task))
  writeTasks(nextTasks)
  return updatedTask
}

export function deleteTask(id: string): void {
  const remaining = loadTasks().filter((task) => task.id !== id)
  writeTasks(remaining)
}

export function toggleTaskComplete(id: string): SavedTask | undefined {
  const existing = loadTasks()
  const timestamp = new Date().toISOString()
  let toggledTask: SavedTask | undefined

  const nextTasks = existing.map((task) => {
    if (task.id !== id) return task

    toggledTask = {
      ...task,
      completed: !task.completed,
      completedAt: task.completed ? undefined : timestamp,
    }

    return toggledTask
  })

  writeTasks(nextTasks)
  return toggledTask
}

export function clearCompletedTasks(): void {
  const remaining = loadTasks().filter((task) => !task.completed)
  writeTasks(remaining)
}

function normalizeTask(task: LegacyTask): SavedTask | null {
  if (!task || typeof task !== 'object') return null

  const title = normalizeString(task.title)
  const description = normalizeString(task.description)
  const dueDate = normalizeString(task.dueDate)
  const dueTime = normalizeString(task.dueTime)
  const residentId = normalizeOptionalString(task.residentId)
  const residentNameSnapshot = normalizeOptionalString(task.residentNameSnapshot)
  const category = normalizeCategory(task.category)
  const priority = normalizePriority(task.priority)
  const assignedToType = normalizeAssignedToType(task.assignedToType)

  if (!title || !dueDate || !category || !priority || !assignedToType) {
    return null
  }

  const completed = typeof task.completed === 'boolean' ? task.completed : false
  const createdAt = resolveTimestamp(
    task.createdAt,
    task.completedAt,
    dueTime ? `${dueDate}T${dueTime}` : dueDate
  )
  const completedAt = completed
    ? resolveOptionalTimestamp(task.completedAt, task.createdAt)
    : undefined
  const id = normalizeString(task.id) || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  return {
    id,
    title,
    description,
    category,
    priority,
    dueDate,
    dueTime,
    assignedToType,
    residentId,
    residentNameSnapshot,
    completed,
    completedAt,
    createdAt,
  }
}

function writeTasks(items: SavedTask[]) {
  const payload: TaskStoragePayload = {
    schemaVersion: SCHEMA_VERSION,
    items: [...items].sort(compareTasks),
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

function compareTasks(a: SavedTask, b: SavedTask) {
  if (a.completed !== b.completed) {
    return Number(a.completed) - Number(b.completed)
  }

  const dueComparison = compareDueDateTime(a, b)
  if (dueComparison !== 0) {
    return dueComparison
  }

  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
}

function compareDueDateTime(a: SavedTask, b: SavedTask) {
  const aDue = resolveDueTimestamp(a.dueDate, a.dueTime)
  const bDue = resolveDueTimestamp(b.dueDate, b.dueTime)

  if (aDue === bDue) return 0
  return aDue - bDue
}

function resolveDueTimestamp(dueDate: string, dueTime: string) {
  const combined = new Date(`${dueDate}T${dueTime}`)
  if (Number.isNaN(combined.getTime())) {
    return Number.POSITIVE_INFINITY
  }

  return combined.getTime()
}

function resolveTimestamp(...candidates: Array<string | undefined>) {
  for (const candidate of candidates) {
    if (!candidate) continue
    const date = new Date(candidate)
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString()
    }
  }

  return new Date(0).toISOString()
}

function resolveOptionalTimestamp(...candidates: Array<string | undefined>) {
  for (const candidate of candidates) {
    if (!candidate) continue
    const date = new Date(candidate)
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString()
    }
  }

  return undefined
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function normalizeOptionalString(value: unknown) {
  return typeof value === 'string' && value ? value : undefined
}

function normalizeCategory(value: unknown): TaskCategory | null {
  return typeof value === 'string' && TASK_CATEGORIES.includes(value as TaskCategory)
    ? (value as TaskCategory)
    : null
}

function normalizePriority(value: unknown): TaskPriority | null {
  return typeof value === 'string' && TASK_PRIORITIES.includes(value as TaskPriority)
    ? (value as TaskPriority)
    : null
}

function normalizeAssignedToType(value: unknown): TaskAssignedToType | null {
  return typeof value === 'string' &&
    TASK_ASSIGNED_TO_TYPES.includes(value as TaskAssignedToType)
    ? (value as TaskAssignedToType)
    : null
}

function isVersionedPayload(value: unknown): value is TaskStoragePayload {
  return Boolean(value && typeof value === 'object' && 'schemaVersion' in value && 'items' in value)
}
