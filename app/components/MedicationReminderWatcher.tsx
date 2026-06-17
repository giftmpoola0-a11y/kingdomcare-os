'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  getDueMedicationEntries,
  getMedicationScheduledDateTime,
  isMedicationOverdue,
} from '@/app/lib/medicationReminders'
import {
  loadMedications,
  markReminderNotified,
  updateMedicationStatus,
} from '@/app/lib/medications'
import type { SavedMedicationEntry } from '@/app/lib/medicationTypes'

function minutesAgo(entry: SavedMedicationEntry, now: Date): string {
  const scheduled = getMedicationScheduledDateTime(entry)
  if (!scheduled) return ''
  const diffMs = now.getTime() - scheduled.getTime()
  if (diffMs < 60_000) return 'just now'
  const mins = Math.floor(diffMs / 60_000)
  return `${mins} min ago`
}

function formatTime(time: string): string {
  if (!time) return ''
  const parts = time.split(':').map(Number)
  const h = parts[0]
  const m = parts[1]
  if (Number.isNaN(h) || Number.isNaN(m)) return time
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function MedicationReminderWatcher() {
  const [dueEntries, setDueEntries] = useState<SavedMedicationEntry[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [notifPermission, setNotifPermission] = useState<
    NotificationPermission | 'unsupported'
  >('default')
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (typeof Notification === 'undefined') {
      setNotifPermission('unsupported')
    } else {
      setNotifPermission(Notification.permission)
    }
  }, [])

  const check = useCallback(() => {
    const currentNow = new Date()
    setNow(currentNow)
    const all = loadMedications()
    const due = getDueMedicationEntries(all, currentNow)
    setDueEntries(due)

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      for (const entry of due) {
        if (!entry.reminderNotifiedAt) {
          try {
            new Notification(`Medication Due: ${entry.medicationLabel}`, {
              body: `${entry.residentName} — scheduled ${formatTime(entry.scheduledTime)}`,
              tag: entry.id,
            })
          } catch {
            // Notification API unavailable in this context
          }
          markReminderNotified(entry.id)
        }
      }
    }
  }, [])

  useEffect(() => {
    check()
    const interval = setInterval(check, 30_000)
    return () => clearInterval(interval)
  }, [check])

  function handleMarkStatus(id: string, status: string) {
    updateMedicationStatus(id, status)
    setDueEntries((prev) => prev.filter((e) => e.id !== id))
  }

  function handleDismiss(id: string) {
    setDismissedIds((prev) => new Set([...prev, id]))
  }

  function handleDismissAll() {
    setDismissedIds((prev) => new Set([...prev, ...dueEntries.map((e) => e.id)]))
  }

  async function handleRequestPermission() {
    if (typeof Notification === 'undefined') return
    const result = await Notification.requestPermission()
    setNotifPermission(result)
    if (result === 'granted') check()
  }

  const visible = dueEntries.filter((e) => !dismissedIds.has(e.id))
  if (visible.length === 0) return null

  const overdueCount = visible.filter((e) => isMedicationOverdue(e, now)).length

  return (
    <div
      role="region"
      aria-label="Medication reminders"
      aria-live="polite"
      className="anim-scale-in fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:w-96"
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div
          className={`flex items-center justify-between px-4 py-3 ${
            overdueCount > 0 ? 'bg-red-600' : 'bg-amber-500'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="text-lg">💊</span>
            <div>
              <p className="text-sm font-bold text-white">
                {visible.length === 1 ? '1 Medication Due' : `${visible.length} Medications Due`}
              </p>
              {overdueCount > 0 && (
                <p className="text-[11px] font-medium text-white/80">
                  {overdueCount} overdue
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismissAll}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-sm text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            aria-label="Dismiss all reminders"
          >
            ✕
          </button>
        </div>

        {/* Disclaimer */}
        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-2">
          <p className="text-[10px] leading-relaxed text-slate-400">
            Browser notifications only work when this app is open or allowed by the browser.
            This prototype does not replace a licensed medication administration system.
          </p>
        </div>

        {/* Enable notifications prompt */}
        {notifPermission === 'default' && (
          <div className="border-b border-slate-100 px-4 py-2.5">
            <button
              type="button"
              onClick={handleRequestPermission}
              className="w-full rounded-lg border border-blue-200 bg-blue-50 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
            >
              Enable browser notifications
            </button>
          </div>
        )}

        {/* Entry list */}
        <div className="max-h-[52vh] divide-y divide-slate-100 overflow-y-auto">
          {visible.map((entry) => {
            const overdue = isMedicationOverdue(entry, now)
            const ago = minutesAgo(entry, now)
            return (
              <div key={entry.id} className="px-4 py-3.5">
                <div className="mb-2.5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-bold text-slate-900">{entry.residentName}</p>
                      {overdue ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                          OVERDUE
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          DUE
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs font-semibold text-slate-600">
                      {entry.medicationLabel}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Scheduled {formatTime(entry.scheduledTime)}
                      {ago && ` · ${ago}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDismiss(entry.id)}
                    className="shrink-0 text-xs text-slate-300 transition-colors hover:text-slate-500"
                    aria-label={`Dismiss reminder for ${entry.residentName}`}
                  >
                    ✕
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <ActionBtn
                    label="Mark Given"
                    onClick={() => handleMarkStatus(entry.id, 'Given')}
                    className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  />
                  <ActionBtn
                    label="Refused"
                    onClick={() => handleMarkStatus(entry.id, 'Refused')}
                    className="border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                  />
                  <ActionBtn
                    label="Missed"
                    onClick={() => handleMarkStatus(entry.id, 'Missed')}
                    className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ActionBtn({
  label,
  onClick,
  className,
}: {
  label: string
  onClick: () => void
  className: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`kc-chip rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${className}`}
    >
      {label}
    </button>
  )
}
