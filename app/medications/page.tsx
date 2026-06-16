'use client'

import { useEffect, useState } from 'react'
import PageShell from '@/app/components/ui/PageShell'
import SectionCard from '@/app/components/ui/SectionCard'
import EmptyState from '@/app/components/ui/EmptyState'
import StatusBadge from '@/app/components/ui/StatusBadge'
import QuickNoteChips from '@/app/components/QuickNoteChips'
import { deleteMedication, loadMedications, saveMedication } from '@/app/lib/medications'
import type { MedicationForm, SavedMedicationEntry } from '@/app/lib/medicationTypes'
import { loadResidents } from '@/app/lib/residents'
import type { DemoResident } from '@/app/lib/reportTypes'

/* ── Constants ──────────────────────────────────────────────── */

const STATUS_CONFIG = [
  {
    value: 'Pending',
    desc: 'Not yet administered',
    unselected: 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50',
    selected:   'border-slate-500 bg-slate-100 text-slate-900 ring-2 ring-slate-300',
    dot:        'bg-slate-400',
    badge:      'bg-slate-100 text-slate-600',
  },
  {
    value: 'Given',
    desc: 'Successfully administered',
    unselected: 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50',
    selected:   'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200',
    dot:        'bg-emerald-500',
    badge:      'bg-green-100 text-green-700',
  },
  {
    value: 'Refused',
    desc: 'Resident declined medication',
    unselected: 'border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50',
    selected:   'border-orange-500 bg-orange-50 text-orange-900 ring-2 ring-orange-200',
    dot:        'bg-orange-500',
    badge:      'bg-orange-100 text-orange-700',
  },
  {
    value: 'Missed',
    desc: 'Not administered in the scheduled window',
    unselected: 'border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:bg-red-50',
    selected:   'border-red-500 bg-red-50 text-red-900 ring-2 ring-red-200',
    dot:        'bg-red-500',
    badge:      'bg-red-100 text-red-700',
  },
  {
    value: 'Reminder provided',
    desc: 'Reminder given to resident',
    unselected: 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50',
    selected:   'border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-200',
    dot:        'bg-blue-500',
    badge:      'bg-blue-100 text-blue-700',
  },
  {
    value: 'Held by nurse instruction',
    desc: 'Withheld per nursing guidance',
    unselected: 'border-slate-200 bg-white text-slate-700 hover:border-purple-300 hover:bg-purple-50',
    selected:   'border-purple-500 bg-purple-50 text-purple-900 ring-2 ring-purple-200',
    dot:        'bg-purple-500',
    badge:      'bg-purple-100 text-purple-700',
  },
  {
    value: 'Nurse notified',
    desc: 'Nurse informed of medication status',
    unselected: 'border-slate-200 bg-white text-slate-700 hover:border-yellow-300 hover:bg-yellow-50',
    selected:   'border-yellow-500 bg-yellow-50 text-yellow-900 ring-2 ring-yellow-200',
    dot:        'bg-yellow-500',
    badge:      'bg-yellow-100 text-yellow-800',
  },
]

const WHO_NOTIFIED_CHIPS = [
  'Nurse notified',
  'Supervisor notified',
  'Family notified',
  'No notification required',
]

const INITIAL_FORM: MedicationForm = {
  residentId: '',
  medicationLabel: '',
  scheduledDate: '',
  scheduledTime: '',
  status: '',
  notes: '',
  whoNotified: '',
}

const SELECT_CLASS =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-sm text-slate-800 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

const INPUT_CLASS =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

const TEXTAREA_CLASS =
  'w-full rounded-xl border border-slate-300 px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none'

type FormErrors = Partial<Record<keyof MedicationForm, string>>

/* ── Step indicator ─────────────────────────────────────────── */

const MED_STEPS = ['Resident', 'Details', 'Status', 'Notes']

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1" role="list" aria-label="Form progress">
      {MED_STEPS.map((label, i) => {
        const stepNum    = i + 1
        const isComplete = stepNum < current
        const isCurrent  = stepNum === current
        return (
          <div key={label} className="flex items-center gap-1" role="listitem">
            {i > 0 && (
              <div className={`h-px w-5 sm:w-8 ${isComplete ? 'bg-blue-500' : 'bg-slate-200'}`} aria-hidden="true" />
            )}
            <div className="flex items-center gap-1">
              <div
                className={[
                  'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-all',
                  isComplete ? 'bg-blue-600 text-white'
                  : isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                  : 'bg-slate-200 text-slate-500',
                ].join(' ')}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isComplete ? '✓' : stepNum}
              </div>
              <span className={`hidden text-[11px] font-semibold sm:block ${isCurrent ? 'text-slate-700' : 'text-slate-400'}`}>
                {label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Page ───────────────────────────────────────────────────── */

export default function MedicationsPage() {
  const [step, setStep]           = useState<1 | 2 | 3 | 4>(1)
  const [form, setForm]           = useState<MedicationForm>(INITIAL_FORM)
  const [residents, setResidents] = useState<DemoResident[]>([])
  const [entries, setEntries]     = useState<SavedMedicationEntry[]>([])
  const [errors, setErrors]       = useState<FormErrors>({})

  useEffect(() => {
    setResidents(loadResidents())
    setEntries(loadMedications())
  }, [])

  const activeResidents = residents.filter((r) => r.status !== 'archived')

  function handleChange(field: keyof MedicationForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function handleChipAppend(chip: string) {
    setForm((prev) => {
      const existing = prev.whoNotified.trim()
      return { ...prev, whoNotified: existing ? `${existing}\n${chip}` : chip }
    })
  }

  function goNext() {
    if (step === 1) {
      if (!form.residentId) { setErrors({ residentId: 'Please select a resident.' }); return }
      setErrors({})
      setStep(2)
    } else if (step === 2) {
      const next: FormErrors = {}
      if (!form.medicationLabel.trim()) next.medicationLabel = 'Medication label is required.'
      if (!form.scheduledDate) next.scheduledDate = 'Scheduled date is required.'
      if (!form.scheduledTime) next.scheduledTime = 'Scheduled time is required.'
      setErrors(next)
      if (Object.keys(next).length > 0) return
      setStep(3)
    } else if (step === 3) {
      if (!form.status) { setErrors({ status: 'Please select a status.' }); return }
      setErrors({})
      setStep(4)
    }
  }

  function goBack() {
    setErrors({})
    if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3 | 4)
  }

  function handleSubmit() {
    const resident = activeResidents.find((r) => r.id === form.residentId)
    if (!resident) return

    const saved = saveMedication({
      residentId:      form.residentId,
      residentName:    resident.name,
      medicationLabel: form.medicationLabel.trim(),
      scheduledDate:   form.scheduledDate,
      scheduledTime:   form.scheduledTime,
      status:          form.status,
      notes:           form.notes.trim(),
      whoNotified:     form.whoNotified.trim(),
    })

    setEntries((prev) => [saved, ...prev])
    setForm(INITIAL_FORM)
    setErrors({})
    setStep(1)
  }

  function handleDelete(id: string) {
    if (!window.confirm('Delete this medication entry?')) return
    deleteMedication(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const selectedStatus = STATUS_CONFIG.find((s) => s.value === form.status)

  return (
    <PageShell subtitle="Medication Reminders">
      {/* Page header */}
      <div className="anim-slide-down border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-violet-600">Medications</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Medication Reminder</h1>
            <p className="mt-1 text-sm text-slate-500">Prototype log only — not a real medication administration record.</p>
          </div>
          <div className="shrink-0">
            <StepIndicator current={step} />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6">
        {activeResidents.length === 0 && (
          <EmptyState
            message="Add a resident before logging a medication entry."
            linkHref="/residents"
            linkLabel="Add Resident"
          />
        )}

        {activeResidents.length > 0 && (
          <>
            {/* ── Step 1: Resident ──────────────────────────── */}
            {step === 1 && (
              <SectionCard className="p-6 sm:p-8">
                <StepLabel number={1} label="Which resident?" />
                <div className="mt-6 space-y-2">
                  <label htmlFor="residentId" className="block text-sm font-semibold text-slate-700">
                    Resident <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="residentId"
                    value={form.residentId}
                    onChange={(e) => handleChange('residentId', e.target.value)}
                    className={SELECT_CLASS}
                  >
                    <option value="">Choose a resident…</option>
                    {activeResidents.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  {errors.residentId && <ErrorText message={errors.residentId} />}
                </div>
                <div className="mt-8 flex justify-end">
                  <button type="button" onClick={goNext} className={primaryBtn}>
                    Medication Details →
                  </button>
                </div>
              </SectionCard>
            )}

            {/* ── Step 2: Medication Details ────────────────── */}
            {step === 2 && (
              <SectionCard className="p-6 sm:p-8">
                <StepLabel number={2} label="Medication Details" />

                <div className="mt-4">
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {activeResidents.find((r) => r.id === form.residentId)?.name}
                  </span>
                </div>

                {/* Prototype warning */}
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold text-amber-800">
                    ◆ Prototype only — use fictional medication labels only. This is not a real MAR system.
                  </p>
                </div>

                <div className="mt-5 space-y-5">
                  <div className="space-y-1.5">
                    <label htmlFor="medicationLabel" className="block text-sm font-semibold text-slate-700">
                      Medication Label <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="medicationLabel"
                      type="text"
                      value={form.medicationLabel}
                      onChange={(e) => handleChange('medicationLabel', e.target.value)}
                      placeholder="e.g. Fake Medication A"
                      className={INPUT_CLASS}
                    />
                    {errors.medicationLabel && <ErrorText message={errors.medicationLabel} />}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor="scheduledDate" className="block text-sm font-semibold text-slate-700">
                        Scheduled Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="scheduledDate"
                        type="date"
                        value={form.scheduledDate}
                        onChange={(e) => handleChange('scheduledDate', e.target.value)}
                        className={SELECT_CLASS}
                      />
                      {errors.scheduledDate && <ErrorText message={errors.scheduledDate} />}
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="scheduledTime" className="block text-sm font-semibold text-slate-700">
                        Scheduled Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="scheduledTime"
                        type="time"
                        value={form.scheduledTime}
                        onChange={(e) => handleChange('scheduledTime', e.target.value)}
                        className={SELECT_CLASS}
                      />
                      {errors.scheduledTime && <ErrorText message={errors.scheduledTime} />}
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <button type="button" onClick={goBack} className={secondaryBtn}>← Back</button>
                  <button type="button" onClick={goNext} className={primaryBtn}>Select Status →</button>
                </div>
              </SectionCard>
            )}

            {/* ── Step 3: Status ────────────────────────────── */}
            {step === 3 && (
              <SectionCard className="p-6 sm:p-8">
                <StepLabel number={3} label="What is the medication status?" />

                <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {STATUS_CONFIG.map((status) => {
                    const selected = form.status === status.value
                    return (
                      <button
                        key={status.value}
                        type="button"
                        onClick={() => handleChange('status', status.value)}
                        aria-pressed={selected}
                        className={[
                          'kc-select-card flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all',
                          selected ? status.selected : status.unselected,
                        ].join(' ')}
                      >
                        <div className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${status.dot}`} aria-hidden="true" />
                        <div>
                          <p className="text-sm font-bold">{status.value}</p>
                          <p className="mt-0.5 text-xs leading-relaxed opacity-75">{status.desc}</p>
                          {selected && <p className="mt-1 text-xs font-bold opacity-80">✓ Selected</p>}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {errors.status && <ErrorText message={errors.status} />}

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <button type="button" onClick={goBack} className={secondaryBtn}>← Back</button>
                  <button type="button" onClick={goNext} className={primaryBtn}>Add Notes →</button>
                </div>
              </SectionCard>
            )}

            {/* ── Step 4: Notes & Save ──────────────────────── */}
            {step === 4 && (
              <SectionCard className="p-6 sm:p-8">
                <StepLabel number={4} label="Notes & Notifications" />

                {/* Summary badges */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {activeResidents.find((r) => r.id === form.residentId)?.name}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                    {form.medicationLabel}
                  </span>
                  {selectedStatus && (
                    <StatusBadge label={form.status} colorClass={selectedStatus.badge} />
                  )}
                </div>

                <div className="mt-6 space-y-5">
                  <div className="space-y-1.5">
                    <label htmlFor="notes" className="block text-sm font-semibold text-slate-700">
                      Notes
                    </label>
                    <textarea
                      id="notes"
                      rows={3}
                      value={form.notes}
                      onChange={(e) => handleChange('notes', e.target.value)}
                      placeholder="Prototype notes only…"
                      className={TEXTAREA_CLASS}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="whoNotified" className="block text-sm font-semibold text-slate-700">
                      Who Was Notified
                    </label>
                    <textarea
                      id="whoNotified"
                      rows={2}
                      value={form.whoNotified}
                      onChange={(e) => handleChange('whoNotified', e.target.value)}
                      placeholder="Who was notified about this reminder…"
                      className={TEXTAREA_CLASS}
                    />
                    <QuickNoteChips
                      title="Quick notification notes"
                      suggestions={WHO_NOTIFIED_CHIPS}
                      onSelect={handleChipAppend}
                    />
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <button type="button" onClick={goBack} className={secondaryBtn}>← Back</button>
                  <button type="button" onClick={handleSubmit} className={primaryBtn}>
                    Save Medication Entry
                  </button>
                </div>
              </SectionCard>
            )}
          </>
        )}

        {/* ── Saved entries list ────────────────────────────── */}
        {entries.length === 0 ? (
          <EmptyState message="No medication entries recorded yet. Use the form above to log one." />
        ) : (
          <section className="space-y-3" aria-label="Saved medication entries">
            <p className="px-1 text-xs font-medium text-slate-400">
              {entries.length} entr{entries.length === 1 ? 'y' : 'ies'} recorded locally
            </p>

            {entries.map((entry) => {
              const statusCfg = STATUS_CONFIG.find((s) => s.value === entry.status)
              return (
                <SectionCard key={entry.id} as="article" className="overflow-hidden">
                  <div className="flex items-start justify-between gap-3 px-5 py-4">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-800">{entry.residentName}</p>
                        <StatusBadge
                          label={entry.status}
                          colorClass={statusCfg?.badge ?? 'bg-slate-100 text-slate-600'}
                        />
                      </div>
                      <p className="text-xs font-semibold text-slate-600">{entry.medicationLabel}</p>
                      <p className="text-xs text-slate-400">
                        {formatSchedule(entry.scheduledDate, entry.scheduledTime)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>

                  {(entry.notes || entry.whoNotified) && (
                    <div className="space-y-3 border-t border-slate-100 px-5 py-4">
                      {entry.notes && <MedField label="Notes" value={entry.notes} />}
                      {entry.whoNotified && <MedField label="Who Was Notified" value={entry.whoNotified} />}
                    </div>
                  )}
                </SectionCard>
              )
            })}
          </section>
        )}
      </main>
    </PageShell>
  )
}

/* ── Sub-components ─────────────────────────────────────────── */

function StepLabel({ number, label }: { number: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white shadow-sm">
        {number}
      </span>
      <h2 className="text-lg font-bold text-slate-900">{label}</h2>
    </div>
  )
}

function MedField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm leading-relaxed text-slate-700 whitespace-pre-line">{value}</p>
    </div>
  )
}

function ErrorText({ message }: { message: string }) {
  return <p role="alert" className="text-xs font-medium text-red-600">{message}</p>
}

function formatSchedule(date: string, time: string) {
  const combined = new Date(`${date}T${time}`)
  if (Number.isNaN(combined.getTime())) return `${date} ${time}`.trim()
  return combined.toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

const primaryBtn =
  'rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-bold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 hover:shadow-md active:scale-[0.98]'

const secondaryBtn =
  'rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50'
