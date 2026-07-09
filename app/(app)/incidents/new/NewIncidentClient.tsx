'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { ArrowLeft, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { ResidentRecord } from '@/app/lib/supabase/residents'
import { createIncidentFromFormAction } from './actions'
import { INITIAL_INCIDENT_CREATE_STATE } from './form-state'

const INCIDENT_TYPES = [
  'Fall',
  'Injury',
  'Aggression',
  'Medication refusal',
  'Meal refusal',
  'Elopement / wandering',
  'Property damage',
  'Medical concern',
  'Other',
]

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
] as const

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

interface NewIncidentClientProps {
  activeResidents: ResidentRecord[]
  loadError: string | null
}

export default function NewIncidentClient({
  activeResidents,
  loadError,
}: NewIncidentClientProps) {
  const [state, formAction] = useActionState(createIncidentFromFormAction, INITIAL_INCIDENT_CREATE_STATE)
  const [whoNotified, setWhoNotified] = useState('')
  const [followUpNotes, setFollowUpNotes] = useState('')
  const [occurredAtDefault] = useState(() => buildInitialOccurredAt())

  function appendChip(
    field: 'whoNotified' | 'followUpNotes',
    value: string
  ) {
    if (field === 'whoNotified') {
      setWhoNotified((current) => appendLine(current, value))
      return
    }

    setFollowUpNotes((current) => appendLine(current, value))
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 md:px-6 lg:py-8">
          <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-rose-500/12 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-rose-200 ring-1 ring-rose-400/20">
                  <span className="inline-flex size-2 rounded-full bg-rose-400" aria-hidden="true" />
                  Incident reporting
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  New Incident
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Log a real incident for your care home and send it back to the live incident workspace.
                </p>
              </div>

              <Button asChild variant="outline" className="h-11 rounded-xl px-4 text-sm font-semibold">
                <Link href="/incidents">
                  <ArrowLeft className="size-4" />
                  Back to Incident Log
                </Link>
              </Button>
            </div>
          </section>

          {loadError ? <ErrorBanner message={loadError} className="mt-4" /> : null}
          {state.error ? <ErrorBanner message={state.error} className="mt-4" /> : null}

          <section className="mt-6 rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/25">
                <TriangleAlert className="size-5" />
              </span>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Incident details</h2>
                <p className="text-sm text-muted-foreground">
                  Capture the essentials without leaving the staff workflow.
                </p>
              </div>
            </div>

            {activeResidents.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-border bg-background/60 p-4 text-sm text-muted-foreground">
                No active residents were found. You can still save a general incident without selecting a resident.
              </div>
            ) : null}

            <form action={formAction} className="mt-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Resident" htmlFor="residentId" error={state.fieldErrors.residentId}>
                  <select
                    id="residentId"
                    name="residentId"
                    defaultValue=""
                    className="flex h-11 w-full rounded-xl border border-input bg-input/30 px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="">General incident / no resident selected</option>
                    {activeResidents.map((resident) => (
                      <option key={resident.id} value={resident.id}>
                        {resident.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Incident type" htmlFor="incidentType" error={state.fieldErrors.incidentType}>
                  <select
                    id="incidentType"
                    name="incidentType"
                    defaultValue=""
                    className="flex h-11 w-full rounded-xl border border-input bg-input/30 px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="">Select type...</option>
                    {INCIDENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Severity" htmlFor="severity" error={state.fieldErrors.severity}>
                  <select
                    id="severity"
                    name="severity"
                    defaultValue="medium"
                    className="flex h-11 w-full rounded-xl border border-input bg-input/30 px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {SEVERITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Date and time" htmlFor="occurredAt" error={state.fieldErrors.occurredAt}>
                  <Input
                    id="occurredAt"
                    name="occurredAt"
                    type="datetime-local"
                    defaultValue={occurredAtDefault}
                    className="h-11 rounded-xl bg-input/30"
                  />
                </Field>
              </div>

              <Field label="Location" htmlFor="location">
                <Input
                  id="location"
                  name="location"
                  type="text"
                  placeholder="e.g. Dining room"
                  className="h-11 rounded-xl bg-input/30"
                />
              </Field>

              <Field label="Description" htmlFor="description" error={state.fieldErrors.description}>
                <Textarea
                  id="description"
                  name="description"
                  rows={5}
                  placeholder="Describe what happened..."
                  className="min-h-28 rounded-xl bg-input/30"
                />
              </Field>

              <Field label="Immediate action taken" htmlFor="immediateAction">
                <Textarea
                  id="immediateAction"
                  name="immediateAction"
                  rows={3}
                  placeholder="What was done immediately..."
                  className="min-h-24 rounded-xl bg-input/30"
                />
              </Field>

              <Field label="Who was notified" htmlFor="whoNotified">
                <Textarea
                  id="whoNotified"
                  name="whoNotified"
                  rows={3}
                  value={whoNotified}
                  onChange={(event) => setWhoNotified(event.target.value)}
                  className="min-h-24 rounded-xl bg-input/30"
                />
                <ChipRow chips={WHO_NOTIFIED_CHIPS} onSelect={(chip) => appendChip('whoNotified', chip)} />
              </Field>

              <Field label="Follow-up notes" htmlFor="followUpNotes">
                <Textarea
                  id="followUpNotes"
                  name="followUpNotes"
                  rows={3}
                  value={followUpNotes}
                  onChange={(event) => setFollowUpNotes(event.target.value)}
                  className="min-h-24 rounded-xl bg-input/30"
                />
                <ChipRow chips={FOLLOW_UP_CHIPS} onSelect={(chip) => appendChip('followUpNotes', chip)} />
              </Field>

              <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  This saves a real Supabase-backed incident for the current care home.
                </p>
                <SubmitButton />
              </div>
            </form>
          </section>
    </main>
  )
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-foreground">
        {label}
      </label>
      {children}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
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

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="h-11 rounded-xl px-5 text-sm font-semibold">
      {pending ? 'Saving incident...' : 'Save incident'}
    </Button>
  )
}

function ErrorBanner({ message, className }: { message: string; className?: string }) {
  return (
    <p
      role="alert"
      className={['rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200', className]
        .filter(Boolean)
        .join(' ')}
    >
      {message}
    </p>
  )
}

function appendLine(current: string, nextLine: string) {
  const trimmedCurrent = current.trim()
  return trimmedCurrent ? `${trimmedCurrent}\n${nextLine}` : nextLine
}

function buildInitialOccurredAt() {
  const now = new Date()
  const offsetMs = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16)
}



