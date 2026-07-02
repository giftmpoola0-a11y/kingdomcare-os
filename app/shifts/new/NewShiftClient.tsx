'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { NotebookPen, CheckCircle2 } from 'lucide-react'
import { AppSidebar } from '@/components/kingdomos-v0/app-sidebar'
import { AppTopbar } from '@/components/kingdomos-v0/app-topbar'
import { SHIFT_TYPES } from '@/app/data/demoResidents'
import { FIELD_CHIPS, INITIAL_FORM, NOTE_FIELDS } from '@/app/data/quickNoteChips'
import { buildReport } from '@/app/lib/professionalSummary'
import type { FormState, GeneratedReport } from '@/app/lib/reportTypes'
import type { ResidentRecord } from '@/app/lib/supabase/residents'
import type { ShiftType } from '@/app/lib/supabase/shiftReports'
import type { SidebarBadgeCounts } from '@/app/lib/sidebar-badge-counts'
import { cn } from '@/lib/utils'
import { createShiftReportAction } from './actions'

const SHIFT_TYPE_CONFIG: Record<string, { emoji: string; desc: string; hours: string }> = {
  Morning: { emoji: '☀️', desc: 'Start of day through lunchtime', hours: '06:00 - 14:00' },
  Evening: { emoji: '🌆', desc: 'Afternoon through dinnertime', hours: '14:00 - 22:00' },
  Overnight: { emoji: '🌙', desc: 'Night shift through wake-up', hours: '22:00 - 06:00' },
}

const STEPS = ['Setup', 'Notes', 'Review']

const INPUT_CLASS =
  'w-full rounded-xl border border-border bg-background/70 px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-indigo-400/50 focus:outline-none focus:ring-2 focus:ring-indigo-400/15'

const TEXTAREA_CLASS =
  'w-full rounded-xl border border-border bg-background/70 px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-indigo-400/50 focus:outline-none focus:ring-2 focus:ring-indigo-400/15 resize-none'

function isShiftType(value: string): value is ShiftType {
  return value === 'Morning' || value === 'Evening' || value === 'Overnight'
}

export interface NewShiftClientProps {
  activeResidents: ResidentRecord[]
  initialResidentId: string | null
  loadError: string | null
  sidebarBadgeCounts: SidebarBadgeCounts
}

export default function NewShiftClient({
  activeResidents,
  initialResidentId,
  loadError,
  sidebarBadgeCounts,
}: NewShiftClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [form, setForm] = useState<FormState>(() => ({
    ...INITIAL_FORM,
    residentId:
      initialResidentId && activeResidents.some((resident) => resident.id === initialResidentId)
        ? initialResidentId
        : '',
  }))
  const [report, setReport] = useState<GeneratedReport | null>(null)
  const [shiftDateIso, setShiftDateIso] = useState('')
  const [formError, setFormError] = useState('')
  const [actionError, setActionError] = useState('')
  const [saved, setSaved] = useState(false)

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (report) {
      setReport(null)
      setSaved(false)
    }
  }

  function handleChipAppend(field: keyof FormState, chip: string) {
    setForm((prev) => {
      const existing = prev[field].trim()
      return { ...prev, [field]: existing ? `${existing}\n${chip}` : chip }
    })
    if (report) {
      setReport(null)
      setSaved(false)
    }
  }

  function handleSetupNext() {
    if (!form.residentId) {
      setFormError('Please select a resident.')
      return
    }
    if (!form.shiftType) {
      setFormError('Please select a shift type.')
      return
    }
    setFormError('')
    setStep(2)
  }

  function handleGenerateAndReview() {
    setFormError('')
    const generated = buildReport(form, activeResidents)
    if (!generated) {
      setFormError('Unable to generate a shift summary. Please check your selections.')
      return
    }
    setReport(generated)
    setShiftDateIso(new Date().toISOString().slice(0, 10))
    setStep(3)
  }

  function handleSaveReport() {
    if (!report || !isShiftType(report.shiftType)) return

    setActionError('')
    startTransition(async () => {
      const result = await createShiftReportAction({
        residentId: form.residentId,
        residentName: report.residentName,
        shiftDate: shiftDateIso,
        shiftType: report.shiftType as ShiftType,
        summary: report.professionalSummary,
        notes: report.fields,
      })

      if (!result.success) {
        setActionError(result.error)
        return
      }

      setSaved(true)
    })
  }

  function goBack() {
    setFormError('')
    if (step === 2) {
      setStep(1)
      return
    }
    if (step === 3) {
      setReport(null)
      setSaved(false)
      setStep(2)
    }
  }

  function handleReset() {
    setForm(INITIAL_FORM)
    setReport(null)
    setSaved(false)
    setFormError('')
    setActionError('')
    setStep(1)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} badgeCounts={sidebarBadgeCounts} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar onMenu={() => setSidebarOpen(true)} />

        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 md:px-6 lg:py-8">
          <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-500/12 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-indigo-200 ring-1 ring-indigo-400/20">
                  <span className="inline-flex size-2 rounded-full bg-indigo-400" aria-hidden="true" />
                  Shift Documentation
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">New Shift</h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Document a shift for a resident. This saves a real, Supabase-backed shift report for
                  your care home.
                </p>
              </div>
              <StepIndicator current={step} />
            </div>
          </section>

          {loadError && (
            <p
              role="alert"
              className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200"
            >
              {loadError}
            </p>
          )}

          {activeResidents.length === 0 ? (
            <section className="mt-6 rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
              <div className="rounded-2xl border border-dashed border-border bg-background/60 p-8 text-center">
                <p className="text-sm text-muted-foreground">Add a resident before creating a shift report.</p>
                <Link
                  href="/residents"
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                  Add Resident
                </Link>
              </div>
            </section>
          ) : (
            <>
              {/* Step 1: Setup */}
              {step === 1 && (
                <section className="mt-6 rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
                  <StepLabel number={1} label="Who is this shift for?" />

                  <div className="mt-6 space-y-2">
                    <label htmlFor="shiftResident" className="block text-sm font-semibold text-foreground">
                      Resident
                    </label>
                    <select
                      id="shiftResident"
                      value={form.residentId}
                      onChange={(e) => handleChange('residentId', e.target.value)}
                      className={INPUT_CLASS}
                    >
                      <option value="">Select resident...</option>
                      {activeResidents.map((resident) => (
                        <option key={resident.id} value={resident.id}>
                          {resident.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-6 space-y-2">
                    <p className="text-sm font-semibold text-foreground">Shift Type</p>
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
                            className={cn(
                              'rounded-2xl border p-4 text-left transition-colors',
                              selected
                                ? 'border-indigo-400/35 bg-indigo-500/10 text-indigo-200 ring-1 ring-indigo-400/25'
                                : 'border-border bg-background/60 text-foreground hover:bg-accent/40',
                            )}
                          >
                            <span className="block text-2xl" aria-hidden="true">
                              {cfg.emoji}
                            </span>
                            <span className="mt-2 block text-sm font-bold">{type}</span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">{cfg.hours}</span>
                            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                              {cfg.desc}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {formError && <ErrorBanner message={formError} />}

                  <div className="mt-8 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSetupNext}
                      className="rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                    >
                      Continue - Add Notes
                    </button>
                  </div>
                </section>
              )}

              {/* Step 2: Notes */}
              {step === 2 && (
                <section className="mt-6 rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
                  <StepLabel number={2} label="Shift Notes" />

                  <div className="mt-6 space-y-6">
                    {NOTE_FIELDS.map(({ id, label, placeholder }) => {
                      const fieldChips = FIELD_CHIPS[id]
                      return (
                        <div key={id} className="space-y-1.5">
                          <label htmlFor={id} className="block text-sm font-semibold text-foreground">
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
                            <ChipRow chips={fieldChips.chips} onSelect={(chip) => handleChipAppend(id, chip)} />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={goBack}
                      className="rounded-xl border border-border bg-background/70 px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateAndReview}
                      className="rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                    >
                      Generate Shift Summary
                    </button>
                  </div>
                </section>
              )}

              {/* Step 3: Review & Save */}
              {step === 3 && report && (
                <section className="mt-6 rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={goBack}
                      className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Edit Notes
                    </button>
                    {saved && (
                      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/35">
                        Saved
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/25">
                      <NotebookPen className="size-5" />
                    </span>
                    <div>
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground">{report.residentName}</h2>
                      <p className="text-sm text-muted-foreground">
                        {report.shiftType} shift - {report.date}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-border bg-background/60 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      Professional Summary
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-foreground">{report.professionalSummary}</p>
                  </div>

                  <div className="mt-4 space-y-3">
                    {report.fields.map((field) => (
                      <div key={field.label} className="rounded-2xl border border-border bg-background/60 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                          {field.label}
                        </p>
                        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-foreground/85">
                          {field.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {actionError && <ErrorBanner message={actionError} />}

                  <div className="mt-6 border-t border-border pt-4">
                    {saved ? (
                      <div className="space-y-3">
                        <p className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 py-3 text-center text-sm font-semibold text-emerald-300">
                          <CheckCircle2 className="size-4" />
                          Shift report saved for {report.residentName}.
                        </p>
                        <button
                          type="button"
                          onClick={handleReset}
                          className="w-full rounded-xl border border-border bg-background/70 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
                        >
                          Start Another Shift
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={handleSaveReport}
                        className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isPending ? 'Saving...' : 'Save Shift Report'}
                      </button>
                    )}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 shrink-0" role="list" aria-label="Form progress">
      {STEPS.map((label, i) => {
        const stepNum = i + 1
        const isComplete = stepNum < current
        const isCurrent = stepNum === current
        return (
          <div key={label} className="flex items-center gap-1" role="listitem">
            {i > 0 && (
              <div
                className={cn('h-px w-8 flex-1 transition-colors duration-300 sm:w-12', isComplete ? 'bg-indigo-400' : 'bg-border')}
                aria-hidden="true"
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-200',
                  isComplete
                    ? 'bg-indigo-500 text-white'
                    : isCurrent
                      ? 'bg-indigo-500 text-white ring-4 ring-indigo-400/20'
                      : 'bg-background text-muted-foreground',
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isComplete ? '✓' : stepNum}
              </div>
              <span className={cn('hidden text-xs font-semibold sm:block', isCurrent ? 'text-foreground' : 'text-muted-foreground')}>
                {label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StepLabel({ number, label }: { number: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-sm font-bold text-white shadow-sm">
        {number}
      </span>
      <h2 className="text-lg font-semibold text-foreground">{label}</h2>
    </div>
  )
}

function ChipRow({ chips, onSelect }: { chips: string[]; onSelect: (chip: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {chips.map((chip) => (
        <button
          key={chip}
          type="button"
          onClick={() => onSelect(chip)}
          className="rounded-full border border-border bg-background/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {chip}
        </button>
      ))}
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200"
    >
      {message}
    </p>
  )
}
