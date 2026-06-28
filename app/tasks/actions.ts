'use server'

import { revalidatePath } from 'next/cache'
import {
  archiveTask,
  completeTask,
  createTask,
  getCurrentCareHomeTasks,
  softDeleteTask,
  updateTask,
} from '@/app/lib/supabase/tasks'
import type { TaskCategory, TaskPriority } from '@/app/lib/taskTypes'

export type TaskActionResult =
  | { success: true }
  | { success: false; error: string }

export async function createTaskAction(input: {
  title: string
  description: string
  category: TaskCategory
  priority: TaskPriority
  dueAt: string | null
  residentId?: string | null
}): Promise<TaskActionResult> {
  try {
    await createTask({
      title: input.title,
      description: input.description,
      category: input.category,
      priority: normalizePriority(input.priority),
      dueAt: input.dueAt,
      residentId: input.residentId ?? null,
    })
    revalidatePath('/tasks')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save task. Please try again.',
    }
  }
}

export async function toggleTaskCompletionAction(input: {
  id: string
  completed: boolean
}): Promise<TaskActionResult> {
  try {
    if (input.completed) {
      await completeTask(input.id)
    } else {
      await updateTask({ id: input.id, status: 'open', completedAt: null })
    }

    revalidatePath('/tasks')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update task status. Please try again.',
    }
  }
}

export async function deleteTaskAction(id: string): Promise<TaskActionResult> {
  try {
    await softDeleteTask(id)
    revalidatePath('/tasks')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete task. Please try again.',
    }
  }
}

export async function clearCompletedTasksAction(): Promise<TaskActionResult> {
  try {
    const tasks = await getCurrentCareHomeTasks()
    const completedTasks = tasks.filter((task) => task.status === 'completed')

    await Promise.all(completedTasks.map((task) => archiveTask(task.id)))
    revalidatePath('/tasks')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear completed tasks. Please try again.',
    }
  }
}

function normalizePriority(priority: TaskPriority) {
  switch (priority) {
    case 'Low':
      return 'low' as const
    case 'High':
      return 'high' as const
    case 'Urgent':
      return 'urgent' as const
    default:
      return 'normal' as const
  }
}
