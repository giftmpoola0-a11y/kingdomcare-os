'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { ArrowLeft, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { TASK_CATEGORIES } from '@/app/lib/taskTypes'
import type { ResidentRecord } from '@/app/lib/supabase/residents'
import { createTaskFromFormAction } from './actions'
import { INITIAL_TASK_CREATE_STATE } from './form-state'

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
              <Field label="Task title" htmlFor="title" error={state.fieldErrors.title}>
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
                <Field label="Category" htmlFor="category" error={state.fieldErrors.category}>
                  <select
                    id="category"
                    name="category"
                    defaultValue=""
                    className="flex h-11 w-full rounded-xl border border-input bg-input/30 px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="">Select category...</option>
                    {TASK_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Priority" htmlFor="priority" error={state.fieldErrors.priority}>
                  <select
                    id="priority"
                    name="priority"
                    defaultValue="normal"
                    className="flex h-11 w-full rounded-xl border border-input bg-input/30 px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Due date" htmlFor="dueDate" error={state.fieldErrors.dueAt}>
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

              <Field label="Resident link" htmlFor="residentId" error={state.fieldErrors.residentId}>
                <select
                  id="residentId"
                  name="residentId"
                  defaultValue=""
                  className="flex h-11 w-full rounded-xl border border-input bg-input/30 px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">General house task / no resident selected</option>
                  {activeResidents.map((resident) => (
                    <option key={resident.id} value={resident.id}>
                      {resident.name}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  This creates a real task for the current care home and revalidates the tasks and staff
                  workspaces.
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

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="h-11 rounded-xl px-5 text-sm font-semibold">
      {pending ? 'Saving task...' : 'Save task'}
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






