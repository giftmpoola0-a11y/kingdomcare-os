'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createIncident, type IncidentSeverity } from '@/app/lib/supabase/incidents'
import type { IncidentCreateFormState } from './form-state'

const ALLOWED_SEVERITIES = new Set<IncidentSeverity>(['low', 'medium', 'high', 'critical'])

export async function createIncidentFromFormAction(
  _prevState: IncidentCreateFormState,
  formData: FormData
): Promise<IncidentCreateFormState> {
  const residentId = readOptionalText(formData, 'residentId')
  const incidentType = readRequiredText(formData, 'incidentType')
  const occurredAtRaw = readRequiredText(formData, 'occurredAt')
  const description = readRequiredText(formData, 'description')
  const severityRaw = readOptionalText(formData, 'severity')
  const location = readOptionalText(formData, 'location')
  const immediateAction = readOptionalText(formData, 'immediateAction')
  const whoNotified = readOptionalText(formData, 'whoNotified')
  const followUpNotes = readOptionalText(formData, 'followUpNotes')

  const fieldErrors: IncidentCreateFormState['fieldErrors'] = {}

  if (!incidentType) {
    fieldErrors.incidentType = 'Incident type is required.'
  }

  if (!occurredAtRaw) {
    fieldErrors.occurredAt = 'Date and time is required.'
  }

  if (!description) {
    fieldErrors.description = 'Description is required.'
  }

  const occurredAt = normalizeOccurredAt(occurredAtRaw)

  if (occurredAtRaw && !occurredAt) {
    fieldErrors.occurredAt = 'Date and time is invalid.'
  }

  const severity = normalizeSeverity(severityRaw)

  if (severityRaw && !severity) {
    fieldErrors.severity = 'Severity is invalid.'
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      error: 'Please correct the highlighted incident details and try again.',
      fieldErrors,
    }
  }

  let incidentId: string

  try {
    const incident = await createIncident({
      residentId,
      incidentType,
      severity: severity ?? 'medium',
      occurredAt,
      location,
      description,
      immediateAction,
      whoNotified,
      followUpRequired: Boolean(followUpNotes),
      followUpNotes,
    })

    incidentId = incident.id
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to save incident. Please try again.',
      fieldErrors: {},
    }
  }

  revalidatePath('/')
  revalidatePath('/reports')
  revalidatePath('/staff')
  revalidatePath('/incidents')
  revalidatePath(`/incidents/${incidentId}`)
  redirect(`/incidents/${incidentId}`)
}

function readOptionalText(formData: FormData, field: string) {
  const value = formData.get(field)
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function readRequiredText(formData: FormData, field: string) {
  return readOptionalText(formData, field) ?? ''
}

function normalizeOccurredAt(value: string) {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toISOString()
}

function normalizeSeverity(value: string | null) {
  if (!value) {
    return null
  }

  return ALLOWED_SEVERITIES.has(value as IncidentSeverity) ? (value as IncidentSeverity) : null
}
