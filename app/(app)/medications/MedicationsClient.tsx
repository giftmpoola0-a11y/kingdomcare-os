'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Pill,
  Trash2,
  PauseCircle,
  Ban,
  Play,
  ShieldAlert,
  ChevronDown,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { dashboardFont } from '@/app/lib/dashboard-font'
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
import {
  getMedicationAlertUrgency,
  getMedicationAlertUrgencyRank,
  MEDICATION_ALERT_URGENCY_BADGE_CLASSES,
  MEDICATION_ALERT_URGENCY_CARD_CLASSES,
  MEDICATION_ALERT_URGENCY_LABELS,
  type MedicationAlertUrgency,
} from '@/app/lib/medicationReminders'
import type {
  MedicationRecord,
  MedicationAlertRecord,
  MedicationAlertType,
  MedicationAlertSeverity,
} from '@/app/lib/supabase/medications'
import type { ResidentRecord } from '@/app/lib/supabase/residents'
import {
  createMedicationAction,
  resumeMedicationAction,
  pauseMedicationAction,
  discontinueMedicationAction,
  archiveMedicationAction,
  deleteMedicationAction,
  createMedicationAlertAction,
  resolveMedicationAlertAction,
  archiveMedicationAlertAction,
  deleteMedicationAlertAction,
} from './actions'


const ROUTES = ['Oral', 'Topical', 'Injection', 'Inhaled', 'Patch', 'Sublingual', 'Other']

const ALERT_TYPES: { value: MedicationAlertType; label: string }[] = [
  { value: 'missed_dose', label: 'Missed Dose' },
  { value: 'refill_needed', label: 'Refill Needed' },
  { value: 'review_required', label: 'Review Required' },
  { value: 'allergy_warning', label: 'Allergy Warning' },
  { value: 'interaction_warning', label: 'Interaction Warning' },
  { value: 'other', label: 'Other' },
]

const SEVERITIES: { value: MedicationAlertSeverity; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

const MED_FILTERS = ['Active', 'Paused', 'Discontinued', 'All'] as const
const ALERT_FILTERS = ['Open', 'Resolved', 'All'] as const

type MedFilter = (typeof MED_FILTERS)[number]
type AlertFilter = (typeof ALERT_FILTERS)[number]

const INPUT_CLASS =
  'w-full rounded-xl border border-border bg-background/70 px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/15'

const TEXTAREA_CLASS =
  'w-full rounded-xl border border-border bg-background/70 px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/15 resize-none'

interface PendingConfirmation {
  tone: 'rose' | 'neutral'
  badgeLabel: string
  title: string
  description: string
  itemLabel: string
  confirmLabel: string
  pendingLabel: string
  action: () => Promise<{ success: boolean; error?: string }>
}


export interface MedicationsClientProps {
  initialMedications: MedicationRecord[]
  initialAlerts: MedicationAlertRecord[]
  activeResidents: ResidentRecord[]
  canManage: boolean
  loadError: string | null
}


export default function MedicationsClient({
  initialMedications,
  initialAlerts,
  activeResidents,
  canManage,
  loadError,
}: MedicationsClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState('')
  const [medDetailsOpen, setMedDetailsOpen] = useState(false)
  const [alertComposerOpen, setAlertComposerOpen] = useState(false)
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null)

  // Medication list filter
  const [medFilter, setMedFilter] = useState<MedFilter>('Active')
  // Alert list filter
  const [alertFilter, setAlertFilter] = useState<AlertFilter>('Open')

  // Medication form
  const [medForm, setMedForm] = useState({
    residentId: '',
    medicationName: '',
    dosage: '',
    route: '',
    frequency: '',
    scheduleNotes: '',
    startDate: '',
    endDate: '',
    prescribingDoctor: '',
  })
  const [medErrors, setMedErrors] = useState<Partial<Record<keyof typeof medForm, string>>>({})

  // Alert form
  const [alertForm, setAlertForm] = useState({
    alertType: '' as MedicationAlertType | '',
    severity: 'medium' as MedicationAlertSeverity,
    message: '',
    medicationId: '',
    residentId: '',
    dueAt: '',
  })
  const [alertErrors, setAlertErrors] = useState<Partial<Record<keyof typeof alertForm, string>>>({})

  // Resident name lookup
  const residentNameMap = useMemo(
    () => new Map(activeResidents.map((r) => [r.id, r.name])),
    [activeResidents],
  )
  const medicationNameMap = useMemo(
    () => new Map(initialMedications.map((medication) => [medication.id, medication.medicationName])),
    [initialMedications],
  )

  // Filtered medications
  const filteredMeds = useMemo(() => {
    if (medFilter === 'Active') return initialMedications.filter((m) => m.status === 'active')
    if (medFilter === 'Paused') return initialMedications.filter((m) => m.status === 'paused')
    if (medFilter === 'Discontinued') return initialMedications.filter((m) => m.status === 'discontinued')
    return initialMedications.filter((m) => m.status !== 'archived')
  }, [medFilter, initialMedications])

  // Filtered alerts, surfaced most-urgent first so the list reads like a
  // real attention queue rather than a plain creation-order log.
  const filteredAlerts = useMemo(() => {
    const base =
      alertFilter === 'Open'
        ? initialAlerts.filter((a) => a.status === 'open' || a.status === 'reviewing')
        : alertFilter === 'Resolved'
          ? initialAlerts.filter((a) => a.status === 'resolved')
          : initialAlerts.filter((a) => a.status !== 'archived')

    return [...base].sort((left, right) => {
      const rankDelta =
        getMedicationAlertUrgencyRank(getMedicationAlertUrgency(left)) -
        getMedicationAlertUrgencyRank(getMedicationAlertUrgency(right))
      if (rankDelta !== 0) return rankDelta
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    })
  }, [alertFilter, initialAlerts])

  // Summary counts
  const activeMedsCount = initialMedications.filter((m) => m.status === 'active').length
  const openAlertsCount = initialAlerts.filter((a) => a.status === 'open' || a.status === 'reviewing').length
  const criticalAlertsCount = initialAlerts.filter(
    (a) => (a.severity === 'critical' || a.severity === 'high') && a.status !== 'archived',
  ).length
  const pausedOrDiscontinuedCount = initialMedications.filter(
    (m) => m.status === 'paused' || m.status === 'discontinued',
  ).length

  // Real alarm counts, derived from live status/due_at only.
  const openAlertUrgencies = useMemo(
    () =>
      initialAlerts
        .filter((a) => a.status === 'open' || a.status === 'reviewing')
        .map((a) => getMedicationAlertUrgency(a)),
    [initialAlerts],
  )
  const overdueAlertsCount = openAlertUrgencies.filter((u) => u === 'overdue').length
  const dueSoonAlertsCount = openAlertUrgencies.filter((u) => u === 'due_soon').length
  const needsReviewAlertsCount = openAlertUrgencies.filter((u) => u === 'needs_review').length

  const hasMedicationDetails = Boolean(
    medForm.endDate || medForm.prescribingDoctor || medForm.scheduleNotes,
  )
  const hasAlertDraft = Boolean(
    alertForm.alertType ||
      alertForm.message ||
      alertForm.medicationId ||
      alertForm.residentId ||
      alertForm.dueAt ||
      alertForm.severity !== 'medium',
  )


  function run(
    actionFn: () => Promise<{ success: boolean; error?: string }>,
    onSuccess?: () => void,
  ) {
    setActionError('')
    startTransition(async () => {
      try {
        const result = await actionFn()
        if (!result.success) {
          setActionError((result as { success: false; error: string }).error)
          return
        }
        onSuccess?.()
        router.refresh()
      } catch {
        // An uncaught rejection here would leave isPending stuck true,
        // permanently disabling every action button on the page.
        setActionError('Something went wrong. Please try again.')
      }
    })
  }

  function requestConfirmation(confirmation: PendingConfirmation) {
    setActionError('')
    setPendingConfirmation(confirmation)
  }

  function handleConfirmationConfirm() {
    if (!pendingConfirmation) return
    run(pendingConfirmation.action, () => setPendingConfirmation(null))
  }

  function handleConfirmationOpenChange(open: boolean) {
    if (open || isPending) return
    setPendingConfirmation(null)
  }


  function handleMedChange(field: keyof typeof medForm, value: string) {
    setMedForm((prev) => ({ ...prev, [field]: value }))
    if (medErrors[field]) setMedErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function resetMedForm() {
    setMedForm({
      residentId: '',
      medicationName: '',
      dosage: '',
      route: '',
      frequency: '',
      scheduleNotes: '',
      startDate: '',
      endDate: '',
      prescribingDoctor: '',
    })
    setMedErrors({})
    setMedDetailsOpen(false)
  }

  function handleMedSubmit() {
    const errors: typeof medErrors = {}
    if (!medForm.residentId) errors.residentId = 'Resident is required.'
    if (!medForm.medicationName.trim()) errors.medicationName = 'Medication name is required.'
    setMedErrors(errors)
    if (Object.keys(errors).length > 0) return

    run(
      () =>
        createMedicationAction({
          residentId: medForm.residentId,
          medicationName: medForm.medicationName.trim(),
          dosage: medForm.dosage || null,
          route: medForm.route || null,
          frequency: medForm.frequency || null,
          scheduleNotes: medForm.scheduleNotes || null,
          startDate: medForm.startDate || null,
          endDate: medForm.endDate || null,
          prescribingDoctor: medForm.prescribingDoctor || null,
        }),
      resetMedForm,
    )
  }


  function handleAlertChange(field: keyof typeof alertForm, value: string) {
    setAlertForm((prev) => ({ ...prev, [field]: value }))
    if (alertErrors[field]) setAlertErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function resetAlertForm() {
    setAlertForm({
      alertType: '',
      severity: 'medium',
      message: '',
      medicationId: '',
      residentId: '',
      dueAt: '',
    })
    setAlertErrors({})
    setAlertComposerOpen(false)
  }

  function handleAlertSubmit() {
    const errors: typeof alertErrors = {}
    if (!alertForm.alertType) errors.alertType = 'Alert type is required.'
    if (!alertForm.message.trim()) errors.message = 'Message is required.'
    setAlertErrors(errors)
    if (Object.keys(errors).length > 0) {
      setAlertComposerOpen(true)
      return
    }

    run(
      () =>
        createMedicationAlertAction({
          alertType: alertForm.alertType as MedicationAlertType,
          severity: alertForm.severity,
          message: alertForm.message.trim(),
          medicationId: alertForm.medicationId || null,
          residentId: alertForm.residentId || null,
          dueAt: alertForm.dueAt || null,
        }),
      resetAlertForm,
    )
  }


  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 lg:py-8">

          <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/12 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200 ring-1 ring-emerald-400/20">
                  <span className="inline-flex size-2 rounded-full bg-emerald-400" aria-hidden="true" />
                  Medications
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  Medication Management
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Manage prescriptions and medication alerts for residents across The Kingdom Care Homes.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
              <SummaryCard label="Active medications" value={activeMedsCount} tone="green" Icon={Pill} />
              <SummaryCard label="Open alerts" value={openAlertsCount} tone="amber" Icon={AlertTriangle} />
              <SummaryCard label="High / critical" value={criticalAlertsCount} tone="red" Icon={ShieldAlert} />
              <SummaryCard label="Paused / discontinued" value={pausedOrDiscontinuedCount} tone="gray" Icon={PauseCircle} />
            </div>
          </section>

          <AttentionBanner
            overdueCount={overdueAlertsCount}
            dueSoonCount={dueSoonAlertsCount}
            needsReviewCount={needsReviewAlertsCount}
          />

          {(loadError || actionError) && (
            <p
              role="alert"
              className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200"
            >
              {loadError ?? actionError}
            </p>
          )}

          {!canManage && (
            <section className="mt-4 rounded-2xl border border-border bg-card/80 px-4 py-4 text-sm text-muted-foreground shadow-sm sm:px-5">
              Review current medication records and alert history here. Medication changes and alert updates remain
              limited to admin and nurse roles.
            </section>
          )}

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_400px]">

            <div className="flex flex-col gap-6">

              {/* Add medication form */}
              {canManage && (
                <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25">
                      <Pill className="size-5" />
                    </span>
                    <div>
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground">Add Medication</h2>
                      <p className="text-sm text-muted-foreground">
                        Start with the essentials and open more details only when you need them.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 space-y-5">
                    <div className="rounded-2xl border border-border bg-background/35 p-4 sm:p-5">
                      <div className="mb-4 flex flex-col gap-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                          Quick add
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Record the core prescription details first.
                        </p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label htmlFor="medResident" className="block text-sm font-semibold text-foreground">
                            Resident <Required />
                          </label>
                          <select
                            id="medResident"
                            value={medForm.residentId}
                            onChange={(e) => handleMedChange('residentId', e.target.value)}
                            className={INPUT_CLASS}
                          >
                            <option value="">Select resident...</option>
                            {activeResidents.map((r) => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                          {medErrors.residentId && <FieldError message={medErrors.residentId} />}
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor="medName" className="block text-sm font-semibold text-foreground">
                            Medication name <Required />
                          </label>
                          <input
                            id="medName"
                            type="text"
                            value={medForm.medicationName}
                            onChange={(e) => handleMedChange('medicationName', e.target.value)}
                            placeholder="e.g. Lisinopril 10mg"
                            className={INPUT_CLASS}
                          />
                          {medErrors.medicationName && <FieldError message={medErrors.medicationName} />}
                        </div>
                      </div>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="space-y-1.5">
                          <label htmlFor="medDosage" className="block text-sm font-semibold text-foreground">
                            Dosage
                          </label>
                          <input
                            id="medDosage"
                            type="text"
                            value={medForm.dosage}
                            onChange={(e) => handleMedChange('dosage', e.target.value)}
                            placeholder="e.g. 10mg"
                            className={INPUT_CLASS}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor="medFrequency" className="block text-sm font-semibold text-foreground">
                            Frequency
                          </label>
                          <input
                            id="medFrequency"
                            type="text"
                            value={medForm.frequency}
                            onChange={(e) => handleMedChange('frequency', e.target.value)}
                            placeholder="e.g. Once daily"
                            className={INPUT_CLASS}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor="medStart" className="block text-sm font-semibold text-foreground">
                            Start date
                          </label>
                          <input
                            id="medStart"
                            type="date"
                            value={medForm.startDate}
                            onChange={(e) => handleMedChange('startDate', e.target.value)}
                            className={INPUT_CLASS}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor="medRoute" className="block text-sm font-semibold text-foreground">
                            Route
                          </label>
                          <select
                            id="medRoute"
                            value={medForm.route}
                            onChange={(e) => handleMedChange('route', e.target.value)}
                            className={INPUT_CLASS}
                          >
                            <option value="">Select...</option>
                            {ROUTES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-background/20 p-4 sm:p-5">
                      <button
                        type="button"
                        onClick={() => setMedDetailsOpen((prev) => !prev)}
                        className="flex w-full items-center justify-between gap-4 text-left"
                        aria-expanded={medDetailsOpen || hasMedicationDetails}
                      >
                        <div>
                          <p className="text-sm font-semibold text-foreground">More details</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            End date, prescriber, and scheduling notes stay optional.
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-semibold text-muted-foreground">
                          {hasMedicationDetails ? 'Filled' : 'Optional'}
                          <ChevronDown
                            className={cn(
                              'size-4 transition-transform',
                              (medDetailsOpen || hasMedicationDetails) && 'rotate-180',
                            )}
                          />
                        </span>
                      </button>
                      {(medDetailsOpen || hasMedicationDetails) && (
                        <div className="mt-4 space-y-4 border-t border-border pt-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <label htmlFor="medEnd" className="block text-sm font-semibold text-foreground">
                                End date
                              </label>
                              <input
                                id="medEnd"
                                type="date"
                                value={medForm.endDate}
                                onChange={(e) => handleMedChange('endDate', e.target.value)}
                                className={INPUT_CLASS}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label htmlFor="medDoctor" className="block text-sm font-semibold text-foreground">
                                Prescribing doctor
                              </label>
                              <input
                                id="medDoctor"
                                type="text"
                                value={medForm.prescribingDoctor}
                                onChange={(e) => handleMedChange('prescribingDoctor', e.target.value)}
                                placeholder="e.g. Dr. Smith"
                                className={INPUT_CLASS}
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label htmlFor="medNotes" className="block text-sm font-semibold text-foreground">
                              Schedule notes
                            </label>
                            <textarea
                              id="medNotes"
                              rows={2}
                              value={medForm.scheduleNotes}
                              onChange={(e) => handleMedChange('scheduleNotes', e.target.value)}
                              placeholder="Any additional scheduling instructions..."
                              className={TEXTAREA_CLASS}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-muted-foreground">
                        All medication fields remain supported and submit through the existing backend actions.
                      </p>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={handleMedSubmit}
                        className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-150 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                      >
                        Save Medication
                      </button>
                    </div>
                  </div>
                </section>
              )}              {/* Medications list */}
              <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
                <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">Medication Records</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {filteredMeds.length} medication{filteredMeds.length !== 1 ? 's' : ''} shown
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Review resident links, dosage details, schedule notes, and record timestamps in one place.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {MED_FILTERS.map((f) => (
                      <FilterPill key={f} label={f} active={medFilter === f} onClick={() => setMedFilter(f)} />
                    ))}
                  </div>
                </div>

                {filteredMeds.length === 0 ? (
                  <EmptyState message={`No ${medFilter.toLowerCase()} medications recorded yet.`} />
                ) : (
                  <div className="space-y-3">
                    {filteredMeds.map((med) => {
                      const medResidentName = residentNameMap.get(med.residentId) ?? 'Unknown resident'
                      const medItemLabel = `${med.medicationName} - ${medResidentName}`

                      return (
                        <MedicationCard
                          key={med.id}
                          med={med}
                          residentName={medResidentName}
                          canManage={canManage}
                          isPending={isPending}
                          onResume={(id) => run(() => resumeMedicationAction(id))}
                          onPause={(id) => run(() => pauseMedicationAction(id))}
                          onDiscontinue={(id) =>
                            requestConfirmation({
                              tone: 'rose',
                              badgeLabel: 'Discontinue medication',
                              title: 'Discontinue medication?',
                              description:
                                'This marks the medication as discontinued for this resident. It stays visible under the Discontinued filter so the care team keeps a record.',
                              itemLabel: medItemLabel,
                              confirmLabel: 'Discontinue',
                              pendingLabel: 'Discontinuing...',
                              action: () => discontinueMedicationAction(id),
                            })
                          }
                          onArchive={(id) =>
                            requestConfirmation({
                              tone: 'neutral',
                              badgeLabel: 'Archive medication',
                              title: 'Archive medication?',
                              description:
                                'Archived medications are removed from the active filters but stay available under All for historical reference.',
                              itemLabel: medItemLabel,
                              confirmLabel: 'Archive medication',
                              pendingLabel: 'Archiving...',
                              action: () => archiveMedicationAction(id),
                            })
                          }
                          onDelete={(id) =>
                            requestConfirmation({
                              tone: 'rose',
                              badgeLabel: 'Delete medication',
                              title: 'Delete medication permanently?',
                              description:
                                'This removes the medication from every view for your care home. This cannot be undone from the app.',
                              itemLabel: medItemLabel,
                              confirmLabel: 'Delete permanently',
                              pendingLabel: 'Deleting...',
                              action: () => deleteMedicationAction(id),
                            })
                          }
                        />
                      )
                    })}
                  </div>
                )}
              </section>
            </div>

            <div className="flex flex-col gap-6">

              {/* Create alert form */}
              {canManage && (
                <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/25">
                        <AlertTriangle className="size-5" />
                      </span>
                      <div>
                        <h2 className="text-xl font-semibold tracking-tight text-foreground">Log Alert / Reminder</h2>
                        <p className="text-sm text-muted-foreground">
                          Set a due time to create a live reminder, or leave it blank for a standing alert.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAlertComposerOpen((prev) => !prev)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/15"
                      aria-expanded={alertComposerOpen}
                    >
                      {alertComposerOpen ? 'Hide form' : 'Log alert'}
                      {alertComposerOpen ? <ChevronDown className="size-4 rotate-180" /> : <Plus className="size-4" />}
                    </button>
                  </div>
                  {alertComposerOpen ? (
                    <div className="mt-5 space-y-4 border-t border-border pt-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label htmlFor="alertType" className="block text-sm font-semibold text-foreground">
                            Alert type <Required />
                          </label>
                          <select
                            id="alertType"
                            value={alertForm.alertType}
                            onChange={(e) => handleAlertChange('alertType', e.target.value)}
                            className={INPUT_CLASS}
                          >
                            <option value="">Select type...</option>
                            {ALERT_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                          {alertErrors.alertType && <FieldError message={alertErrors.alertType} />}
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor="alertSeverity" className="block text-sm font-semibold text-foreground">
                            Severity
                          </label>
                          <select
                            id="alertSeverity"
                            value={alertForm.severity}
                            onChange={(e) => handleAlertChange('severity', e.target.value)}
                            className={INPUT_CLASS}
                          >
                            {SEVERITIES.map((s) => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="alertMessage" className="block text-sm font-semibold text-foreground">
                          Message <Required />
                        </label>
                        <textarea
                          id="alertMessage"
                          rows={3}
                          value={alertForm.message}
                          onChange={(e) => handleAlertChange('message', e.target.value)}
                          placeholder="Describe the alert..."
                          className={TEXTAREA_CLASS}
                        />
                        {alertErrors.message && <FieldError message={alertErrors.message} />}
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label htmlFor="alertMed" className="block text-sm font-semibold text-foreground">
                            Linked medication
                          </label>
                          <select
                            id="alertMed"
                            value={alertForm.medicationId}
                            onChange={(e) => handleAlertChange('medicationId', e.target.value)}
                            className={INPUT_CLASS}
                          >
                            <option value="">None</option>
                            {initialMedications
                              .filter((m) => m.status === 'active' || m.status === 'paused')
                              .map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.medicationName} - {residentNameMap.get(m.residentId) ?? ''}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor="alertResident" className="block text-sm font-semibold text-foreground">
                            Resident
                          </label>
                          <select
                            id="alertResident"
                            value={alertForm.residentId}
                            onChange={(e) => handleAlertChange('residentId', e.target.value)}
                            className={INPUT_CLASS}
                          >
                            <option value="">None</option>
                            {activeResidents.map((r) => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="alertDue" className="block text-sm font-semibold text-foreground">
                          Reminder due at
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Once this time passes, the alert shows as overdue on this page, the dashboard, and the
                          notification bell.
                        </p>
                        <input
                          id="alertDue"
                          type="datetime-local"
                          value={alertForm.dueAt}
                          onChange={(e) => handleAlertChange('dueAt', e.target.value)}
                          className={INPUT_CLASS}
                        />
                      </div>
                      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-muted-foreground">
                          Alerts still use the existing create, resolve, archive, and delete actions.
                        </p>
                        <div className="flex gap-2 sm:justify-end">
                          <button
                            type="button"
                            onClick={() => setAlertComposerOpen(false)}
                            className="rounded-xl border border-border bg-background/70 px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={handleAlertSubmit}
                            className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-amber-950 shadow-sm transition-all duration-150 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Log Alert
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl border border-dashed border-amber-400/20 bg-amber-500/5 p-4 text-sm text-muted-foreground">
                      Use the button above to open the alert form only when a medication issue needs attention.
                      {hasAlertDraft && ' Your current draft is still here.'}
                    </div>
                  )}
                </section>
              )}              {/* Alerts list */}
              <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
                <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">Medication Alerts</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''} shown
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Open, resolved, and archived alerts keep their saved severity, timing, and linked resident details.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ALERT_FILTERS.map((f) => (
                      <FilterPill key={f} label={f} active={alertFilter === f} onClick={() => setAlertFilter(f)} />
                    ))}
                  </div>
                </div>

                {filteredAlerts.length === 0 ? (
                  <EmptyState message={`No ${alertFilter.toLowerCase()} medication alerts.`} />
                ) : (
                  <div className="space-y-3">
                    {filteredAlerts.map((alert) => {
                      const alertResidentName = alert.residentId ? (residentNameMap.get(alert.residentId) ?? null) : null
                      const alertMedicationName = alert.medicationId
                        ? (medicationNameMap.get(alert.medicationId) ?? null)
                        : null
                      const alertItemLabel = [alertMedicationName, alertResidentName].filter(Boolean).join(' - ') || alert.message

                      return (
                        <AlertCard
                          key={alert.id}
                          alert={alert}
                          residentName={alertResidentName}
                          medicationName={alertMedicationName}
                          canManage={canManage}
                          isPending={isPending}
                          onResolve={(id) => run(() => resolveMedicationAlertAction(id))}
                          onArchive={(id) =>
                            requestConfirmation({
                              tone: 'neutral',
                              badgeLabel: 'Archive alert',
                              title: 'Archive alert?',
                              description:
                                'Archived alerts are removed from the active filters but stay available under All for historical reference.',
                              itemLabel: alertItemLabel,
                              confirmLabel: 'Archive alert',
                              pendingLabel: 'Archiving...',
                              action: () => archiveMedicationAlertAction(id),
                            })
                          }
                          onDelete={(id) =>
                            requestConfirmation({
                              tone: 'rose',
                              badgeLabel: 'Delete alert',
                              title: 'Delete alert permanently?',
                              description:
                                'This removes the alert from every view for your care home. This cannot be undone from the app.',
                              itemLabel: alertItemLabel,
                              confirmLabel: 'Delete permanently',
                              pendingLabel: 'Deleting...',
                              action: () => deleteMedicationAlertAction(id),
                            })
                          }
                        />
                      )
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>

          <AlertDialog open={pendingConfirmation !== null} onOpenChange={handleConfirmationOpenChange}>
            <AlertDialogContent
              className={`${dashboardFont.variable} v0-dashboard-theme dark max-w-lg gap-0 overflow-hidden border-white/10 bg-card/95 p-0 font-sans shadow-[0_28px_90px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.05)]`}
            >
              <AlertDialogHeader className="gap-3 p-6 pb-5 sm:p-7 sm:pb-5">
                <div
                  className={cn(
                    'inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] ring-1',
                    pendingConfirmation?.tone === 'rose'
                      ? 'bg-rose-500/12 text-rose-200 ring-rose-400/25'
                      : 'bg-amber-500/12 text-amber-200 ring-amber-400/25',
                  )}
                >
                  <Trash2 className="size-3.5" />
                  {pendingConfirmation?.badgeLabel}
                </div>
                <AlertDialogTitle className="text-2xl tracking-tight text-foreground">
                  {pendingConfirmation?.title}
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                  <span className="block">{pendingConfirmation?.description}</span>
                  <span className="block rounded-2xl border border-white/10 bg-background/55 px-4 py-3 text-base font-semibold text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                    {pendingConfirmation?.itemLabel}
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="border-t border-white/10 bg-background/35 px-6 py-5 sm:px-7">
                {actionError && (
                  <p
                    role="alert"
                    className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200"
                  >
                    {actionError}
                  </p>
                )}

                <AlertDialogFooter className={cn(actionError && 'mt-4')}>
                  <AlertDialogCancel
                    disabled={isPending}
                    className="rounded-xl border border-white/10 bg-background/75 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent/80 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isPending}
                    onClick={(event) => {
                      event.preventDefault()
                      handleConfirmationConfirm()
                    }}
                    className={cn(
                      'rounded-xl border px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                      pendingConfirmation?.tone === 'rose'
                        ? 'border-rose-400/30 bg-rose-500/18 text-rose-100 shadow-[0_12px_28px_rgba(244,63,94,0.18)] hover:bg-rose-500/28'
                        : 'border-amber-400/30 bg-amber-500/18 text-amber-100 hover:bg-amber-500/28',
                    )}
                  >
                    {isPending ? pendingConfirmation?.pendingLabel : pendingConfirmation?.confirmLabel}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </div>
            </AlertDialogContent>
          </AlertDialog>
    </main>
  )
}


function SummaryCard({
  label,
  value,
  tone,
  Icon,
}: {
  label: string
  value: number
  tone: 'green' | 'amber' | 'red' | 'gray'
  Icon: React.ElementType
}) {
  const classes = {
    green: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200',
    amber: 'border-amber-400/20 bg-amber-500/10 text-amber-200',
    red: 'border-rose-400/20 bg-rose-500/10 text-rose-200',
    gray: 'border-border bg-background/60 text-foreground',
  }[tone]

  return (
    <div className={cn('rounded-2xl border p-5 shadow-sm', classes)}>
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-black/10 ring-1 ring-white/10">
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-80">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  )
}

function AttentionBanner({
  overdueCount,
  dueSoonCount,
  needsReviewCount,
}: {
  overdueCount: number
  dueSoonCount: number
  needsReviewCount: number
}) {
  const totalCount = overdueCount + dueSoonCount + needsReviewCount

  if (totalCount === 0) {
    return null
  }

  const isOverdue = overdueCount > 0
  const parts = [
    overdueCount > 0 ? `${overdueCount} overdue` : null,
    dueSoonCount > 0 ? `${dueSoonCount} due soon` : null,
    needsReviewCount > 0 ? `${needsReviewCount} needs review` : null,
  ].filter(Boolean)

  return (
    <section
      role="alert"
      className={cn(
        'mt-4 flex items-start gap-3 rounded-2xl border p-4 shadow-sm sm:items-center sm:p-5',
        isOverdue
          ? 'border-rose-400/30 bg-rose-500/10'
          : 'border-amber-400/30 bg-amber-500/10',
      )}
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-xl ring-1',
          isOverdue
            ? 'bg-rose-500/15 text-rose-300 ring-rose-400/35 animate-pulse'
            : 'bg-amber-500/15 text-amber-300 ring-amber-400/35',
        )}
        aria-hidden="true"
      >
        <BellRing className="size-5" />
      </span>
      <div className="min-w-0">
        <p className={cn('text-sm font-semibold', isOverdue ? 'text-rose-200' : 'text-amber-200')}>
          {totalCount} medication alert{totalCount === 1 ? '' : 's'} need attention
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {parts.join(' | ')} - review the list below to acknowledge or resolve.
        </p>
      </div>
    </section>
  )
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'border border-border bg-background/70 text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      {label}
    </button>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-background/60 p-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

function Required() {
  return <span className="text-rose-400">*</span>
}

function FieldError({ message }: { message: string }) {
  return <p role="alert" className="text-xs text-rose-300">{message}</p>
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/55 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  )
}


interface MedicationCardProps {
  med: MedicationRecord
  residentName: string
  canManage: boolean
  isPending: boolean
  onResume: (id: string) => void
  onPause: (id: string) => void
  onDiscontinue: (id: string) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
}

function MedicationCard({
  med,
  residentName,
  canManage,
  isPending,
  onResume,
  onPause,
  onDiscontinue,
  onArchive,
  onDelete,
}: MedicationCardProps) {
  const statusClasses = {
    active: 'border-emerald-400/20 bg-emerald-500/8',
    paused: 'border-amber-400/20 bg-amber-500/8',
    discontinued: 'border-rose-400/20 bg-rose-500/8',
    archived: 'border-border bg-background/60',
  }[med.status]

  const scheduleSummary = [med.dosage || null, med.route || null, med.frequency || null].filter(Boolean).join(' | ')

  return (
    <article className={cn('rounded-2xl border p-4 transition-colors', statusClasses)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">{med.medicationName}</h3>
                <MedStatusBadge status={med.status} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Resident: {residentName}</p>
            </div>
            <p className="text-xs text-muted-foreground">Updated {formatDateTime(med.updatedAt)}</p>
          </div>

          {scheduleSummary && <p className="mt-4 text-sm text-foreground/90">{scheduleSummary}</p>}

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MetadataItem label="Dosage" value={med.dosage || 'Not recorded'} />
            <MetadataItem label="Frequency" value={med.frequency || 'Not recorded'} />
            <MetadataItem label="Route" value={med.route || 'Not recorded'} />
            <MetadataItem label="Start date" value={med.startDate ? formatDate(med.startDate) : 'Not set'} />
            <MetadataItem label="End date" value={med.endDate ? formatDate(med.endDate) : 'Not set'} />
            <MetadataItem label="Prescriber" value={med.prescribingDoctor || 'Not recorded'} />
          </div>

          {med.scheduleNotes && (
            <div className="mt-4 rounded-2xl border border-border bg-background/45 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Instructions / notes
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground">{med.scheduleNotes}</p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span>Created {formatDateTime(med.createdAt)}</span>
            <span>Last updated {formatDateTime(med.updatedAt)}</span>
          </div>
        </div>

        {canManage && (
          <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:max-w-[12rem] sm:justify-end">
            {med.status === 'active' && (
              <>
                <ActionButton
                  label="Pause"
                  tone="amber"
                  Icon={PauseCircle}
                  disabled={isPending}
                  onClick={() => onPause(med.id)}
                />
                <ActionButton
                  label="Discontinue"
                  tone="rose"
                  Icon={Ban}
                  disabled={isPending}
                  onClick={() => onDiscontinue(med.id)}
                />
              </>
            )}
            {med.status === 'paused' && (
              <>
                <ActionButton
                  label="Resume"
                  tone="green"
                  Icon={Play}
                  disabled={isPending}
                  onClick={() => onResume(med.id)}
                />
                <ActionButton
                  label="Discontinue"
                  tone="rose"
                  Icon={Ban}
                  disabled={isPending}
                  onClick={() => onDiscontinue(med.id)}
                />
              </>
            )}
            {med.status === 'discontinued' && (
              <ActionButton
                label="Archive"
                tone="gray"
                Icon={CheckCircle2}
                disabled={isPending}
                onClick={() => onArchive(med.id)}
              />
            )}
            <ActionButton
              label="Delete"
              tone="delete"
              Icon={Trash2}
              disabled={isPending}
              onClick={() => onDelete(med.id)}
            />
          </div>
        )}
      </div>
    </article>
  )
}

function MedStatusBadge({ status }: { status: MedicationRecord['status'] }) {
  const map: Record<MedicationRecord['status'], string> = {
    active: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/35',
    paused: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/35',
    discontinued: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/35',
    archived: 'bg-zinc-500/15 text-zinc-300 ring-1 ring-zinc-400/25',
  }
  const labels: Record<MedicationRecord['status'], string> = {
    active: 'Active',
    paused: 'Paused',
    discontinued: 'Discontinued',
    archived: 'Archived',
  }
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', map[status])}>
      {labels[status]}
    </span>
  )
}


interface AlertCardProps {
  alert: MedicationAlertRecord
  residentName: string | null
  medicationName: string | null
  canManage: boolean
  isPending: boolean
  onResolve: (id: string) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
}

function AlertCard({
  alert,
  residentName,
  medicationName,
  canManage,
  isPending,
  onResolve,
  onArchive,
  onDelete,
}: AlertCardProps) {
  const isOpen = alert.status === 'open' || alert.status === 'reviewing'
  const isResolved = alert.status === 'resolved'
  const urgency = getMedicationAlertUrgency(alert)
  const rowClass = MEDICATION_ALERT_URGENCY_CARD_CLASSES[urgency]

  return (
    <article className={cn('rounded-2xl border p-4 transition-colors', rowClass)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <UrgencyBadge urgency={urgency} />
          <AlertTypeBadge type={alert.alertType} />
          <AlertSeverityBadge severity={alert.severity} />
        </div>
        <p className="text-xs text-muted-foreground">
          {alert.dueAt ? `Due ${formatDateTime(alert.dueAt)}` : `Logged ${formatDateTime(alert.createdAt)}`}
        </p>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-foreground">{alert.message}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetadataItem label="Resident" value={residentName ?? 'Not linked'} />
        <MetadataItem label="Medication" value={medicationName ?? 'Not linked'} />
        <MetadataItem label="Logged" value={formatDateTime(alert.createdAt)} />
        <MetadataItem label="Due" value={alert.dueAt ? formatDateTime(alert.dueAt) : 'No due time'} />
        <MetadataItem label="Acknowledged" value={alert.resolvedAt ? formatDateTime(alert.resolvedAt) : 'Not yet'} />
        <MetadataItem label="Updated" value={formatDateTime(alert.updatedAt)} />
      </div>

      {canManage && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {isOpen && (
            <ActionButton
              label="Acknowledge"
              tone="green"
              Icon={CheckCircle2}
              disabled={isPending}
              onClick={() => onResolve(alert.id)}
            />
          )}
          {isResolved && (
            <ActionButton
              label="Archive"
              tone="gray"
              Icon={CheckCircle2}
              disabled={isPending}
              onClick={() => onArchive(alert.id)}
            />
          )}
          <ActionButton
            label="Delete"
            tone="delete"
            Icon={Trash2}
            disabled={isPending}
            onClick={() => onDelete(alert.id)}
          />
        </div>
      )}
    </article>
  )
}

function AlertTypeBadge({ type }: { type: MedicationAlertType }) {
  const labels: Record<MedicationAlertType, string> = {
    missed_dose: 'Missed Dose',
    refill_needed: 'Refill Needed',
    review_required: 'Review Required',
    allergy_warning: 'Allergy Warning',
    interaction_warning: 'Interaction Warning',
    other: 'Other',
  }
  const isWarning = type === 'allergy_warning' || type === 'interaction_warning'
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
        isWarning
          ? 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/35'
          : 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/35',
      )}
    >
      {labels[type]}
    </span>
  )
}

function AlertSeverityBadge({ severity }: { severity: MedicationAlertSeverity }) {
  const map: Record<MedicationAlertSeverity, string> = {
    low: 'bg-zinc-500/15 text-zinc-300 ring-1 ring-zinc-400/25',
    medium: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/35',
    high: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/35',
    critical: 'bg-rose-500/20 text-rose-200 ring-1 ring-rose-400/50',
  }
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize', map[severity])}>
      {severity}
    </span>
  )
}

function UrgencyBadge({ urgency }: { urgency: MedicationAlertUrgency }) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
        MEDICATION_ALERT_URGENCY_BADGE_CLASSES[urgency],
      )}
    >
      {MEDICATION_ALERT_URGENCY_LABELS[urgency]}
    </span>
  )
}


function ActionButton({
  label,
  tone,
  Icon,
  disabled,
  onClick,
}: {
  label: string
  tone: 'green' | 'amber' | 'rose' | 'gray' | 'delete'
  Icon: React.ElementType
  disabled: boolean
  onClick: () => void
}) {
  const classes = {
    green: 'text-emerald-300 hover:text-emerald-200',
    amber: 'text-amber-300 hover:text-amber-200',
    rose: 'text-rose-300 hover:text-rose-200',
    gray: 'text-muted-foreground hover:text-foreground',
    delete: 'text-rose-400 hover:text-rose-300',
  }[tone]

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-semibold transition-colors disabled:opacity-60',
        classes,
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  )
}


function formatDate(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}







