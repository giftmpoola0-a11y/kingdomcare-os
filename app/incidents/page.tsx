'use client'

import { useEffect, useState } from 'react'
import PageShell from '@/app/components/ui/PageShell'
import SectionCard from '@/app/components/ui/SectionCard'
import EmptyState from '@/app/components/ui/EmptyState'
import StatusBadge from '@/app/components/ui/StatusBadge'
import QuickNoteChips from '@/app/components/QuickNoteChips'
import { deleteIncident, loadIncidents, saveIncident } from '@/app/lib/incidents'
import type { IncidentForm, SavedIncident } from '@/app/lib/incidentTypes'
import { loadResidents } from '@/app/lib/residents'
import type { DemoResident } from '@/app/lib/reportTypes'

/* ── Constants ──────────────────────────────────────────────── */

const INCIDENT_TYPE_CONFIG = [
  { value: 'Fall',                    symbol: '↓',  label: 'Fall'                  },
  { value: 'Injury',                  symbol: '⚡',  label: 'Injury'                },
  { value: 'Aggression',              symbol: '!',  label: 'Aggression'            },
  { value: 'Medication refusal',      symbol: '⊘',  label: 'Medication refusal'    },
  { value: 'Meal refusal',            symbol: '✕',  label: 'Meal refusal'          },
  { value: 'Elopement / wandering',   symbol: '→',  label: 'Elopement / wandering' },
  { value: 'Property damage',         symbol: '◻',  label: 'Property damage'       },
  { value: 'Medical concern',         symbol: '+',  label: 'Medical concern'       },
  { value: 'Other',                   symbol: '?',  label: 'Other'                 },
]

const SEVERITY_CONFIG = [
  {
    value: 'Low',
    desc: 'Minor issue, no immediate risk',
    unselected: 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50',
    selected:   'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200',
    dot:        'bg-emerald-500',
    badge:      'bg-green-100 text-green-700',
  },
  {
    value: 'Moderate',
    desc: 'Requires attention and monitoring',
    unselected: 'border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50',
    selected:   'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-200',
    dot:        'bg-amber-500',
    badge:      'bg-yellow-100 text-yellow-700',
  },
  {
    value: 'High',
    desc: 'Significant risk — escalate promptly',
    unselected: 'border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50',
    selected:   'border-orange-500 bg-orange-50 text-orange-900 ring-2 ring-orange-200',
    dot:        'bg-orange-500',
    badge:      'bg-orange-100 text-orange-700',
  },
  {
    value: 'Critical',
    desc: 'Immediate action required',
    unselected: 'border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:bg-red-50',
    selected:   'border-red-500 bg-red-50 text-red-900 ring-2 ring-red-200',
    dot:        'bg-red-500',
    badge:      'bg-red-100 text-red-700',
  },
]

const WHO_NOTIFIED_CHIPS = [
  'Supervisor notified',
  'Nurse notified',
  'Family notified',
  'Emergency services contacted',
  'No notification required',
]

const FOLLOW_UP_CHIPS = [
  'Monitor resident',
  'Complete formal incident report',
  'Follow up with nurse',
  'Follow up with supervisor',
  'Update care plan',
  'No follow-up needed',
]

const INITIAL_FORM: IncidentForm = {
  residentId: '',
  incidentType: '',
  severity: '',
  dateTime: '',
  description: '',
  actionTaken: '',
  whoNotified: '',
  followUp: '',
}

const SELECT_CLASS =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-sm text-slate-800 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

const TEXTAREA_CLASS =
  'w-full rounded-xl border border-slate-300 px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none'

type FormErrors = Partial<Record<keyof IncidentForm, string>>

function formatDateTime(raw: string): string {
  try {
    return new Date(raw).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return raw
  }
}

/* ── Step indicator ─────────────────────────────────────────── */

const INCIDENT_STEPS = ['Resident', 'Type', 'Severity', 'Details']

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1" role="list" aria-label="Form progress">
      {INCIDENT_STEPS.map((label, i) => {
        const stepNum    = i + 1
        const isComplete = stepNum < current
        const isCurrent  = stepNum === current
        return (
          <div key={label} className="flex items-center gap-1" role="listitem">
            {i > 0 && (
              <div className={`h-px w-5 flex-1 sm:w-8 ${isComplete ? 'bg-blue-500' : 'bg-slate-200'}`} aria-hidden="true" />
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

export default function IncidentsPage() {
  const [step, setStep]           = useState<1 | 2 | 3 | 4>(1)
  const [form, setForm]           = useState<IncidentForm>(INITIAL_FORM)
  const [residents, setResidents] = useState<DemoResident[]>([])
  const [incidents, setIncidents] = useState<SavedIncident[]>([])
  const [errors, setErrors]       = useState<FormErrors>({})

  useEffect(() => {
    setResidents(loadResidents())
    setIncidents(loadIncidents())
  }, [])

  const activeResidents = residents.filter((r) => r.status !== 'archived')

  function handleChange(field: keyof IncidentForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function handleChipAppend(field: 'whoNotified' | 'followUp', chip: string) {
    setForm((prev) => {
      const existing = prev[field].trim()
      return { ...prev, [field]: existing ? `${existing}\n${chip}` : chip }
    })
  }

  function goNext() {
    if (step === 1) {
      if (!form.residentId) { setErrors({ residentId: 'Please select a resident.' }); return }
      setErrors({})
      setStep(2)
    } else if (step === 2) {
      if (!form.incidentType) { setErrors({ incidentType: 'Please select an incident type.' }); return }
      setErrors({})
      setStep(3)
    } else if (step === 3) {
      if (!form.severity) { setErrors({ severity: 'Please select a severity level.' }); return }
      setErrors({})
      setStep(4)
    }
  }

  function goBack() {
    setErrors({})
    if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3 | 4)
  }

  function handleSubmit() {
    const next: FormErrors = {}
    if (!form.dateTime) next.dateTime = 'Date and time is required.'
    if (!form.description.trim()) next.description = 'Description is required.'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    const resident = activeResidents.find((r) => r.id === form.residentId)
    if (!resident) return

    const saved = saveIncident({
      residentId:   form.residentId,
      residentName: resident.name,
      incidentType: form.incidentType,
      severity:     form.severity,
      dateTime:     form.dateTime,
      description:  form.description.trim(),
      actionTaken:  form.actionTaken.trim(),
      whoNotified:  form.whoNotified.trim(),
      followUp:     form.followUp.trim(),
    })

    setIncidents((prev) => [saved, ...prev])
    setForm(INITIAL_FORM)
    setErrors({})
    setStep(1)
  }

  function handleDelete(id: string) {
    if (!window.confirm('Delete this incident record?')) return
    deleteIncident(id)
    setIncidents((prev) => prev.filter((i) => i.id !== id))
  }

  const selectedSeverity = SEVERITY_CONFIG.find((s) => s.value === form.severity)

  return (
    <PageShell subtitle="Incident Reporting">
      {/* Page header */}
      <div className="anim-slide-down border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-rose-600">Incidents</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Log Incident</h1>
            <p className="mt-1 text-sm text-slate-500">Prototype data only — not a real incident management system.</p>
          </div>
          <div className="shrink-0">
            <StepIndicator current={step} />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6">
        {activeResidents.length === 0 && (
          <EmptyState
            message="Add a resident before logging an incident."
            linkHref="/residents"
            linkLabel="Add Resident"
          />
        )}

        {activeResidents.length > 0 && (
          <>
            {/* ── Step 1: Select Resident ────────────────────── */}
            {step === 1 && (
              <SectionCard className="p-6 sm:p-8">
                <StepLabel number={1} label="Who was involved?" />
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
                    Select Incident Type →
                  </button>
                </div>
              </SectionCard>
            )}

            {/* ── Step 2: Incident Type ──────────────────────── */}
            {step === 2 && (
              <SectionCard className="p-6 sm:p-8">
                <StepLabel number={2} label="What type of incident?" />

                <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-3">
                  {INCIDENT_TYPE_CONFIG.map((type) => {
                    const selected = form.incidentType === type.value
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => handleChange('incidentType', type.value)}
                        aria-pressed={selected}
                        className={[
                          'kc-select-card flex flex-col items-center rounded-xl border p-3 text-center transition-all',
                          selected
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                            : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40',
                        ].join(' ')}
                      >
                        <span className={`text-lg font-bold ${selected ? 'text-blue-700' : 'text-slate-500'}`} aria-hidden="true">
                          {type.symbol}
                        </span>
                        <span className={`mt-1.5 text-[11px] font-semibold leading-tight ${selected ? 'text-blue-800' : 'text-slate-600'}`}>
                          {type.label}
                        </span>
                        {selected && (
                          <span className="mt-1 text-[10px] font-bold text-blue-600">✓</span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {errors.incidentType && <ErrorText message={errors.incidentType} />}

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <button type="button" onClick={goBack} className={secondaryBtn}>← Back</button>
                  <button type="button" onClick={goNext} className={primaryBtn}>Select Severity →</button>
                </div>
              </SectionCard>
            )}

            {/* ── Step 3: Severity ───────────────────────────── */}
            {step === 3 && (
              <SectionCard className="p-6 sm:p-8">
                <StepLabel number={3} label="How severe was it?" />

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {SEVERITY_CONFIG.map((sev) => {
                    const selected = form.severity === sev.value
                    return (
                      <button
                        key={sev.value}
                        type="button"
                        onClick={() => handleChange('severity', sev.value)}
                        aria-pressed={selected}
                        className={[
                          'kc-select-card flex items-start gap-4 rounded-xl border p-4 text-left transition-all',
                          selected ? sev.selected : sev.unselected,
                        ].join(' ')}
                      >
                        <div className={`mt-0.5 h-3 w-3 shrink-0 rounded-full ${sev.dot}`} aria-hidden="true" />
                        <div>
                          <p className="text-sm font-bold">{sev.value}</p>
                          <p className="mt-0.5 text-xs leading-relaxed opacity-80">{sev.desc}</p>
                          {selected && (
                            <p className="mt-1 text-xs font-bold text-current opacity-80">✓ Selected</p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {errors.severity && <ErrorText message={errors.severity} />}

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <button type="button" onClick={goBack} className={secondaryBtn}>← Back</button>
                  <button type="button" onClick={goNext} className={primaryBtn}>Add Details →</button>
                </div>
              </SectionCard>
            )}

            {/* ── Step 4: Details & Save ─────────────────────── */}
            {step === 4 && (
              <SectionCard className="p-6 sm:p-8">
                <StepLabel number={4} label="Incident Details" />

                {/* Summary badges */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {activeResidents.find((r) => r.id === form.residentId)?.name}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                    {form.incidentType}
                  </span>
                  {selectedSeverity && (
                    <StatusBadge label={form.severity} colorClass={selectedSeverity.badge} />
                  )}
                </div>

                <div className="mt-6 space-y-5">
                  <div className="space-y-1.5">
                    <label htmlFor="dateTime" className="block text-sm font-semibold text-slate-700">
                      Date &amp; Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="dateTime"
                      type="datetime-local"
                      value={form.dateTime}
                      onChange={(e) => handleChange('dateTime', e.target.value)}
                      className={SELECT_CLASS}
                    />
                    {errors.dateTime && <ErrorText message={errors.dateTime} />}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="description" className="block text-sm font-semibold text-slate-700">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="description"
                      rows={4}
                      value={form.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      placeholder="Describe what happened…"
                      className={TEXTAREA_CLASS}
                    />
                    {errors.description && <ErrorText message={errors.description} />}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="actionTaken" className="block text-sm font-semibold text-slate-700">
                      Action Taken
                    </label>
                    <textarea
                      id="actionTaken"
                      rows={3}
                      value={form.actionTaken}
                      onChange={(e) => handleChange('actionTaken', e.target.value)}
                      placeholder="What was done immediately…"
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
                      placeholder="Who was informed…"
                      className={TEXTAREA_CLASS}
                    />
                    <QuickNoteChips
                      title="Quick notification notes"
                      suggestions={WHO_NOTIFIED_CHIPS}
                      onSelect={(chip) => handleChipAppend('whoNotified', chip)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="followUp" className="block text-sm font-semibold text-slate-700">
                      Follow-up Needed
                    </label>
                    <textarea
                      id="followUp"
                      rows={2}
                      value={form.followUp}
                      onChange={(e) => handleChange('followUp', e.target.value)}
                      placeholder="Any follow-up actions required…"
                      className={TEXTAREA_CLASS}
                    />
                    <QuickNoteChips
                      title="Quick follow-up notes"
                      suggestions={FOLLOW_UP_CHIPS}
                      onSelect={(chip) => handleChipAppend('followUp', chip)}
                    />
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <button type="button" onClick={goBack} className={secondaryBtn}>← Back</button>
                  <button type="button" onClick={handleSubmit} className={primaryBtn}>
                    Save Incident
                  </button>
                </div>
              </SectionCard>
            )}
          </>
        )}

        {/* ── Saved incidents list ──────────────────────────── */}
        {incidents.length === 0 ? (
          <EmptyState message="No incidents recorded yet. Use the form above to log one." />
        ) : (
          <section className="space-y-3" aria-label="Saved incidents">
            <p className="px-1 text-xs font-medium text-slate-400">
              {incidents.length} incident{incidents.length !== 1 ? 's' : ''} recorded locally
            </p>

            {incidents.map((incident) => {
              const sev = SEVERITY_CONFIG.find((s) => s.value === incident.severity)
              return (
                <SectionCard key={incident.id} as="article" className="overflow-hidden">
                  <div className="flex items-start justify-between gap-3 px-5 py-4">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-800">{incident.residentName}</p>
                        <StatusBadge
                          label={incident.severity}
                          colorClass={sev?.badge ?? 'bg-slate-100 text-slate-600'}
                        />
                      </div>
                      <p className="text-xs font-semibold text-slate-600">{incident.incidentType}</p>
                      <p className="text-xs text-slate-400">{formatDateTime(incident.dateTime)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(incident.id)}
                      className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="space-y-3 border-t border-slate-100 px-5 py-4">
                    <IncidentField label="Description" value={incident.description} />
                    {incident.actionTaken && (
                      <IncidentField label="Action Taken" value={incident.actionTaken} />
                    )}
                    {incident.whoNotified && (
                      <IncidentField label="Who Was Notified" value={incident.whoNotified} />
                    )}
                    {incident.followUp && (
                      <IncidentField label="Follow-up Needed" value={incident.followUp} />
                    )}
                  </div>
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
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-600 text-sm font-bold text-white shadow-sm">
        {number}
      </span>
      <h2 className="text-lg font-bold text-slate-900">{label}</h2>
    </div>
  )
}

function IncidentField({ label, value }: { label: string; value: string }) {
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

const primaryBtn =
  'rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-bold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 hover:shadow-md active:scale-[0.98]'

const secondaryBtn =
  'rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50'
