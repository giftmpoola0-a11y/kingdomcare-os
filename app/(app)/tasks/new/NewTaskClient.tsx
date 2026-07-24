'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { ArrowLeft, ClipboardList, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { TASK_CATEGORIES } from '@/app/lib/taskTypes'
import type { ResidentRecord } from '@/app/lib/supabase/residents'
import { createTaskFromFormAction } from './actions'
import { GENERAL_TASK_RESIDENT_VALUE, INITIAL_TASK_CREATE_STATE } from './form-state'

const SELECT_TRIGGER_CLASSES = 'h-11 w-full rounded-xl bg-input/30'

const PRIORITY_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
] as const

interface NewTaskClientProps {
  activeResidents: ResidentRecord[]
  loadError: string | null
}

export default function NewTaskClient({
  activeResidents,
  loadError,
}: NewTaskClientProps) {
  const [state, formAction] = useActionState(createTaskFromFormAction, INITIAL_TASK_CREATE_STATE)

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 md:px-6 lg:py-8">
      <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-500/12 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-amber-200 ring-1 ring-amber-400/20">
              <span className="inline-flex size-2 rounded-full bg-amber-400" aria-hidden="true" />
              Task creation
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              New Task
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Create a real Supabase-backed task for this care home and send it straight back to the
              live task board.
            </p>
          </div>

          <Button asChild variant="outline" className="h-11 rounded-xl px-4 text-sm font-semibold">
            <Link href="/tasks">
              <ArrowLeft className="size-4" />
              Back to Tasks
            </Link>
          </Button>
        </div>
      </section>

      {loadError ? <ErrorBanner message={loadError} className="mt-4" /> : null}
      {state.error ? <ErrorBanner message={state.error} className="mt-4" /> : null}

      <section className="mt-6 rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/25">
            <ClipboardList className="size-5" />
          </span>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Task details</h2>
            <p className="text-sm text-muted-foreground">
              Admins and nurses can create general house tasks or resident-linked tasks here.
            </p>
          </div>
        </div>

        {activeResidents.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-background/60 p-4 text-sm text-muted-foreground">
            No active residents were found. You can still save a general care-home task without
            selecting a resident.
          </div>
        ) : null}

        <form action={formAction} className="mt-6 space-y-5">
          <TaskCreateFields activeResidents={activeResidents} fieldErrors={state.fieldErrors} />
        </form>
      </section>
    </main>
  )
}

function TaskCreateFields({
  activeResidents,
  fieldErrors,
}: {
  activeResidents: ResidentRecord[]
  fieldErrors: Record<string, string | undefined>
}) {
  const { pending } = useFormStatus()

  return (
    <fieldset disabled={pending} className="space-y-5 disabled:pointer-events-none disabled:opacity-70">
      <Field label="Task title" htmlFor="title" error={fieldErrors.title}>
        <Input
          id="title"
          name="title"
          type="text"
          placeholder="e.g. Prepare breakfast meds tray"
          className="h-11 rounded-xl bg-input/30"
        />
      </Field>

      <Field label="Description" htmlFor="description">
        <Textarea
          id="description"
          name="description"
          rows={4}
          placeholder="Add any context the next staff member should see."
          className="min-h-28 rounded-xl bg-input/30"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" htmlFor="category" error={fieldErrors.category}>
          <Select name="category" defaultValue="">
            <SelectTrigger id="category" className={SELECT_TRIGGER_CLASSES}>
              <SelectValue placeholder="Select category..." />
            </SelectTrigger>
            <SelectContent>
              {TASK_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Priority" htmlFor="priority" error={fieldErrors.priority}>
          <Select name="priority" defaultValue="normal">
            <SelectTrigger id="priority" className={SELECT_TRIGGER_CLASSES}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Due date" htmlFor="dueDate" error={fieldErrors.dueAt}>
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            className="h-11 rounded-xl bg-input/30"
          />
        </Field>

        <Field label="Due time" htmlFor="dueTime">
          <Input
            id="dueTime"
            name="dueTime"
            type="time"
            className="h-11 rounded-xl bg-input/30"
          />
        </Field>
      </div>

      <Field label="Resident link" htmlFor="residentId" error={fieldErrors.residentId}>
        <Select name="residentId" defaultValue={GENERAL_TASK_RESIDENT_VALUE}>
          <SelectTrigger id="residentId" className={SELECT_TRIGGER_CLASSES}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={GENERAL_TASK_RESIDENT_VALUE}>
              General house task / no resident selected
            </SelectItem>
            {activeResidents.map((resident) => (
              <SelectItem key={resident.id} value={resident.id}>
                {resident.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            This creates a real task for the current care home and updates the task views after redirect.
          </p>
          <TaskCreatePendingNotice />
        </div>
        <SubmitButton />
      </div>
    </fieldset>
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

function TaskCreatePendingNotice() {
  const { pending } = useFormStatus()

  if (!pending) {
    return null
  }

  return (
    <p aria-live="polite" className="inline-flex items-center gap-2 text-sm text-amber-200">
      <LoaderCircle className="size-4 animate-spin" />
      Creating task and opening the live board...
    </p>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="h-11 rounded-xl px-5 text-sm font-semibold">
      {pending ? 'Creating task...' : 'Save task'}
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
