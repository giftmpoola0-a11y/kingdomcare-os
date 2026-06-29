'use server'

import { revalidatePath } from 'next/cache'
import {
  createMedication,
  updateMedication,
  pauseMedication,
  discontinueMedication,
  archiveMedication,
  softDeleteMedication,
  createMedicationAlert,
  resolveMedicationAlert,
  archiveMedicationAlert,
  softDeleteMedicationAlert,
} from '@/app/lib/supabase/medications'
import type { MedicationAlertType, MedicationAlertSeverity } from '@/app/lib/supabase/medications'

export type MedicationActionResult =
  | { success: true }
  | { success: false; error: string }

export async function createMedicationAction(input: {
  residentId: string
  medicationName: string
  dosage?: string | null
  route?: string | null
  frequency?: string | null
  scheduleNotes?: string | null
  startDate?: string | null
  endDate?: string | null
  prescribingDoctor?: string | null
}): Promise<MedicationActionResult> {
  try {
    await createMedication(input)
    revalidatePath('/medications')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save medication.',
    }
  }
}

export async function resumeMedicationAction(id: string): Promise<MedicationActionResult> {
  try {
    await updateMedication({ id, status: 'active' })
    revalidatePath('/medications')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resume medication.',
    }
  }
}

export async function pauseMedicationAction(id: string): Promise<MedicationActionResult> {
  try {
    await pauseMedication(id)
    revalidatePath('/medications')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to pause medication.',
    }
  }
}

export async function discontinueMedicationAction(id: string): Promise<MedicationActionResult> {
  try {
    await discontinueMedication(id)
    revalidatePath('/medications')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to discontinue medication.',
    }
  }
}

export async function archiveMedicationAction(id: string): Promise<MedicationActionResult> {
  try {
    await archiveMedication(id)
    revalidatePath('/medications')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to archive medication.',
    }
  }
}

export async function deleteMedicationAction(id: string): Promise<MedicationActionResult> {
  try {
    await softDeleteMedication(id)
    revalidatePath('/medications')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete medication.',
    }
  }
}

export async function createMedicationAlertAction(input: {
  residentId?: string | null
  medicationId?: string | null
  alertType: MedicationAlertType
  severity?: MedicationAlertSeverity | null
  message: string
  dueAt?: string | null
}): Promise<MedicationActionResult> {
  try {
    await createMedicationAlert(input)
    revalidatePath('/medications')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create alert.',
    }
  }
}

export async function resolveMedicationAlertAction(id: string): Promise<MedicationActionResult> {
  try {
    await resolveMedicationAlert(id)
    revalidatePath('/medications')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resolve alert.',
    }
  }
}

export async function archiveMedicationAlertAction(id: string): Promise<MedicationActionResult> {
  try {
    await archiveMedicationAlert(id)
    revalidatePath('/medications')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to archive alert.',
    }
  }
}

export async function deleteMedicationAlertAction(id: string): Promise<MedicationActionResult> {
  try {
    await softDeleteMedicationAlert(id)
    revalidatePath('/medications')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete alert.',
    }
  }
}
