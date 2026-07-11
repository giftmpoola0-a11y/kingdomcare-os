import type { MedicationAlertStatus } from '@/app/lib/supabase/medications'

/**
 * Urgency is derived at display time from real medication_alerts fields
 * (status + due_at) - it is never stored, faked, or generated randomly.
 * A "due soon" window of 24 hours keeps this an alert/reminder MVP rather
 * than a scheduled dose-by-dose MAR system.
 */
export type MedicationAlertUrgency =
  | 'overdue'
  | 'due_soon'
  | 'needs_review'
  | 'unresolved'
  | 'acknowledged'
  | 'archived'

export interface MedicationAlertUrgencyInput {
  status: MedicationAlertStatus
  dueAt: string | null
}

const DUE_SOON_WINDOW_MS = 24 * 60 * 60 * 1000

export function getMedicationAlertUrgency(
  alert: MedicationAlertUrgencyInput,
  now: Date = new Date(),
): MedicationAlertUrgency {
  if (alert.status === 'archived') {
    return 'archived'
  }

  if (alert.status === 'resolved') {
    return 'acknowledged'
  }

  const dueAt = alert.dueAt ? new Date(alert.dueAt) : null
  const dueTime = dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt.getTime() : null

  if (dueTime !== null && dueTime <= now.getTime()) {
    return 'overdue'
  }

  if (alert.status === 'reviewing') {
    return 'needs_review'
  }

  if (dueTime !== null && dueTime - now.getTime() <= DUE_SOON_WINDOW_MS) {
    return 'due_soon'
  }

  return 'unresolved'
}

export function isActiveMedicationAlertUrgency(urgency: MedicationAlertUrgency): boolean {
  return urgency === 'overdue' || urgency === 'due_soon' || urgency === 'needs_review' || urgency === 'unresolved'
}

export const MEDICATION_ALERT_URGENCY_LABELS: Record<MedicationAlertUrgency, string> = {
  overdue: 'Overdue',
  due_soon: 'Due soon',
  needs_review: 'Needs review',
  unresolved: 'Open',
  acknowledged: 'Acknowledged',
  archived: 'Archived',
}

export const MEDICATION_ALERT_URGENCY_BADGE_CLASSES: Record<MedicationAlertUrgency, string> = {
  overdue: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/35',
  due_soon: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/35',
  needs_review: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/35',
  unresolved: 'bg-zinc-500/15 text-zinc-300 ring-1 ring-zinc-400/25',
  acknowledged: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/35',
  archived: 'bg-zinc-500/15 text-zinc-400 ring-1 ring-zinc-400/20',
}

export const MEDICATION_ALERT_URGENCY_CARD_CLASSES: Record<MedicationAlertUrgency, string> = {
  overdue: 'border-rose-400/25 bg-rose-500/8',
  due_soon: 'border-amber-400/25 bg-amber-500/8',
  needs_review: 'border-amber-400/20 bg-amber-500/6',
  unresolved: 'border-border bg-background/60',
  acknowledged: 'border-emerald-400/20 bg-emerald-500/8',
  archived: 'border-border bg-background/50',
}

const URGENCY_SORT_RANK: Record<MedicationAlertUrgency, number> = {
  overdue: 0,
  due_soon: 1,
  needs_review: 2,
  unresolved: 3,
  acknowledged: 4,
  archived: 5,
}

export function getMedicationAlertUrgencyRank(urgency: MedicationAlertUrgency): number {
  return URGENCY_SORT_RANK[urgency]
}
