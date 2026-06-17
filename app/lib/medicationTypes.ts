export interface SavedMedicationEntry {
  id: string
  createdAt: string
  savedAt: string
  residentId: string
  residentName: string
  medicationLabel: string
  scheduledDate: string
  scheduledTime: string
  status: string
  notes: string
  whoNotified: string
  reminderNotifiedAt?: string
  acknowledgedAt?: string
}

export interface MedicationForm {
  residentId: string
  medicationLabel: string
  scheduledDate: string
  scheduledTime: string
  status: string
  notes: string
  whoNotified: string
}
