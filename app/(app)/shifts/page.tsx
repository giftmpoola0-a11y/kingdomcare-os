import { measureServerStep } from '@/app/lib/perf'
import { getAuthenticatedAppContext } from '@/app/lib/authenticated-app'
import {
  getCurrentCareHomeShiftReports,
  type ShiftReportRecord,
} from '@/app/lib/supabase/shiftReports'
import ShiftsClient from './ShiftsClient'

export default async function ShiftsPage() {
  return measureServerStep('route:/shifts', async () => {
    await getAuthenticatedAppContext()

    let shiftReports: ShiftReportRecord[] = []
    let loadError: string | null = null

    try {
      shiftReports = await getCurrentCareHomeShiftReports()
    } catch {
      loadError = 'Unable to load shift reports. Please refresh the page.'
    }

    return <ShiftsClient shiftReports={shiftReports} loadError={loadError} />
  })
}
