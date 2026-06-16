export interface SavedIncident {
  id: string
  createdAt: string
  savedAt: string
  residentId: string
  residentName: string
  incidentType: string
  severity: string
  dateTime: string
  description: string
  actionTaken: string
  whoNotified: string
  followUp: string
}

export interface IncidentForm {
  residentId: string
  incidentType: string
  severity: string
  dateTime: string
  description: string
  actionTaken: string
  whoNotified: string
  followUp: string
}
