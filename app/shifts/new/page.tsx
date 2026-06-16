'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import PageShell from '@/app/components/ui/PageShell'
import SectionCard from '@/app/components/ui/SectionCard'
import EmptyState from '@/app/components/ui/EmptyState'
import QuickNoteChips from '@/app/components/QuickNoteChips'
import ReportCard from '@/app/components/ReportCard'
import { SHIFT_TYPES } from '@/app/data/demoResidents'
import { FIELD_CHIPS, INITIAL_FORM, NOTE_FIELDS } from '@/app/data/quickNoteChips'
import { buildReport } from '@/app/lib/professionalSummary'
import { saveReport } from '@/app/lib/reports'
import { loadResidents } from '@/app/lib/residents'
import type { DemoResident, FormState, GeneratedReport } from '@/app/lib/reportTypes'

/* ── Shared input classes ──────────────────────────────────── */
const SELECT_CLASS =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-sm text-slate-800 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

const TEXTAREA_CLASS =
  'w-full rounded-xl border border-slate-300 px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none'

/* ── Shift type cards config ────────────────────────────────── */
const SHIFT_TYPE_CONFIG: Record<string, { emoji: string; desc: string; hours: string }> = {
  Morning:   { emoji: '☀️', desc: 'Start of day through lunchtime', hours: '06:00 – 14:00' },
  Evening:   { emoji: '🌆', desc: 'Afternoon through dinnertime',   hours: '14:00 – 22:00' },
  Overnight: { emoji: '🌙', desc: 'Night shift through wake-up',    hours: '22:00 – 06:00' },
}

/* ── Step indicator ─────────────────────────────────────────── */
const STEPS = ['Setup', 'Notes', 'Review']

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1" role="list" aria-label="Form progress">
      {STEPS.map((label, i) => {
        const stepNum = i + 1
        const isComplete = stepNum < current
        const isCurrent  = stepNum === current
        return (
          <div key={label} className="flex items-center gap-1" role="listitem">
            {i > 0 && (
              <div
                className={`h-px w-8 flex-1 transition-colors duration-300 sm:w-12 ${
                  isComplete ? 'bg-blue-500' : 'bg-slate-200'
                }`}
                aria-hidden="true"
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={[
                  'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-200',
                  isComplete ? 'bg-blue-600 text-white'
                  : isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                  : 'bg-slate-200 text-slate-500',
                ].join(' ')}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isComplete ? '✓' : stepNum}
              </div>
              <span
                className={`hidden text-xs font-semibold sm:block ${
                  isCurrent ? 'text-slate-800' : 'text-slate-400'
                }`}
              >
                {label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Main content (needs Suspense for useSearchParams) ──────── */
function NewShiftContent() {
  const searchParams      = useSearchParams()
  const residentIdFromQuery = searchParams.get('residentId')

  const [step, setStep]             = useState<1 | 2 | 3>(1)
  const [form, setForm]             = useState<FormState>(INITIAL_FORM)
  const [report, setReport]         = useState<GeneratedReport | null>(null)
  const [error, setError]           = useState('')
  const [saved, setSaved]           = useState(false)
  const [residents, setResidents]   = useState<DemoResident[]>([])
  const [appliedResidentId, setAppliedResidentId] = useState<string | null>(null)

  useEffect(() => {
    setResidents(loadResidents())
  }, [])

  const activeResidents = residents.filter((r) => r.status !== 'archived')

  /* Pre-select resident from query param */
  useEffect(() => {
    if (
      !residentIdFromQuery ||
      appliedResidentId === residentIdFromQuery ||
      residents.length === 0
    ) return

    const exists = activeResidents.some((r) => r.id === residentIdFromQuery)
    if (!exists) { setAppliedResidentId(residentIdFromQuery); return }

    setForm((prev) => ({ ...prev, residentId: residentIdFromQuery }))
    if (report) setReport(null)
    setAppliedResidentId(residentIdFromQuery)
  }, [activeResidents, appliedResidentId, report, residentIdFromQuery, residents.length])

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (report) { setReport(null); setSaved(false) }
  }

  function handleChipAppend(field: keyof FormState, chip: string) {
    setForm((prev) => {
      const existing = prev[field].trim()
      return { ...prev, [field]: existing ? `${existing}\n${chip}` : chip }
    })
    if (report) { setReport(null); setSaved(false) }
  }

  /* Step 1 → 2 */
  function handleSetupNext() {
    if (!form.residentId) { setError('Please select a resident.'); return }
    if (!form.shiftType)  { setError('Please select a shift type.'); return }
    setError('')
    setStep(2)
  }

  /* Step 2 → 3: generate summary */
  function handleGenerateAndReview() {
    setError('')
    const generated = buildReport(form, residents)
    setReport(generated)
    setStep(3)
  }

  /* Save report */
  function handleSaveReport() {
    if (!report) return
    saveReport({
      residentName: report.residentName,
      shiftType: report.shiftType,
      date: report.date,
      professionalSummary: report.professionalSummary,
      fields: report.fields,
    })
    setSaved(true)
  }

  /* Go back and clear generated report */
  function goBack() {
    setError('')
    if (step === 2) { setStep(1); return }
    if (step === 3) { setReport(null); setSaved(false); setStep(2) }
  }

  /* Reset entire form */
  function handleReset() {
    setForm(INITIAL_FORM)
    setReport(null)
    setSaved(false)
    setError('')
    setStep(1)
    setAppliedResidentId(null)
  }

  /* ── Empty state if no residents ─────────────────────────── */
  if (activeResidents.length === 0) {
    return (
      <PageShell subtitle="Shift Documentation">
        <ShiftPageHeader step={1} />
        <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          <EmptyState
            message="Add a resident before creating a shift report."
            linkHref="/residents"
            linkLabel="Add Resident"
          />
        </main>
      </PageShell>
    )
  }

  return (
    <PageShell subtitle="Shift Documentation">
      <ShiftPageHeader step={step} />

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6">

        {/* ── Step 1: Setup ─────────────────────────────────── */}
        {step === 1 && (
          <SectionCard className="p-6 sm:p-8">
            <StepLabel number={1} label="Who is this shift for?" />

            {/* Resident select */}
            <div className="mt-6 space-y-2">
              <label htmlFor="resident" className="block text-sm font-semibold text-slate-700">
                Resident
              </label>
              <select
                id="resident"
                value={form.residentId}
                onChange={(e) => handleChange('residentId', e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">Choose a resident…</option>
                {activeResidents.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            {/* Shift type cards */}
            <div className="mt-6 space-y-2">
              <p className="block text-sm font-semibold text-slate-700">Shift Type</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {SHIFT_TYPES.map((type) => {
                  const cfg = SHIFT_TYPE_CONFIG[type]
                  const selected = form.shiftType === type
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleChange('shiftType', type)}
                      aria-pressed={selected}
                      className={[
                        'kc-select-card rounded-xl border p-4 text-left transition-all',
                        selected
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40',
                      ].join(' ')}
                    >
                      <span className="block text-2xl" aria-hidden="true">{cfg.emoji}</span>
                      <span className={`mt-2 block text-sm font-bold ${selected ? 'text-blue-800' : 'text-slate-800'}`}>
                        {type}
                      </span>
                      <span className={`mt-0.5 block text-xs ${selected ? 'text-blue-600' : 'text-slate-400'}`}>
                        {cfg.hours}
                      </span>
                      <span className={`mt-1 block text-xs leading-relaxed ${selected ? 'text-blue-700' : 'text-slate-500'}`}>
                        {cfg.desc}
                      </span>
                      {selected && (
                        <span className="mt-2 block text-xs font-bold text-blue-600">✓ Selected</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {error && <ErrorBanner message={error} />}

            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={handleSetupNext}
                className="rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-bold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 hover:shadow-md active:scale-[0.98]"
              >
                Continue — Add Notes →
              </button>
            </div>
          </SectionCard>
        )}

        {/* ── Step 2: Notes ─────────────────────────────────── */}
        {step === 2 && (
          <SectionCard className="p-6 sm:p-8">
            <StepLabel number={2} label="Shift Notes" />

            {/* Resident + shift type summary */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <ShiftSummaryBadge
                resident={activeResidents.find((r) => r.id === form.residentId)?.name ?? ''}
                shiftType={form.shiftType}
              />
            </div>

            <div className="mt-6 space-y-6">
              {NOTE_FIELDS.map(({ id, label, placeholder }) => {
                const fieldChips = FIELD_CHIPS[id]
                return (
                  <div key={id} className="space-y-1.5">
                    <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
                      {label}
                    </label>
                    <textarea
                      id={id}
                      rows={3}
                      value={form[id]}
                      onChange={(e) => handleChange(id, e.target.value)}
                      placeholder={placeholder}
                      className={TEXTAREA_CLASS}
                    />
                    {fieldChips && (
                      <QuickNoteChips
                        title={fieldChips.title}
                        suggestions={fieldChips.chips}
                        onSelect={(chip) => handleChipAppend(id, chip)}
                      />
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={goBack}
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleGenerateAndReview}
                className="rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-bold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 hover:shadow-md active:scale-[0.98]"
              >
                Generate Shift Summary →
              </button>
            </div>
          </SectionCard>
        )}

        {/* ── Step 3: Review & Save ──────────────────────────── */}
        {step === 3 && report && (
          <>
            <div className="flex items-center justify-between gap-3 px-1">
              <button
                type="button"
                onClick={goBack}
                className="text-sm font-semibold text-slate-500 transition-colors hover:text-slate-700"
              >
                ← Edit Notes
              </button>
              {saved && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                  ✓ Report Saved
                </span>
              )}
            </div>

            <ReportCard
              report={report}
              showDetailedNotes
              saveButton={
                saved ? (
                  <div className="space-y-3">
                    <p className="rounded-xl bg-emerald-50 py-3 text-center text-sm font-semibold text-emerald-700">
                      ✓ Saved to Reports page
                    </p>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="w-full rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      Start Another Shift
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveReport}
                    className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-sm transition-all duration-150 hover:bg-emerald-700 hover:shadow-md active:scale-[0.98]"
                  >
                    Save Report
                  </button>
                )
              }
            />
          </>
        )}

      </main>
    </PageShell>
  )
}

/* ── Shared sub-components ──────────────────────────────────── */

function ShiftPageHeader({ step }: { step: number }) {
  return (
    <div className="anim-slide-down border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-blue-600">
            Shift Documentation
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">New Shift</h1>
          <p className="mt-1 text-sm text-slate-500">
            Follow the steps to build a professional shift report.
          </p>
        </div>
        <div className="shrink-0">
          <StepIndicator current={step} />
        </div>
      </div>
    </div>
  )
}

function StepLabel({ number, label }: { number: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-sm">
        {number}
      </span>
      <h2 className="text-lg font-bold text-slate-900">{label}</h2>
    </div>
  )
}

function ShiftSummaryBadge({ resident, shiftType }: { resident: string; shiftType: string }) {
  if (!resident && !shiftType) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      {resident && (
        <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          {resident}
        </span>
      )}
      {shiftType && (
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
          {SHIFT_TYPE_CONFIG[shiftType]?.emoji} {shiftType}
        </span>
      )}
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
    >
      {message}
    </p>
  )
}

/* ── Fallback for Suspense ──────────────────────────────────── */
function NewShiftFallback() {
  return (
    <PageShell subtitle="Shift Documentation">
      <div className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    </PageShell>
  )
}

/* ── Export ─────────────────────────────────────────────────── */
export default function NewShiftPage() {
  return (
    <Suspense fallback={<NewShiftFallback />}>
      <NewShiftContent />
    </Suspense>
  )
}
