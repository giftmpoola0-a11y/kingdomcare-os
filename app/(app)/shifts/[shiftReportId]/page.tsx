import { notFound } from 'next/navigation'
import { getAuthenticatedAppContext } from '@/app/lib/authenticated-app'
import {
  getCurrentCareHomeShiftReportById,
  getShiftReportCreatorNames,
  type ShiftReportRecord,
} from '@/app/lib/supabase/shiftReports'
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

  let createdByName = 'Care team member'

  try {
    const creatorNameById = await getShiftReportCreatorNames([shiftReport])
    createdByName = creatorNameById.get(shiftReport.createdBy) ?? createdByName
  } catch (error) {
    console.error('Failed to resolve shift report creator name:', error)
  }

  return <ShiftReportDetailClient shiftReport={shiftReport} createdByName={createdByName} />
}
