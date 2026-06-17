import type { SavedMedicationEntry } from '@/app/lib/medicationTypes'

export const REMINDER_ACTIVE_STATUSES = new Set(['Pending', 'Reminder provided'])

const OVERDUE_THRESHOLD_MS = 15 * 60 * 1000

export function getMedicationScheduledDateTime(entry: SavedMedicationEntry): Date | null {
  const { scheduledDate, scheduledTime } = entry
  if (!scheduledDate || !scheduledTime) return null
  const dt = new Date(`${scheduledDate}T${scheduledTime}`)
  return Number.isNaN(dt.getTime()) ? null : dt
}

export function isMedicationDue(entry: SavedMedicationEntry, now: Date): boolean {
  if (!REMINDER_ACTIVE_STATUSES.has(entry.status)) return false
  const scheduled = getMedicationScheduledDateTime(entry)
  if (!scheduled) return false
  return scheduled.getTime() <= now.getTime()
}

export function isMedicationOverdue(entry: SavedMedicationEntry, now: Date): boolean {
  if (!REMINDER_ACTIVE_STATUSES.has(entry.status)) return false
  const scheduled = getMedicationScheduledDateTime(entry)
  if (!scheduled) return false
  return now.getTime() - scheduled.getTime() >= OVERDUE_THRESHOLD_MS
}

export function getDueMedicationEntries(
  entries: SavedMedicationEntry[],
  now: Date
): SavedMedicationEntry[] {
  return entries.filter((entry) => isMedicationDue(entry, now))
}
