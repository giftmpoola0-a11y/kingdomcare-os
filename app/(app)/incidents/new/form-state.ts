// Radix Select items can't use an empty string as a value, so the "no
// resident selected" option uses this sentinel and is normalized back to
// null when the form is submitted.
export const GENERAL_INCIDENT_RESIDENT_VALUE = '__general__'

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
