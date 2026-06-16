import type { SavedMedicationEntry } from '@/app/lib/medicationTypes'

const STORAGE_KEY = 'kingdomcare_medications'
const SCHEMA_VERSION = 1

interface MedicationStoragePayload {
  schemaVersion: number
  items: SavedMedicationEntry[]
}

type LegacyMedicationEntry = Partial<SavedMedicationEntry>

export function saveMedication(
  medication: Omit<SavedMedicationEntry, 'id' | 'createdAt' | 'savedAt'>
): SavedMedicationEntry {
  const timestamp = new Date().toISOString()
  const saved: SavedMedicationEntry = {
    ...medication,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: timestamp,
    savedAt: timestamp,
  }

  const existing = loadMedications()
  writeMedications([saved, ...existing])
  return saved
}

export function loadMedications(): SavedMedicationEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as MedicationStoragePayload | LegacyMedicationEntry[]
    const legacyItems = Array.isArray(parsed) ? parsed : parsed?.items
    if (!Array.isArray(legacyItems)) return []

    const normalized = legacyItems
      .map(normalizeMedication)
      .filter((entry): entry is SavedMedicationEntry => entry !== null)
      .sort(compareByCreatedAtDesc)

    const needsMigration =
      Array.isArray(parsed) ||
      !isVersionedPayload(parsed) ||
      normalized.some((entry, index) => legacyItems[index] !== entry)

    if (needsMigration) {
      writeMedications(normalized)
    }

    return normalized
  } catch {
    return []
  }
}

export function deleteMedication(id: string): void {
  const remaining = loadMedications().filter((entry) => entry.id !== id)
  writeMedications(remaining)
}

function normalizeMedication(entry: LegacyMedicationEntry): SavedMedicationEntry | null {
  if (!entry || typeof entry !== 'object') return null

  const residentId = normalizeString(entry.residentId)
  const residentName = normalizeString(entry.residentName)
  const medicationLabel = normalizeString(entry.medicationLabel)
  const scheduledDate = normalizeString(entry.scheduledDate)
  const scheduledTime = normalizeString(entry.scheduledTime)
  const status = normalizeString(entry.status)

  if (!residentId || !residentName || !medicationLabel || !scheduledDate || !scheduledTime || !status) {
    return null
  }

  const createdAt = resolveTimestamp(
    entry.createdAt,
    entry.savedAt,
    `${scheduledDate}T${scheduledTime}`
  )
  const id = normalizeString(entry.id) || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  return {
    id,
    createdAt,
    savedAt: resolveTimestamp(entry.savedAt, entry.createdAt, `${scheduledDate}T${scheduledTime}`),
    residentId,
    residentName,
    medicationLabel,
    scheduledDate,
    scheduledTime,
    status,
    notes: normalizeString(entry.notes),
    whoNotified: normalizeString(entry.whoNotified),
  }
}

function writeMedications(items: SavedMedicationEntry[]) {
  const payload: MedicationStoragePayload = {
    schemaVersion: SCHEMA_VERSION,
    items,
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

function compareByCreatedAtDesc(a: SavedMedicationEntry, b: SavedMedicationEntry) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
}

function resolveTimestamp(...candidates: Array<string | undefined>) {
  for (const candidate of candidates) {
    if (!candidate) continue
    const date = new Date(candidate)
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString()
    }
  }

  return new Date(0).toISOString()
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function isVersionedPayload(value: unknown): value is MedicationStoragePayload {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'schemaVersion' in value &&
      'items' in value
  )
}
