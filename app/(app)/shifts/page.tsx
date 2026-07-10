import { measureServerStep } from '@/app/lib/perf'
import { getAuthenticatedAppContext } from '@/app/lib/authenticated-app'
import {
  getCurrentCareHomeShiftReports,
  getShiftReportCreatorNames,
  type ShiftReportRecord,
} from '@/app/lib/supabase/shiftReports'
import ShiftsClient from './ShiftsClient'

export default async function ShiftsPage() {
  return measureServerStep('route:/shifts', async () => {
    await getAuthenticatedAppContext()

    let shiftReports: ShiftReportRecord[] = []
    let creatorNameById: Record<string, string> = {}
    let loadError: string | null = null

    try {
      shiftReports = await getCurrentCareHomeShiftReports()
    } catch {
      loadError = 'Unable to load shift reports. Please refresh the page.'
    }

    if (shiftReports.length > 0) {
      try {
        creatorNameById = Object.fromEntries(await getShiftReportCreatorNames(shiftReports))
      } catch (error) {
        console.error('Failed to resolve shift report creator names:', error)
      }
    }

    return (
      <ShiftsClient shiftReports={shiftReports} creatorNameById={creatorNameById} loadError={loadError} />
    )
  })
}
