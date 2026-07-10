'use server'

import { revalidatePath } from 'next/cache'
import {
  createShiftReport,
  type ShiftReportNoteField,
  type ShiftType,
} from '@/app/lib/supabase/shiftReports'

export type ShiftReportActionResult =
  | { success: true; id: string }
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
    const report = await createShiftReport(input)
    revalidatePath('/shifts')
    revalidatePath(`/shifts/${report.id}`)
    revalidatePath('/staff')
    revalidatePath('/')
    return { success: true, id: report.id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save shift report. Please try again.',
    }
  }
}
