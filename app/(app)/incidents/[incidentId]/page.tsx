import { notFound } from 'next/navigation'
import { getAuthenticatedAppContext } from '@/app/lib/authenticated-app'
import {
  getCurrentCareHomeIncidentById,
  getIncidentReporterNames,
  type IncidentRecord,
} from '@/app/lib/supabase/incidents'
import { getResidentById, type ResidentRecord } from '@/app/lib/supabase/residents'
import IncidentDetailClient from './IncidentDetailClient'

export default async function IncidentDetailPage(props: PageProps<'/incidents/[incidentId]'>) {
  const { incidentId } = await props.params
  await getAuthenticatedAppContext()

  let incident: IncidentRecord | null = null

  try {
    incident = await getCurrentCareHomeIncidentById(incidentId)
  } catch (error) {
    console.error('Failed to load incident detail:', error)
    notFound()
  }

  if (!incident) {
    notFound()
  }

  let resident: ResidentRecord | null = null

  if (incident.residentId) {
    try {
      resident = await getResidentById(incident.residentId)
    } catch (error) {
      console.error('Failed to load resident for incident detail:', error)
    }
  }

  const residentName = resident?.name ?? (incident.residentId ? 'Resident record unavailable' : 'General incident')

  let reporterNameById = new Map<string, string>()

  try {
    reporterNameById = await getIncidentReporterNames([incident])
  } catch (error) {
    console.error('Failed to resolve incident reporter names:', error)
  }

  const fallbackName = 'Care team member'
  const createdByName = incident.createdBy ? reporterNameById.get(incident.createdBy) ?? fallbackName : 'Not recorded'
  const reportedByName = incident.reportedBy ? reporterNameById.get(incident.reportedBy) ?? fallbackName : 'Not recorded'

  return (
    <IncidentDetailClient
      incident={incident}
      residentName={residentName}
      createdByName={createdByName}
      reportedByName={reportedByName}
    />
  )
}
