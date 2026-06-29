'use server'

import { revalidatePath } from 'next/cache'
import {
  createIncident,
  resolveIncident,
  softDeleteIncident,
  type IncidentSeverity,
} from '@/app/lib/supabase/incidents'

export type IncidentActionResult =
  | { success: true }
  | { success: false; error: string }

export async function createIncidentAction(input: {
  residentId?: string | null
  incidentType: string
  severity: IncidentSeverity
  occurredAt: string | null
  location: string
  description: string
  immediateAction: string
  whoNotified: string
  followUpNotes: string
}): Promise<IncidentActionResult> {
  try {
    await createIncident({
      residentId: input.residentId ?? null,
      incidentType: input.incidentType,
      severity: input.severity,
      occurredAt: input.occurredAt,
      location: input.location,
      description: input.description,
      immediateAction: input.immediateAction,
      whoNotified: input.whoNotified,
      followUpRequired: Boolean(input.followUpNotes.trim()),
      followUpNotes: input.followUpNotes,
    })

    revalidatePath('/incidents')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save incident. Please try again.',
    }
  }
}

export async function resolveIncidentAction(id: string): Promise<IncidentActionResult> {
  try {
    await resolveIncident(id)
    revalidatePath('/incidents')
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
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to delete incident. Please try again.',
    }
  }
}
