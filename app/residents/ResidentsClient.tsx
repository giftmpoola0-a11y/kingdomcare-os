'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import PageShell from '@/app/components/ui/PageShell'
import SectionCard from '@/app/components/ui/SectionCard'
import EmptyState from '@/app/components/ui/EmptyState'
import QuickNoteChips from '@/app/components/QuickNoteChips'
import type { ResidentRecord } from '@/app/lib/supabase/residents'
import {
  createResidentAction,
  updateResidentAction,
  archiveResidentAction,
  deleteResidentAction,
  restoreResidentAction,
} from './actions'

/* ── Quick-select chips ─────────────────────────────────────── */

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

/* ── Input class ────────────────────────────────────────────── */

const INPUT_CLASS =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

const TEXTAREA_CLASS =
  'w-full rounded-xl border border-slate-300 px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none'

/* ── Helpers ────────────────────────────────────────────────── */

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-sky-100 text-sky-700',
]

function avatarColor(id: string) {
  const sum = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

/* ── Props ──────────────────────────────────────────────────── */

export interface ResidentsClientProps {
  initialResidents: ResidentRecord[]
  isAdmin: boolean
  loadError: string | null
}

/* ── Component ──────────────────────────────────────────────── */

export default function ResidentsClient({
  initialResidents,
  isAdmin,
  loadError,
}: ResidentsClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [showForm, setShowForm]                     = useState(false)
  const [showArchived, setShowArchived]             = useState(false)
  const [editingResidentId, setEditingResidentId]   = useState<string | null>(null)
  const [formError, setFormError]                   = useState('')
  const [actionError, setActionError]               = useState('')
  const [form, setForm] = useState({
    name: '',
    age: '',
    careLevel: '',
    primarySupportNeeds: '',
    notes: '',
  })

  const visibleResidents = initialResidents.filter(
    (r) => showArchived || r.status !== 'archived'
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
    const name     = form.name.trim()
    const age      = Number(form.age)
    const careLevel = form.careLevel.trim()
    const primarySupportNeeds = form.primarySupportNeeds
      .split('\n')
      .flatMap((l) => l.split(','))
      .map((n) => n.trim())
      .filter(Boolean)
    const notes = form.notes.trim()

    if (!name)                                           { setFormError('Name is required.'); return }
    if (!Number.isFinite(age) || age <= 0)               { setFormError('A valid age is required.'); return }
    if (!careLevel)                                      { setFormError('Care level is required.'); return }
    if (primarySupportNeeds.length === 0)                { setFormError('At least one support need is required.'); return }
    if (!notes)                                          { setFormError('Notes are required.'); return }

    setActionError('')

    startTransition(async () => {
      const result = editingResidentId
        ? await updateResidentAction({ id: editingResidentId, name, age, careLevel, primarySupportNeeds, notes })
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
      if (!result.success) { setActionError(result.error); return }
      router.refresh()
    })
  }

  function handleArchiveResident(id: string) {
    if (!window.confirm('Archive this resident? Historical records will remain available.')) return

    setActionError('')
    startTransition(async () => {
      const result = await archiveResidentAction(id)
      if (!result.success) { setActionError(result.error); return }
      router.refresh()
    })
  }

  function handleRestoreResident(id: string) {
    setActionError('')
    startTransition(async () => {
      const result = await restoreResidentAction(id)
      if (!result.success) { setActionError(result.error); return }
      router.refresh()
    })
  }

  return (
    <PageShell>
      {/* Page header */}
      <div className="anim-slide-down border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-emerald-600">Residents</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Resident Profiles</h1>
            <p className="mt-1 text-sm text-slate-500">Prototype profiles for testing only.</p>
          </div>
          {isAdmin && (
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => (showForm ? resetForm() : setShowForm(true))}
                className={
                  showForm
                    ? 'inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50'
                    : 'inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 active:bg-emerald-800'
                }
              >
                {showForm ? 'Cancel' : '+ Add Resident'}
              </button>
            </div>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6">

        {/* Load / action errors */}
        {(loadError || actionError) && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {loadError ?? actionError}
          </p>
        )}

        {/* Show archived toggle */}
        <div className="flex items-center justify-end">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
            />
            <span className="font-medium">Show archived</span>
          </label>
        </div>

        {/* ── Add / Edit form ─────────────────────────────── */}
        {showForm && isAdmin && (
          <SectionCard className="p-6 sm:p-8">
            <h2 className="mb-6 text-lg font-bold text-slate-900">
              {editingResidentId ? 'Edit Resident' : 'New Resident'}
            </h2>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="residentName" className="block text-sm font-semibold text-slate-700">
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
                  <label htmlFor="residentAge" className="block text-sm font-semibold text-slate-700">
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
                  <label htmlFor="residentCareLevel" className="block text-sm font-semibold text-slate-700">
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
                <label htmlFor="residentSupportNeeds" className="block text-sm font-semibold text-slate-700">
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
                <label htmlFor="residentNotes" className="block text-sm font-semibold text-slate-700">
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
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {formError}
                </p>
              )}

              <div className="flex items-center gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={handleSaveResident}
                  disabled={isPending}
                  className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition-all duration-150 hover:bg-emerald-700 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending
                    ? (editingResidentId ? 'Updating...' : 'Saving...')
                    : (editingResidentId ? 'Update Resident' : 'Save Resident')}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isPending}
                  className="text-sm font-semibold text-slate-500 transition-colors hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </SectionCard>
        )}

        {/* ── Resident list ────────────────────────────────── */}
        {visibleResidents.length === 0 ? (
          initialResidents.length === 0 ? (
            <SectionCard className="p-10 text-center">
              <div className="mx-auto max-w-sm space-y-5">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-2xl font-light text-slate-400">
                  +
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-slate-900">No residents yet</h2>
                  <p className="text-sm leading-relaxed text-slate-500">
                    Create a prototype resident to start shift reports, incidents, and medication reminders.
                  </p>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
                  >
                    + Add Resident
                  </button>
                )}
              </div>
            </SectionCard>
          ) : (
            <EmptyState message="No residents match the current view." />
          )
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {visibleResidents.map((resident) => {
              const isArchived = resident.status === 'archived'
              const avatarClr  = avatarColor(resident.id)

              // Linked records check is transitional: reports/incidents/medications still use
              // localStorage and cannot find Supabase resident IDs until those modules migrate.
              // Until then, unarchived residents always show Delete (soft-delete) for admins.
              const hasLinkedRecords = false

              return (
                <SectionCard
                  key={resident.id}
                  as="article"
                  className={`flex flex-col overflow-hidden transition-all duration-200 hover:shadow-md ${isArchived ? 'opacity-75' : ''}`}
                >
                  {/* Card body */}
                  <div className="flex flex-1 gap-4 p-5 sm:p-6">
                    {/* Avatar */}
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${avatarClr}`}>
                      {getInitials(resident.name)}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">{resident.name}</h2>
                        {isArchived && (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            Archived
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">Age {resident.age}</p>

                      <div className="mt-2">
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                          {resident.careLevel}
                        </span>
                      </div>

                      {resident.primarySupportNeeds.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {resident.primarySupportNeeds.slice(0, 4).map((need) => (
                            <span
                              key={need}
                              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600"
                            >
                              {need}
                            </span>
                          ))}
                          {resident.primarySupportNeeds.length > 4 && (
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-400">
                              +{resident.primarySupportNeeds.length - 4} more
                            </span>
                          )}
                        </div>
                      )}

                      {resident.notes && (
                        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-500">
                          {resident.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action footer */}
                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3.5">
                    <Link
                      href={`/residents/${resident.id}`}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-700"
                    >
                      View Profile
                    </Link>

                    {isAdmin && !isArchived && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleEditResident(resident)}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
                      >
                        Edit
                      </button>
                    )}

                    {isAdmin && !isArchived && !hasLinkedRecords && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleDeleteResident(resident.id)}
                        className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-60"
                      >
                        Delete
                      </button>
                    )}

                    {isAdmin && !isArchived && hasLinkedRecords && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleArchiveResident(resident.id)}
                        className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-60"
                      >
                        Archive
                      </button>
                    )}

                    {isAdmin && isArchived && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleRestoreResident(resident.id)}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-60"
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
