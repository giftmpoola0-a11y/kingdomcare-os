'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import QuickNoteChips from '@/app/components/QuickNoteChips'
import PageShell from '@/app/components/ui/PageShell'
import SectionCard from '@/app/components/ui/SectionCard'
import type { ResidentRecord } from '@/app/lib/supabase/residents'
import {
  archiveResidentAction,
  createResidentAction,
  deleteResidentAction,
  restoreResidentAction,
  updateResidentAction,
} from './actions'

const CARE_LEVEL_SUGGESTIONS = [
  'Independent with reminders',
  'Low support',
  'Moderate support',
  'High support',
  '1:1 support',
  'Supervision required',
  'Total care',
  'Behavioral support',
  'Medical monitoring',
  'Mobility assistance',
]

const SUPPORT_NEED_SUGGESTIONS = [
  'Daily living prompts',
  'Hygiene support',
  'Toileting support',
  'Meal support',
  'Medication reminders',
  'Mood monitoring',
  'Behavior monitoring',
  'Redirection support',
  'De-escalation support',
  'Mobility assistance',
  'Fall risk monitoring',
  'Communication support',
  'Routine support',
  'Community outing support',
  'Sleep monitoring',
  'Family communication support',
]

const INPUT_CLASS =
  'w-full rounded-xl border border-border bg-background/60 px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

const TEXTAREA_CLASS =
  'w-full rounded-xl border border-border bg-background/60 px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none'

const AVATAR_COLORS = [
  'bg-primary/15 text-primary',
  'bg-success/15 text-success',
  'bg-warning/20 text-warning-foreground',
  'bg-destructive/15 text-destructive',
  'bg-accent text-accent-foreground',
  'bg-secondary text-secondary-foreground',
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

function avatarColor(id: string) {
  const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

export interface ResidentsClientProps {
  initialResidents: ResidentRecord[]
  isAdmin: boolean
  loadError: string | null
}

export default function ResidentsClient({
  initialResidents,
  isAdmin,
  loadError,
}: ResidentsClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [showForm, setShowForm] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [editingResidentId, setEditingResidentId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [actionError, setActionError] = useState('')
  const [form, setForm] = useState({
    name: '',
    age: '',
    careLevel: '',
    primarySupportNeeds: '',
    notes: '',
  })

  const visibleResidents = initialResidents.filter(
    (resident) => showArchived || resident.status !== 'archived'
  )

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (formError) setFormError('')
  }

  function handleCareLevelSelect(chip: string) {
    setForm((prev) => ({ ...prev, careLevel: chip }))
  }

  function handleSupportNeedSelect(chip: string) {
    setForm((prev) => {
      const existing = prev.primarySupportNeeds.trim()
      return { ...prev, primarySupportNeeds: existing ? `${existing}\n${chip}` : chip }
    })
  }

  function resetForm() {
    setForm({ name: '', age: '', careLevel: '', primarySupportNeeds: '', notes: '' })
    setEditingResidentId(null)
    setShowForm(false)
    setFormError('')
    setActionError('')
  }

  function handleEditResident(resident: ResidentRecord) {
    setForm({
      name: resident.name,
      age: String(resident.age),
      careLevel: resident.careLevel,
      primarySupportNeeds: resident.primarySupportNeeds.join('\n'),
      notes: resident.notes,
    })
    setEditingResidentId(resident.id)
    setShowForm(true)
    setFormError('')
    setActionError('')
  }

  function handleSaveResident() {
    const name = form.name.trim()
    const age = Number(form.age)
    const careLevel = form.careLevel.trim()
    const primarySupportNeeds = form.primarySupportNeeds
      .split('\n')
      .flatMap((line) => line.split(','))
      .map((need) => need.trim())
      .filter(Boolean)
    const notes = form.notes.trim()

    if (!name) {
      setFormError('Name is required.')
      return
    }
    if (!Number.isFinite(age) || age <= 0) {
      setFormError('A valid age is required.')
      return
    }
    if (!careLevel) {
      setFormError('Care level is required.')
      return
    }
    if (primarySupportNeeds.length === 0) {
      setFormError('At least one support need is required.')
      return
    }
    if (!notes) {
      setFormError('Notes are required.')
      return
    }

    setActionError('')

    startTransition(async () => {
      const result = editingResidentId
        ? await updateResidentAction({
            id: editingResidentId,
            name,
            age,
            careLevel,
            primarySupportNeeds,
            notes,
          })
        : await createResidentAction({ name, age, careLevel, primarySupportNeeds, notes })

      if (!result.success) {
        setActionError(result.error)
        return
      }

      resetForm()
      router.refresh()
    })
  }

  function handleDeleteResident(id: string) {
    if (!window.confirm('Delete this resident? This cannot be undone.')) return

    setActionError('')
    startTransition(async () => {
      const result = await deleteResidentAction(id)
      if (!result.success) {
        setActionError(result.error)
        return
      }
      router.refresh()
    })
  }

  function handleArchiveResident(id: string) {
    if (!window.confirm('Archive this resident? Historical records will remain available.')) return

    setActionError('')
    startTransition(async () => {
      const result = await archiveResidentAction(id)
      if (!result.success) {
        setActionError(result.error)
        return
      }
      router.refresh()
    })
  }

  function handleRestoreResident(id: string) {
    setActionError('')
    startTransition(async () => {
      const result = await restoreResidentAction(id)
      if (!result.success) {
        setActionError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <PageShell>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:py-8">
        <div className="anim-slide-down flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
              Residents
            </p>
            <h1 className="font-heading text-3xl font-semibold text-foreground md:text-4xl">
              Resident Profiles
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              View, update, archive, and manage resident profiles for your current care home.
            </p>
          </div>
          {isAdmin && (
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => (showForm ? resetForm() : setShowForm(true))}
                className={
                  showForm
                    ? 'inline-flex items-center justify-center rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent'
                    : 'inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90'
                }
              >
                {showForm ? 'Cancel' : '+ Add Resident'}
              </button>
            </div>
          )}
        </div>

        {(loadError || actionError) && (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
          >
            {loadError ?? actionError}
          </p>
        )}

        <div className="mt-4 flex items-center justify-end">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
            />
            <span className="font-medium">Show archived</span>
          </label>
        </div>

        {showForm && isAdmin && (
          <SectionCard className="mt-4 rounded-2xl border-border bg-card p-6 shadow-sm backdrop-blur-none">
            <h2 className="mb-6 font-heading text-2xl font-semibold text-foreground">
              {editingResidentId ? 'Edit Resident' : 'New Resident'}
            </h2>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="residentName" className="block text-sm font-semibold text-foreground">
                  Full Name
                </label>
                <input
                  id="residentName"
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. Jane Smith"
                  className={INPUT_CLASS}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="residentAge" className="block text-sm font-semibold text-foreground">
                    Age
                  </label>
                  <input
                    id="residentAge"
                    type="number"
                    min="1"
                    value={form.age}
                    onChange={(e) => handleChange('age', e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="residentCareLevel"
                    className="block text-sm font-semibold text-foreground"
                  >
                    Care Level
                  </label>
                  <input
                    id="residentCareLevel"
                    type="text"
                    value={form.careLevel}
                    onChange={(e) => handleChange('careLevel', e.target.value)}
                    className={INPUT_CLASS}
                  />
                  <QuickNoteChips
                    title="Quick care levels"
                    suggestions={CARE_LEVEL_SUGGESTIONS}
                    onSelect={handleCareLevelSelect}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="residentSupportNeeds"
                  className="block text-sm font-semibold text-foreground"
                >
                  Primary Support Needs
                </label>
                <textarea
                  id="residentSupportNeeds"
                  rows={3}
                  value={form.primarySupportNeeds}
                  onChange={(e) => handleChange('primarySupportNeeds', e.target.value)}
                  placeholder="One per line or separated by commas"
                  className={TEXTAREA_CLASS}
                />
                <QuickNoteChips
                  title="Quick support needs"
                  suggestions={SUPPORT_NEED_SUGGESTIONS}
                  onSelect={handleSupportNeedSelect}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="residentNotes" className="block text-sm font-semibold text-foreground">
                  Notes
                </label>
                <textarea
                  id="residentNotes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  className={TEXTAREA_CLASS}
                />
              </div>

              {formError && (
                <p
                  role="alert"
                  className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
                >
                  {formError}
                </p>
              )}

              <div className="flex items-center gap-3 border-t border-border pt-5">
                <button
                  type="button"
                  onClick={handleSaveResident}
                  disabled={isPending}
                  className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending
                    ? editingResidentId
                      ? 'Updating...'
                      : 'Saving...'
                    : editingResidentId
                      ? 'Update Resident'
                      : 'Save Resident'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isPending}
                  className="rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          </SectionCard>
        )}

        {visibleResidents.length === 0 ? (
          initialResidents.length === 0 ? (
            <SectionCard className="mt-4 rounded-2xl border-dashed border-border bg-card p-8 text-center shadow-sm backdrop-blur-none">
              <div className="mx-auto max-w-sm space-y-5">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-border bg-background/60 text-2xl font-light text-muted-foreground">
                  +
                </div>
                <div className="space-y-2">
                  <h2 className="font-heading text-2xl font-semibold text-foreground">
                    No residents yet
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Create a prototype resident to start shift reports, incidents, and medication
                    reminders.
                  </p>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                  >
                    + Add Resident
                  </button>
                )}
              </div>
            </SectionCard>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-border bg-card p-8 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background/60">
                <span className="text-xl leading-none text-muted-foreground" aria-hidden="true">
                  -
                </span>
              </div>
              <p className="mt-4 text-sm font-medium text-muted-foreground">
                No residents match the current view.
              </p>
            </div>
          )
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleResidents.map((resident) => {
              const isArchived = resident.status === 'archived'
              const avatarClr = avatarColor(resident.id)

              // Linked records check is transitional: reports/incidents/medications still use
              // localStorage and cannot find Supabase resident IDs until those modules migrate.
              // Until then, unarchived residents always show Delete (soft-delete) for admins.
              const hasLinkedRecords = false

              return (
                <SectionCard
                  key={resident.id}
                  as="article"
                  className={`rounded-2xl border-border bg-card p-5 shadow-sm backdrop-blur-none ${isArchived ? 'opacity-75' : ''}`}
                >
                  <div className="flex flex-1 gap-4 rounded-xl border border-border bg-background/60 p-3.5 transition-colors hover:bg-accent/40">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${avatarClr}`}
                    >
                      {getInitials(resident.name)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-heading text-xl font-semibold text-foreground">
                          {resident.name}
                        </h2>
                        {isArchived && (
                          <span className="rounded-full bg-warning/20 px-2.5 py-1 text-[10px] font-semibold text-warning-foreground">
                            Archived
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">Age {resident.age}</p>

                      <div className="mt-2">
                        <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary">
                          {resident.careLevel}
                        </span>
                      </div>

                      {resident.primarySupportNeeds.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {resident.primarySupportNeeds.slice(0, 4).map((need) => (
                            <span
                              key={need}
                              className="rounded-full bg-secondary px-2.5 py-1 text-[10px] text-secondary-foreground"
                            >
                              {need}
                            </span>
                          ))}
                          {resident.primarySupportNeeds.length > 4 && (
                            <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] text-muted-foreground">
                              +{resident.primarySupportNeeds.length - 4} more
                            </span>
                          )}
                        </div>
                      )}

                      {resident.notes && (
                        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                          {resident.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Link
                      href={`/residents/${resident.id}`}
                      className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                    >
                      View Profile
                    </Link>

                    {isAdmin && !isArchived && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleEditResident(resident)}
                        className="rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent disabled:opacity-60"
                      >
                        Edit
                      </button>
                    )}

                    {isAdmin && !isArchived && !hasLinkedRecords && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleDeleteResident(resident.id)}
                        className="rounded-xl bg-destructive/15 px-4 py-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-60"
                      >
                        Delete
                      </button>
                    )}

                    {isAdmin && !isArchived && hasLinkedRecords && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleArchiveResident(resident.id)}
                        className="rounded-xl bg-warning/20 px-4 py-2.5 text-xs font-semibold text-warning-foreground transition-colors hover:bg-warning/30 disabled:opacity-60"
                      >
                        Archive
                      </button>
                    )}

                    {isAdmin && isArchived && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleRestoreResident(resident.id)}
                        className="rounded-xl bg-success/15 px-4 py-2.5 text-xs font-semibold text-success transition-colors hover:bg-success/25 disabled:opacity-60"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </SectionCard>
              )
            })}
          </div>
        )}
      </main>
    </PageShell>
  )
}
