'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Building2, Eye, Pencil, RotateCcw, Trash2, Users, UserPlus } from 'lucide-react'
import { AppSidebar } from '@/components/kingdomos-v0/app-sidebar'
import { AppTopbar } from '@/components/kingdomos-v0/app-topbar'
import { ResidentQuickChips } from '@/components/kingdomos-v0/residents/resident-quick-chips'
import { cn } from '@/lib/utils'
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
  'w-full rounded-xl border border-border bg-background/70 px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/15'

const TEXTAREA_CLASS =
  'w-full rounded-xl border border-border bg-background/70 px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/15 resize-none'

const AVATAR_COLORS = [
  'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25',
  'bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/25',
  'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/25',
  'bg-secondary text-secondary-foreground ring-1 ring-border/80',
  'bg-accent text-accent-foreground ring-1 ring-border/80',
  'bg-muted text-muted-foreground ring-1 ring-border/80',
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
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
  const activeResidentsCount = initialResidents.filter((resident) => resident.status !== 'archived').length
  const archivedResidentsCount = initialResidents.length - activeResidentsCount

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
    <div className="flex min-h-screen bg-background">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar onMenu={() => setSidebarOpen(true)} />

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 lg:py-8">
          <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/12 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200 ring-1 ring-emerald-400/20">
                  <span className="inline-flex size-2 rounded-full bg-emerald-400" aria-hidden="true" />
                  Residents Workspace
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  Resident Profiles
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  View, update, archive, and manage resident profiles for your current care home.
                  Existing Supabase-backed residents data and actions remain unchanged.
                </p>
              </div>

              {isAdmin && (
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => (showForm ? resetForm() : setShowForm(true))}
                    className={cn(
                      'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                      showForm
                        ? 'border border-border bg-card text-foreground hover:bg-accent'
                        : 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
                    )}
                  >
                    {showForm ? null : <UserPlus className="size-4" />}
                    {showForm ? 'Cancel' : 'Add Resident'}
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-background/60 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25">
                    <Users className="size-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Active</p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">{activeResidentsCount}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/25">
                    <Building2 className="size-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Archived</p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">{archivedResidentsCount}</p>
                  </div>
                </div>
              </div>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border bg-background/60 p-4 shadow-sm transition-colors hover:bg-accent/30">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">View</p>
                  <p className="mt-1 text-sm font-medium text-foreground">Show archived residents</p>
                </div>
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="h-4 w-4 rounded border-border bg-background text-emerald-400 focus:ring-emerald-400/25"
                />
              </label>
            </div>
          </section>

          {(loadError || actionError) && (
            <p
              role="alert"
              className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200"
            >
              {loadError ?? actionError}
            </p>
          )}

          {showForm && isAdmin && (
            <section className="mt-6 rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25">
                  <UserPlus className="size-5" />
                </span>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                    {editingResidentId ? 'Edit Resident' : 'New Resident'}
                  </h2>
                  <p className="text-sm text-muted-foreground">Resident details sync through the existing Supabase actions.</p>
                </div>
              </div>

              <div className="mt-6 space-y-5">
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
                    <label htmlFor="residentCareLevel" className="block text-sm font-semibold text-foreground">
                      Care Level
                    </label>
                    <input
                      id="residentCareLevel"
                      type="text"
                      value={form.careLevel}
                      onChange={(e) => handleChange('careLevel', e.target.value)}
                      className={INPUT_CLASS}
                    />
                    <ResidentQuickChips
                      title="Quick care levels"
                      suggestions={CARE_LEVEL_SUGGESTIONS}
                      onSelect={handleCareLevelSelect}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="residentSupportNeeds" className="block text-sm font-semibold text-foreground">
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
                  <ResidentQuickChips
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
                    className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200"
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
            </section>
          )}

          {visibleResidents.length === 0 ? (
            initialResidents.length === 0 ? (
              <section className="mt-6 rounded-3xl border border-dashed border-border bg-card/95 p-8 text-center shadow-sm">
                <div className="mx-auto max-w-sm space-y-5">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-border bg-background/60 text-emerald-300 ring-1 ring-emerald-400/20">
                    <UserPlus className="size-6" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">No residents yet</h2>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Add the first resident profile for this care home to start using the residents workspace.
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowForm(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                    >
                      <UserPlus className="size-4" />
                      Add Resident
                    </button>
                  )}
                </div>
              </section>
            ) : (
              <div className="mt-6 rounded-3xl border border-dashed border-border bg-card/95 p-8 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background/60 text-muted-foreground">
                  <Eye className="size-5" />
                </div>
                <p className="mt-4 text-sm font-medium text-muted-foreground">
                  No residents match the current view.
                </p>
              </div>
            )
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleResidents.map((resident) => {
                const isArchived = resident.status === 'archived'
                const avatarClr = avatarColor(resident.id)
                const hasLinkedRecords = false

                return (
                  <article
                    key={resident.id}
                    className={cn(
                      'rounded-3xl border border-border bg-card/95 p-5 shadow-sm transition-colors hover:bg-card',
                      isArchived && 'opacity-80',
                    )}
                  >
                    <div className="flex gap-4 rounded-2xl border border-border bg-background/60 p-4 transition-colors hover:bg-accent/30">
                      <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-semibold', avatarClr)}>
                        {getInitials(resident.name)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-semibold text-foreground">{resident.name}</h2>
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1',
                              isArchived
                                ? 'bg-amber-500/15 text-amber-300 ring-amber-400/35'
                                : 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/35',
                            )}
                          >
                            {isArchived ? 'Archived' : 'Active'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">Age {resident.age}</p>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground ring-1 ring-border/80">
                            {resident.careLevel}
                          </span>
                        </div>

                        {resident.primarySupportNeeds.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {resident.primarySupportNeeds.slice(0, 4).map((need) => (
                              <span
                                key={need}
                                className="rounded-full bg-accent px-2.5 py-1 text-[10px] text-accent-foreground ring-1 ring-border/70"
                              >
                                {need}
                              </span>
                            ))}
                            {resident.primarySupportNeeds.length > 4 && (
                              <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] text-muted-foreground ring-1 ring-border/70">
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
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                      >
                        <Eye className="size-3.5" />
                        View Profile
                      </Link>

                      {isAdmin && !isArchived && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleEditResident(resident)}
                          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent disabled:opacity-60"
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </button>
                      )}

                      {isAdmin && !isArchived && !hasLinkedRecords && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleDeleteResident(resident.id)}
                          className="inline-flex items-center gap-2 rounded-xl bg-rose-500/15 px-4 py-2.5 text-xs font-semibold text-rose-300 ring-1 ring-rose-400/35 transition-colors hover:bg-rose-500/20 disabled:opacity-60"
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </button>
                      )}

                      {isAdmin && !isArchived && hasLinkedRecords && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleArchiveResident(resident.id)}
                          className="inline-flex items-center gap-2 rounded-xl bg-amber-500/15 px-4 py-2.5 text-xs font-semibold text-amber-300 ring-1 ring-amber-400/35 transition-colors hover:bg-amber-500/20 disabled:opacity-60"
                        >
                          Archive
                        </button>
                      )}

                      {isAdmin && isArchived && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleRestoreResident(resident.id)}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 px-4 py-2.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/35 transition-colors hover:bg-emerald-500/20 disabled:opacity-60"
                        >
                          <RotateCcw className="size-3.5" />
                          Restore
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
