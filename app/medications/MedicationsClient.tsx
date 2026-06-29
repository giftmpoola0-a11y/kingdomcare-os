'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
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
import { AppSidebar } from '@/components/kingdomos-v0/app-sidebar'
import { AppTopbar } from '@/components/kingdomos-v0/app-topbar'
import { cn } from '@/lib/utils'
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

// â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface MedicationsClientProps {
  initialMedications: MedicationRecord[]
  initialAlerts: MedicationAlertRecord[]
  activeResidents: ResidentRecord[]
  canManage: boolean
  loadError: string | null
}

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function MedicationsClient({
  initialMedications,
  initialAlerts,
  activeResidents,
  canManage,
  loadError,
}: MedicationsClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [actionError, setActionError] = useState('')
  const [medDetailsOpen, setMedDetailsOpen] = useState(false)
  const [alertComposerOpen, setAlertComposerOpen] = useState(false)

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

  // Filtered medications
  const filteredMeds = useMemo(() => {
    if (medFilter === 'Active') return initialMedications.filter((m) => m.status === 'active')
    if (medFilter === 'Paused') return initialMedications.filter((m) => m.status === 'paused')
    if (medFilter === 'Discontinued') return initialMedications.filter((m) => m.status === 'discontinued')
    return initialMedications.filter((m) => m.status !== 'archived')
  }, [medFilter, initialMedications])

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    if (alertFilter === 'Open') return initialAlerts.filter((a) => a.status === 'open' || a.status === 'reviewing')
    if (alertFilter === 'Resolved') return initialAlerts.filter((a) => a.status === 'resolved')
    return initialAlerts.filter((a) => a.status !== 'archived')
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

  // â”€â”€ Action runner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function run(
    actionFn: () => Promise<{ success: boolean; error?: string }>,
    onSuccess?: () => void,
  ) {
    setActionError('')
    startTransition(async () => {
      const result = await actionFn()
      if (!result.success) {
        setActionError((result as { success: false; error: string }).error)
        return
      }
      onSuccess?.()
      router.refresh()
    })
  }

  // â”€â”€ Medication form handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // â”€â”€ Alert form handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar onMenu={() => setSidebarOpen(true)} />

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 lg:py-8">

          {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

          {/* â”€â”€ Error banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {(loadError || actionError) && (
            <p
              role="alert"
              className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200"
            >
              {loadError ?? actionError}
            </p>
          )}

          {/* â”€â”€ Main grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_400px]">

            {/* â”€â”€ Left: Medications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                    {filteredMeds.map((med) => (
                      <MedicationCard
                        key={med.id}
                        med={med}
                        residentName={residentNameMap.get(med.residentId) ?? 'Unknown resident'}
                        canManage={canManage}
                        isPending={isPending}
                        onResume={(id) => run(() => resumeMedicationAction(id))}
                        onPause={(id) => run(() => pauseMedicationAction(id))}
                        onDiscontinue={(id) => {
                          if (!window.confirm('Mark this medication as discontinued?')) return
                          run(() => discontinueMedicationAction(id))
                        }}
                        onArchive={(id) => run(() => archiveMedicationAction(id))}
                        onDelete={(id) => {
                          if (!window.confirm('Permanently delete this medication record?')) return
                          run(() => deleteMedicationAction(id))
                        }}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* â”€â”€ Right: Alerts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                        <h2 className="text-xl font-semibold tracking-tight text-foreground">Log Alert</h2>
                        <p className="text-sm text-muted-foreground">
                          Keep alert logging close by without leaving the full form open all the time.
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
                          Due at
                        </label>
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
                    {filteredAlerts.map((alert) => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        residentName={alert.residentId ? (residentNameMap.get(alert.residentId) ?? null) : null}
                        medicationName={
                          alert.medicationId
                            ? (initialMedications.find((m) => m.id === alert.medicationId)?.medicationName ?? null)
                            : null
                        }
                        canManage={canManage}
                        isPending={isPending}
                        onResolve={(id) => run(() => resolveMedicationAlertAction(id))}
                        onArchive={(id) => run(() => archiveMedicationAlertAction(id))}
                        onDelete={(id) => {
                          if (!window.confirm('Delete this alert?')) return
                          run(() => deleteMedicationAlertAction(id))
                        }}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

// â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Medication card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  return (
    <article className={cn('rounded-2xl border p-4 transition-colors', statusClasses)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{med.medicationName}</h3>
            <MedStatusBadge status={med.status} />
          </div>

          <p className="text-xs text-muted-foreground">Resident: {residentName}</p>

          {(med.dosage || med.route || med.frequency) && (
            <p className="text-xs text-muted-foreground">
              {[med.dosage, med.route, med.frequency].filter(Boolean).join(' Â· ')}
            </p>
          )}

          {(med.startDate || med.endDate) && (
            <p className="text-xs text-muted-foreground">
              {med.startDate && formatDate(med.startDate)}
              {med.startDate && med.endDate && ' â†’ '}
              {med.endDate && formatDate(med.endDate)}
            </p>
          )}

          {med.prescribingDoctor && (
            <p className="text-xs text-muted-foreground">Dr: {med.prescribingDoctor}</p>
          )}
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
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

// â”€â”€ Alert card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  const rowClass = isResolved
    ? 'border-emerald-400/20 bg-emerald-500/8'
    : isOpen
      ? alert.severity === 'critical' || alert.severity === 'high'
        ? 'border-rose-400/20 bg-rose-500/8'
        : 'border-amber-400/20 bg-amber-500/8'
      : 'border-border bg-background/60'

  return (
    <article className={cn('rounded-2xl border p-4 transition-colors', rowClass)}>
      <div className="flex flex-wrap items-center gap-2">
        <AlertTypeBadge type={alert.alertType} />
        <AlertSeverityBadge severity={alert.severity} />
        <AlertStatusBadge status={alert.status} />
      </div>

      <p className="mt-2 text-sm text-foreground leading-relaxed">{alert.message}</p>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {residentName && (
          <p className="text-xs text-muted-foreground">Resident: {residentName}</p>
        )}
        {medicationName && (
          <p className="text-xs text-muted-foreground">Med: {medicationName}</p>
        )}
        {alert.dueAt && (
          <p className="text-xs text-muted-foreground">Due: {formatDateTime(alert.dueAt)}</p>
        )}
        {alert.resolvedAt && (
          <p className="text-xs text-muted-foreground">Resolved: {formatDateTime(alert.resolvedAt)}</p>
        )}
      </div>

      {canManage && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {isOpen && (
            <ActionButton
              label="Resolve"
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

function AlertStatusBadge({ status }: { status: MedicationAlertRecord['status'] }) {
  const map: Record<MedicationAlertRecord['status'], string> = {
    open: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/35',
    reviewing: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/35',
    resolved: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/35',
    archived: 'bg-zinc-500/15 text-zinc-300 ring-1 ring-zinc-400/25',
  }
  const labels: Record<MedicationAlertRecord['status'], string> = {
    open: 'Open',
    reviewing: 'Reviewing',
    resolved: 'Resolved',
    archived: 'Archived',
  }
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', map[status])}>
      {labels[status]}
    </span>
  )
}

// â”€â”€ Action button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Formatters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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



