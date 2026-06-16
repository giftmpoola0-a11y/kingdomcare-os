import type { SavedIncident } from '@/app/lib/incidentTypes'

const STORAGE_KEY = 'kingdomcare_incidents'
const SCHEMA_VERSION = 1

interface IncidentStoragePayload {
  schemaVersion: number
  items: SavedIncident[]
}

type LegacyIncident = Partial<SavedIncident>

export function saveIncident(
  incident: Omit<SavedIncident, 'id' | 'createdAt' | 'savedAt'>
): SavedIncident {
  const timestamp = new Date().toISOString()
  const saved: SavedIncident = {
    ...incident,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: timestamp,
    savedAt: timestamp,
  }

  const existing = loadIncidents()
  writeIncidents([saved, ...existing])
  return saved
}

export function loadIncidents(): SavedIncident[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as IncidentStoragePayload | LegacyIncident[]
    const legacyItems = Array.isArray(parsed) ? parsed : parsed?.items
    if (!Array.isArray(legacyItems)) return []

    const normalized = legacyItems
      .map(normalizeIncident)
      .filter((incident): incident is SavedIncident => incident !== null)
      .sort(compareByCreatedAtDesc)

    const needsMigration =
      Array.isArray(parsed) ||
      !isVersionedPayload(parsed) ||
      normalized.some((incident, index) => legacyItems[index] !== incident)

    if (needsMigration) {
      writeIncidents(normalized)
    }

    return normalized
  } catch {
    return []
  }
}

export function deleteIncident(id: string): void {
  const remaining = loadIncidents().filter((incident) => incident.id !== id)
  writeIncidents(remaining)
}

function normalizeIncident(incident: LegacyIncident): SavedIncident | null {
  if (!incident || typeof incident !== 'object') return null

  const residentId = normalizeString(incident.residentId)
  const residentName = normalizeString(incident.residentName)
  const incidentType = normalizeString(incident.incidentType)
  const severity = normalizeString(incident.severity)
  const dateTime = normalizeString(incident.dateTime)
  const description = normalizeString(incident.description)

  if (!residentId || !residentName || !incidentType || !severity || !dateTime || !description) {
    return null
  }

  const createdAt = resolveTimestamp(incident.createdAt, incident.savedAt, incident.dateTime)
  const id = normalizeString(incident.id) || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  return {
    id,
    createdAt,
    savedAt: resolveTimestamp(incident.savedAt, incident.createdAt, incident.dateTime),
    residentId,
    residentName,
    incidentType,
    severity,
    dateTime,
    description,
    actionTaken: normalizeString(incident.actionTaken),
    whoNotified: normalizeString(incident.whoNotified),
    followUp: normalizeString(incident.followUp),
  }
}

function writeIncidents(items: SavedIncident[]) {
  const payload: IncidentStoragePayload = {
    schemaVersion: SCHEMA_VERSION,
    items,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

function compareByCreatedAtDesc(a: SavedIncident, b: SavedIncident) {
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

function isVersionedPayload(value: unknown): value is IncidentStoragePayload {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'schemaVersion' in value &&
      'items' in value
  )
}
