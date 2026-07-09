'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { Building2, Eye, ImagePlus, Pencil, RotateCcw, Trash2, Users, UserPlus, X } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { dashboardFont } from '@/app/lib/dashboard-font'
import { ResidentQuickChips } from '@/components/kingdomos-v0/residents/resident-quick-chips'
import { cn } from '@/lib/utils'
import type { ResidentRecord, ResidentSex } from '@/app/lib/supabase/residents'
import {
  archiveResidentAction,
  createResidentAction,
  deleteResidentAction,
  removeResidentPhotoAction,
  restoreResidentAction,
  updateResidentAction,
  uploadResidentPhotoAction,
} from './actions'

const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTO_BYTES = 5 * 1024 * 1024

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

const SEX_OPTIONS: { value: ResidentSex; label: string }[] = [
  { value: 'unknown', label: 'Unknown' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
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

function formatResidentSex(sex: ResidentSex): string {
  return SEX_OPTIONS.find((option) => option.value === sex)?.label ?? 'Unknown'
}

function ResidentPhotoField({ resident }: { resident: ResidentRecord }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setError('Photo must be a JPG, PNG, or WebP image.')
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError('Photo must be smaller than 5MB.')
      return
    }

    setError('')
    const formData = new FormData()
    formData.append('photo', file)

    startTransition(async () => {
      const result = await uploadResidentPhotoAction(resident.id, formData)
      if (!result.success) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  function handleRemove() {
    if (!window.confirm("Remove this resident's photo?")) return

    setError('')
    startTransition(async () => {
      const result = await removeResidentPhotoAction(resident.id)
      if (!result.success) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-1.5">
      <p className="block text-sm font-semibold text-foreground">Resident Photo</p>
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'relative h-16 w-16 shrink-0 overflow-hidden rounded-xl',
            !resident.photoUrl && `flex items-center justify-center text-sm font-semibold ${avatarColor(resident.id)}`,
          )}
        >
          {resident.photoUrl ? (
            <Image src={resident.photoUrl} alt="" fill sizes="64px" className="object-cover" />
          ) : (
            getInitials(resident.name)
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileSelected}
          />
          <button
            type="button"
            disabled={isPending}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent disabled:opacity-60"
          >
            <ImagePlus className="size-3.5" />
            {resident.photoUrl ? 'Replace Photo' : 'Upload Photo'}
          </button>
          {resident.photoUrl && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleRemove}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-300 ring-1 ring-rose-400/35 transition-colors hover:bg-rose-500/20 disabled:opacity-60"
            >
              <Trash2 className="size-3.5" />
              Remove
            </button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-rose-300">
          {error}
        </p>
      )}
    </div>
  )
}

function NewResidentPhotoField({
  previewUrl,
  error,
  disabled,
  onFileSelected,
  onClear,
}: {
  previewUrl: string | null
  error: string
  disabled: boolean
  onFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClear: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-1.5">
      <p className="block text-sm font-semibold text-foreground">Resident Photo</p>
      <div className="flex items-center gap-4">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-muted-foreground ring-1 ring-border/80">
          {previewUrl ? (
            <Image src={previewUrl} alt="" fill sizes="64px" className="object-cover" />
          ) : (
            <ImagePlus className="size-5" />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onFileSelected}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent disabled:opacity-60"
          >
            <ImagePlus className="size-3.5" />
            {previewUrl ? 'Change Photo' : 'Select Photo'}
          </button>
          {previewUrl && (
            <button
              type="button"
              disabled={disabled}
              onClick={onClear}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-300 ring-1 ring-rose-400/35 transition-colors hover:bg-rose-500/20 disabled:opacity-60"
            >
              <X className="size-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Optional. JPG, PNG, or WebP up to 5MB. Uploaded once the resident is saved.
      </p>
      {error && (
        <p role="alert" className="text-xs font-medium text-rose-300">
          {error}
        </p>
      )}
    </div>
  )
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
  const [, startRefreshTransition] = useTransition()
  const [residents, setResidents] = useState(initialResidents)
  const [isDeletePending, setIsDeletePending] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [editingResidentId, setEditingResidentId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [actionError, setActionError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ResidentRecord | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [form, setForm] = useState({
    name: '',
    age: '',
    careLevel: '',
    primarySupportNeeds: '',
    notes: '',
    sex: 'unknown' as ResidentSex,
  })
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null)
  const [pendingPhotoPreviewUrl, setPendingPhotoPreviewUrl] = useState<string | null>(null)
  const [pendingPhotoError, setPendingPhotoError] = useState('')
  const [photoWarning, setPhotoWarning] = useState('')
  const pendingPhotoPreviewUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (pendingPhotoPreviewUrlRef.current) {
        URL.revokeObjectURL(pendingPhotoPreviewUrlRef.current)
      }
    }
  }, [])

  const visibleResidents = residents.filter(
    (resident) => showArchived || resident.status !== 'archived'
  )
  const editingResident = editingResidentId
    ? (residents.find((resident) => resident.id === editingResidentId) ?? null)
    : null
  const activeResidentsCount = residents.filter((resident) => resident.status !== 'archived').length
  const archivedResidentsCount = residents.length - activeResidentsCount
  function handleChange(field: Exclude<keyof typeof form, 'sex'>, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (formError) setFormError('')
  }

  function handleSexChange(value: ResidentSex) {
    setForm((prev) => ({ ...prev, sex: value }))
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

  function clearPendingPhotoSelection() {
    if (pendingPhotoPreviewUrlRef.current) {
      URL.revokeObjectURL(pendingPhotoPreviewUrlRef.current)
      pendingPhotoPreviewUrlRef.current = null
    }
    setPendingPhotoFile(null)
    setPendingPhotoPreviewUrl(null)
    setPendingPhotoError('')
  }

  function resetForm() {
    setForm({ name: '', age: '', careLevel: '', primarySupportNeeds: '', notes: '', sex: 'unknown' })
    setEditingResidentId(null)
    setShowForm(false)
    setFormError('')
    setActionError('')
    clearPendingPhotoSelection()
  }

  function handlePendingPhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setPendingPhotoError('Photo must be a JPG, JPEG, PNG, or WebP image.')
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPendingPhotoError('Photo must be smaller than 5MB.')
      return
    }

    if (pendingPhotoPreviewUrlRef.current) {
      URL.revokeObjectURL(pendingPhotoPreviewUrlRef.current)
    }
    const objectUrl = URL.createObjectURL(file)
    pendingPhotoPreviewUrlRef.current = objectUrl

    setPendingPhotoError('')
    setPendingPhotoFile(file)
    setPendingPhotoPreviewUrl(objectUrl)
  }

  function handleClearPendingPhoto() {
    clearPendingPhotoSelection()
  }

  function handleOpenNewResidentForm() {
    setPhotoWarning('')
    setShowForm(true)
  }

  function handleEditResident(resident: ResidentRecord) {
    setForm({
      name: resident.name,
      age: String(resident.age),
      careLevel: resident.careLevel,
      primarySupportNeeds: resident.primarySupportNeeds.join('\n'),
      notes: resident.notes,
      sex: resident.sex,
    })
    setEditingResidentId(resident.id)
    setShowForm(true)
    setFormError('')
    setActionError('')
    setPhotoWarning('')
    clearPendingPhotoSelection()
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
    setPhotoWarning('')

    startTransition(async () => {
      if (editingResidentId) {
        const result = await updateResidentAction({
          id: editingResidentId,
          name,
          age,
          careLevel,
          primarySupportNeeds,
          notes,
          sex: form.sex,
        })

        if (!result.success) {
          setActionError(result.error)
          return
        }

        resetForm()
        router.refresh()
        return
      }

      const createResult = await createResidentAction({ name, age, careLevel, primarySupportNeeds, notes, sex: form.sex })

      if (!createResult.success) {
        setActionError(createResult.error)
        return
      }

      if (pendingPhotoFile) {
        const photoFormData = new FormData()
        photoFormData.append('photo', pendingPhotoFile)
        const photoResult = await uploadResidentPhotoAction(createResult.resident.id, photoFormData)

        if (!photoResult.success) {
          resetForm()
          router.refresh()
          setPhotoWarning(
            `${createResult.resident.name} was created, but the photo upload failed: ${photoResult.error}. You can add a photo from the resident's Edit form.`
          )
          return
        }
      }

      resetForm()
      router.refresh()
    })
  }

  function handleRequestDelete(resident: ResidentRecord) {
    setDeleteError('')
    setDeleteTarget(resident)
  }

  async function handleConfirmDelete() {
    if (!deleteTarget || isDeletePending) return

    const targetId = deleteTarget.id

    setDeleteError('')
    setIsDeletePending(true)

    const result = await deleteResidentAction(targetId)
    if (!result.success) {
      setDeleteError(result.error)
      setIsDeletePending(false)
      return
    }

    setResidents((current) => current.filter((resident) => resident.id !== targetId))
    setDeleteTarget(null)
    setIsDeletePending(false)

    startRefreshTransition(() => {
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
                    onClick={() => (showForm ? resetForm() : handleOpenNewResidentForm())}
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

          {photoWarning && (
            <p
              role="alert"
              className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-200"
            >
              {photoWarning}
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
                {editingResident ? (
                  <ResidentPhotoField resident={editingResident} />
                ) : (
                  <NewResidentPhotoField
                    previewUrl={pendingPhotoPreviewUrl}
                    error={pendingPhotoError}
                    disabled={isPending}
                    onFileSelected={handlePendingPhotoSelected}
                    onClear={handleClearPendingPhoto}
                  />
                )}

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

                <div className="grid gap-5 sm:grid-cols-3">
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
                    <label htmlFor="residentSex" className="block text-sm font-semibold text-foreground">
                      Sex
                    </label>
                    <select
                      id="residentSex"
                      value={form.sex}
                      onChange={(e) => handleSexChange(e.target.value as ResidentSex)}
                      className={INPUT_CLASS}
                    >
                      {SEX_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
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
                      onClick={handleOpenNewResidentForm}
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
                      <div
                        className={cn(
                          'relative h-12 w-12 shrink-0 overflow-hidden rounded-xl',
                          !resident.photoUrl && `flex items-center justify-center text-sm font-semibold ${avatarClr}`,
                        )}
                      >
                        {resident.photoUrl ? (
                          <Image src={resident.photoUrl} alt="" fill sizes="48px" className="object-cover" />
                        ) : (
                          getInitials(resident.name)
                        )}
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
                        <p className="mt-1 text-sm text-muted-foreground">
                          Age {resident.age} &middot; {formatResidentSex(resident.sex)}
                        </p>

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
                          disabled={isPending || isDeletePending}
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
                          disabled={isPending || isDeletePending}
                          onClick={() => handleRequestDelete(resident)}
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

          <AlertDialog
            open={Boolean(deleteTarget)}
            onOpenChange={(open) => {
              if (open || isDeletePending) return
              setDeleteTarget(null)
              setDeleteError('')
            }}
          >
            <AlertDialogContent
              className={`${dashboardFont.variable} v0-dashboard-theme dark max-w-lg gap-0 overflow-hidden border-white/10 bg-card/95 p-0 font-sans shadow-[0_28px_90px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.05)]`}
            >
              <AlertDialogHeader className="gap-3 p-6 pb-5 sm:p-7 sm:pb-5">
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-rose-500/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-200 ring-1 ring-rose-400/25">
                  <Trash2 className="size-3.5" />
                  Delete resident
                </div>
                <AlertDialogTitle className="text-2xl tracking-tight text-foreground">Delete resident?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                  <span className="block">
                    This removes the resident from active views while keeping historical records available for audit continuity.
                  </span>
                  <span className="block rounded-2xl border border-white/10 bg-background/55 px-4 py-3 text-base font-semibold text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                    {deleteTarget?.name}
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="border-t border-white/10 bg-background/35 px-6 py-5 sm:px-7">
                {deleteError && (
                  <p
                    role="alert"
                    className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200"
                  >
                    {deleteError}
                  </p>
                )}

                <AlertDialogFooter className={cn(deleteError && "mt-4")}>
                  <AlertDialogCancel
                    disabled={isDeletePending}
                    className="rounded-xl border border-white/10 bg-background/75 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent/80 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isDeletePending}
                    onClick={(event) => {
                      event.preventDefault()
                      void handleConfirmDelete()
                    }}
                    className="rounded-xl border border-rose-400/30 bg-rose-500/18 px-5 py-2.5 text-sm font-semibold text-rose-100 shadow-[0_12px_28px_rgba(244,63,94,0.18)] transition-colors hover:bg-rose-500/28 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeletePending ? 'Deleting...' : 'Delete resident'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </div>
            </AlertDialogContent>
          </AlertDialog>
    </main>
  )
}







