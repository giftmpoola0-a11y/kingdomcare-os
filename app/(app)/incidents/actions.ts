'use server'

import { revalidatePath } from 'next/cache'
import { resolveIncident, softDeleteIncident } from '@/app/lib/supabase/incidents'

export type IncidentActionResult =
  | { success: true }
  | { success: false; error: string }

export async function resolveIncidentAction(id: string): Promise<IncidentActionResult> {
  try {
    await resolveIncident(id)
    revalidatePath('/incidents')
    revalidatePath(`/incidents/${id}`)
    revalidatePath('/staff')
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to resolve incident. Please try again.',
    }
  }
}

export async function deleteIncidentAction(id: string): Promise<IncidentActionResult> {
  try {
    await softDeleteIncident(id)
    revalidatePath('/incidents')
    revalidatePath(`/incidents/${id}`)
    revalidatePath('/staff')
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to delete incident. Please try again.',
    }
  }
}
