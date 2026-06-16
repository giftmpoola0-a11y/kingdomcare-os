export const TASK_CATEGORIES = [
  'House task',
  'Cleaning',
  'Meal prep',
  'Resident activity',
  'Appointment',
  'Supply check',
  'Follow-up',
  'Other',
] as const

export const TASK_PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'] as const

export const TASK_ASSIGNED_TO_TYPES = ['House', 'Resident'] as const

export type TaskCategory = (typeof TASK_CATEGORIES)[number]
export type TaskPriority = (typeof TASK_PRIORITIES)[number]
export type TaskAssignedToType = (typeof TASK_ASSIGNED_TO_TYPES)[number]

export interface SavedTask {
  id: string
  title: string
  description: string
  category: TaskCategory
  priority: TaskPriority
  dueDate: string
  dueTime: string
  assignedToType: TaskAssignedToType
  residentId?: string
  residentNameSnapshot?: string
  completed: boolean
  completedAt?: string
  createdAt: string
}

export type TaskInput = Omit<SavedTask, 'id' | 'createdAt'>
