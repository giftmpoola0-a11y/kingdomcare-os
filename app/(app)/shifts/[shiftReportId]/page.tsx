import { notFound } from 'next/navigation'
import { getAuthenticatedAppContext } from '@/app/lib/authenticated-app'
import { getCurrentCareHomeShiftReportById, type ShiftReportRecord } from '@/app/lib/supabase/shiftReports'
import ShiftReportDetailClient from './ShiftReportDetailClient'

export default async function ShiftReportDetailPage(props: PageProps<'/shifts/[shiftReportId]'>) {
  const { shiftReportId } = await props.params
  await getAuthenticatedAppContext()

  let shiftReport: ShiftReportRecord | null = null

  try {
    shiftReport = await getCurrentCareHomeShiftReportById(shiftReportId)
  } catch (error) {
    console.error('Failed to load shift report detail:', error)
    notFound()
  }

  if (!shiftReport) {
    notFound()
  }

  return <ShiftReportDetailClient shiftReport={shiftReport} />
}
