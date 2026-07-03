'use server'

import { revalidatePath } from 'next/cache'
import { completeTask } from '@/app/lib/supabase/tasks'

export type StaffTaskActionResult =
  | { success: true }
  | { success: false; error: string }

export async function completeCaregiverTaskAction(taskId: string): Promise<StaffTaskActionResult> {
  const normalizedTaskId = taskId.trim()

  if (!normalizedTaskId) {
    return { success: false, error: 'Task id is required.' }
  }

  try {
    await completeTask(normalizedTaskId)
    revalidatePath('/staff')
    revalidatePath('/tasks')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark task complete. Please try again.',
    }
  }
}
