'use server'

import { revalidatePath } from 'next/cache'
import {
  createResident,
  updateResident,
  archiveResident,
  softDeleteResident,
  uploadResidentPhoto,
  removeResidentPhoto,
  type CreateResidentInput,
  type UpdateResidentInput,
} from '@/app/lib/supabase/residents'

export type ResidentActionResult =
  | { success: true }
  | { success: false; error: string }

export async function createResidentAction(
  input: CreateResidentInput
): Promise<ResidentActionResult> {
  try {
    await createResident(input)
    revalidatePath('/residents')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save resident. Please try again.',
    }
  }
}

export async function updateResidentAction(
  input: UpdateResidentInput
): Promise<ResidentActionResult> {
  try {
    await updateResident(input)
    revalidatePath('/residents')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update resident. Please try again.',
    }
  }
}

export async function archiveResidentAction(id: string): Promise<ResidentActionResult> {
  try {
    await archiveResident(id)
    revalidatePath('/residents')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to archive resident. Please try again.',
    }
  }
}

export async function deleteResidentAction(id: string): Promise<ResidentActionResult> {
  try {
    await softDeleteResident(id)
    revalidatePath('/residents')
    return { success: true }
  } catch (error) {
    console.error('deleteResidentAction failed', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete resident. Please try again.',
    }
  }
}

export async function restoreResidentAction(id: string): Promise<ResidentActionResult> {
  try {
    await updateResident({ id, status: 'active' })
    revalidatePath('/residents')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore resident. Please try again.',
    }
  }
}

export async function uploadResidentPhotoAction(
  residentId: string,
  formData: FormData
): Promise<ResidentActionResult> {
  try {
    await uploadResidentPhoto(residentId, formData)
    revalidatePath('/residents')
    revalidatePath(`/residents/${residentId}`)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload photo. Please try again.',
    }
  }
}

export async function removeResidentPhotoAction(residentId: string): Promise<ResidentActionResult> {
  try {
    await removeResidentPhoto(residentId)
    revalidatePath('/residents')
    revalidatePath(`/residents/${residentId}`)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove photo. Please try again.',
    }
  }
}
