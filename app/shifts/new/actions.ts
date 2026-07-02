'use server'

import { revalidatePath } from 'next/cache'
import {
  createShiftReport,
  type ShiftReportNoteField,
  type ShiftType,
} from '@/app/lib/supabase/shiftReports'

export type ShiftReportActionResult =
  | { success: true }
  | { success: false; error: string }

export async function createShiftReportAction(input: {
  residentId: string
  residentName: string
  shiftDate: string
  shiftType: ShiftType
  summary: string
  notes: ShiftReportNoteField[]
}): Promise<ShiftReportActionResult> {
  try {
    await createShiftReport(input)
    revalidatePath('/shifts/new')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save shift report. Please try again.',
    }
  }
}
