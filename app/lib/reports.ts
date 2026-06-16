import type { SavedReport } from '@/app/lib/reportTypes'

const STORAGE_KEY = 'kingdomcare_reports'
const SCHEMA_VERSION = 1

interface ReportStoragePayload {
  schemaVersion: number
  items: SavedReport[]
}

type LegacyReport = Partial<SavedReport>

export function saveReport(
  report: Omit<SavedReport, 'id' | 'createdAt' | 'savedAt'>
): SavedReport {
  const timestamp = new Date().toISOString()
  const saved: SavedReport = {
    ...report,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: timestamp,
    savedAt: timestamp,
  }

  const existing = loadReports()
  writeReports([saved, ...existing])
  return saved
}

export function loadReports(): SavedReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as ReportStoragePayload | LegacyReport[]
    const legacyItems = Array.isArray(parsed) ? parsed : parsed?.items
    if (!Array.isArray(legacyItems)) return []

    const normalized = legacyItems
      .map(normalizeReport)
      .filter((report): report is SavedReport => report !== null)
      .sort(compareByCreatedAtDesc)

    const needsMigration =
      Array.isArray(parsed) ||
      !isVersionedPayload(parsed) ||
      normalized.some((report, index) => legacyItems[index] !== report)

    if (needsMigration) {
      writeReports(normalized)
    }

    return normalized
  } catch {
    return []
  }
}

export function deleteReport(id: string): void {
  const remainingReports = loadReports().filter((report) => report.id !== id)
  writeReports(remainingReports)
}

function normalizeReport(report: LegacyReport): SavedReport | null {
  if (!report || typeof report !== 'object') return null

  const residentName = normalizeString(report.residentName)
  const shiftType = normalizeString(report.shiftType)
  const date = normalizeString(report.date)
  const professionalSummary = normalizeString(report.professionalSummary)
  const fields = Array.isArray(report.fields) ? report.fields : []

  if (!residentName || !shiftType || !date || !professionalSummary) {
    return null
  }

  const createdAt = resolveTimestamp(report.createdAt, report.savedAt, report.date)
  const id = normalizeString(report.id) || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  return {
    id,
    createdAt,
    savedAt: resolveTimestamp(report.savedAt, report.createdAt, report.date),
    residentName,
    shiftType,
    date,
    professionalSummary,
    fields: fields
      .filter((field): field is { label: string; value: string } => {
        return Boolean(field && typeof field.label === 'string' && typeof field.value === 'string')
      })
      .map((field) => ({ label: field.label, value: field.value })),
  }
}

function writeReports(items: SavedReport[]) {
  const payload: ReportStoragePayload = {
    schemaVersion: SCHEMA_VERSION,
    items,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

function compareByCreatedAtDesc(a: SavedReport, b: SavedReport) {
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

function isVersionedPayload(value: unknown): value is ReportStoragePayload {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'schemaVersion' in value &&
      'items' in value
  )
}
