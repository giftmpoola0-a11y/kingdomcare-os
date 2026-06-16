import { DEMO_RESIDENTS } from '@/app/data/demoResidents'
import type { DemoResident } from '@/app/lib/reportTypes'
import { loadReports } from '@/app/lib/reports'
import { loadIncidents } from '@/app/lib/incidents'
import { loadMedications } from '@/app/lib/medications'

const STORAGE_KEY = 'kingdomcare_residents'
const DEMO_RESIDENT_IDS = new Set(DEMO_RESIDENTS.map((resident) => resident.id))

export type ResidentInput = Omit<DemoResident, 'id' | 'status'>
export interface ResidentRecordUsage {
  reports: number
  incidents: number
  medications: number
}

export function loadResidents(): DemoResident[] {
  const residentMap = new Map<string, DemoResident>()

  for (const resident of DEMO_RESIDENTS) {
    residentMap.set(resident.id, { ...resident, status: 'active' })
  }

  for (const resident of loadLocalResidents()) {
    residentMap.set(resident.id, resident)
  }

  return Array.from(residentMap.values())
}

export function saveResident(resident: ResidentInput): DemoResident {
  const savedResident: DemoResident = {
    ...resident,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    status: 'active',
  }

  const existingResidents = loadLocalResidents()
  localStorage.setItem(STORAGE_KEY, JSON.stringify([savedResident, ...existingResidents]))
  return savedResident
}

export function deleteResident(id: string): void {
  if (!isLocalResident(id)) {
    return
  }

  const remainingResidents = loadLocalResidents().filter((resident) => resident.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(remainingResidents))
}

export function archiveResident(id: string): DemoResident | undefined {
  return updateResidentStatus(id, 'archived')
}

export function restoreResident(id: string): DemoResident | undefined {
  return updateResidentStatus(id, 'active')
}

export function updateResident(updatedResident: DemoResident): DemoResident {
  if (!isLocalResident(updatedResident.id)) {
    return updatedResident
  }

  const existingResidents = loadLocalResidents()
  const nextResidents = existingResidents.map((resident) =>
    resident.id === updatedResident.id ? updatedResident : resident
  )

  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextResidents))
  return updatedResident
}

export function getResidentById(id: string): DemoResident | undefined {
  return loadResidents().find((resident) => resident.id === id)
}

export function isLocalResident(id: string): boolean {
  return !DEMO_RESIDENT_IDS.has(id)
}

export function getResidentRecordUsage(id: string): ResidentRecordUsage {
  const resident = getResidentById(id)

  if (!resident) {
    return { reports: 0, incidents: 0, medications: 0 }
  }

  return {
    reports: loadReports().filter((report) => report.residentName === resident.name).length,
    incidents: loadIncidents().filter(
      (incident) => incident.residentId === resident.id || incident.residentName === resident.name
    ).length,
    medications: loadMedications().filter(
      (entry) => entry.residentId === resident.id || entry.residentName === resident.name
    ).length,
  }
}

function updateResidentStatus(id: string, status: NonNullable<DemoResident['status']>) {
  if (!isLocalResident(id)) {
    return undefined
  }

  const resident = getResidentById(id)
  if (!resident) {
    return undefined
  }

  return updateResident({ ...resident, status })
}

function loadLocalResidents(): DemoResident[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as DemoResident[]
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((resident): resident is DemoResident => Boolean(resident && typeof resident === 'object'))
      .map((resident) => ({
        ...resident,
        status: resident.status === 'archived' ? 'archived' : 'active',
      }))
  } catch {
    return []
  }
}
