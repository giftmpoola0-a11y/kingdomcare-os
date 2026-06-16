export interface ReportField {
  label: string
  value: string
}

export interface SavedReport {
  id: string
  createdAt: string
  savedAt: string
  residentName: string
  shiftType: string
  date: string
  professionalSummary: string
  fields: ReportField[]
}

export type ResidentStatus = 'active' | 'archived'

export interface DemoResident {
  id: string
  name: string
  age: number
  careLevel: string
  primarySupportNeeds: string[]
  notes: string
  status?: ResidentStatus
}

export interface FormState {
  residentId: string
  shiftType: string
  meals: string
  hygiene: string
  mood: string
  behavior: string
  medication: string
  activities: string
  incidents: string
  generalNotes: string
}

export interface GeneratedReport {
  residentName: string
  shiftType: string
  date: string
  professionalSummary: string
  fields: ReportField[]
}

export interface QuickNoteConfig {
  title: string
  chips: string[]
}

export interface NoteFieldConfig {
  id: keyof FormState
  label: string
  placeholder: string
}
