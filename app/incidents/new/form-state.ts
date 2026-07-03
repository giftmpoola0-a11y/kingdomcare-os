export type IncidentCreateFieldName =
  | 'incidentType'
  | 'occurredAt'
  | 'description'
  | 'severity'
  | 'residentId'

export type IncidentCreateFieldErrors = Partial<Record<IncidentCreateFieldName, string>>

export interface IncidentCreateFormState {
  error: string | null
  fieldErrors: IncidentCreateFieldErrors
}

export const INITIAL_INCIDENT_CREATE_STATE: IncidentCreateFormState = {
  error: null,
  fieldErrors: {},
}
