'use client'

import { useEffect, useState } from 'react'
import PageShell from '@/app/components/ui/PageShell'
import EmptyState from '@/app/components/ui/EmptyState'
import ReportCard from '@/app/components/ReportCard'
import { deleteReport, loadReports } from '@/app/lib/reports'
import { loadResidents } from '@/app/lib/residents'
import type { DemoResident, SavedReport } from '@/app/lib/reportTypes'

/* ── Date range options ─────────────────────────────────────── */

const DATE_RANGES = [
  { value: 'all',    label: 'All Dates'    },
  { value: 'today',  label: 'Today'        },
  { value: 'last7',  label: 'Last 7 Days'  },
  { value: 'last30', label: 'Last 30 Days' },
]

/* ── Page ───────────────────────────────────────────────────── */

export default function ReportsPage() {
  const [reports, setReports]             = useState<SavedReport[]>([])
  const [residents, setResidents]         = useState<DemoResident[]>([])
  const [expandedId, setExpandedId]       = useState<string | null>(null)
  const [printReportId, setPrintReportId] = useState<string | null>(null)
  const [selectedResident, setSelectedResident] = useState('all')
  const [selectedDateRange, setSelectedDateRange] = useState('all')

  useEffect(() => {
    setReports(loadReports())
    setResidents(loadResidents())
  }, [])

  const residentFilterOptions = Array.from(
    new Set([
      ...residents.map((r) => r.name),
      ...reports.map((r) => r.residentName),
    ])
  ).sort((a, b) => a.localeCompare(b))

  /* Print handling */
  useEffect(() => {
    function handleAfterPrint() { setPrintReportId(null) }
    window.addEventListener('afterprint', handleAfterPrint)
    return () => window.removeEventListener('afterprint', handleAfterPrint)
  }, [])

  useEffect(() => {
    if (!printReportId) return
    const id = window.setTimeout(() => window.print(), 0)
    return () => window.clearTimeout(id)
  }, [printReportId])

  function handleDeleteReport(id: string) {
    if (!window.confirm('Delete this report?')) return
    deleteReport(id)
    setReports((prev) => prev.filter((r) => r.id !== id))
    setExpandedId((prev) => (prev === id ? null : prev))
    setPrintReportId((prev) => (prev === id ? null : prev))
  }

  /* Date filtering */
  const now       = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const filteredReports = reports.filter((report) => {
    const matchesResident =
      selectedResident === 'all' || report.residentName === selectedResident
    if (!matchesResident) return false
    if (selectedDateRange === 'all') return true

    const reportDate = new Date(report.createdAt)
    if (Number.isNaN(reportDate.getTime())) return false

    if (selectedDateRange === 'today') return reportDate >= todayStart

    const days = selectedDateRange === 'last7' ? 7 : 30
    const rangeStart = new Date(now)
    rangeStart.setDate(now.getDate() - days)
    return reportDate >= rangeStart
  })

  return (
    <PageShell subtitle="Saved Reports" printFriendly>
      {/* Page header */}
      <div className="anim-slide-down border-b border-slate-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-blue-600">Reports</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Saved Reports</h1>
            <p className="mt-1 text-sm text-slate-500">
              {reports.length} report{reports.length !== 1 ? 's' : ''} saved locally
              {filteredReports.length !== reports.length && ` · ${filteredReports.length} shown`}
            </p>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6 print:max-w-none print:px-0 print:py-0">
        {reports.length === 0 ? (
          <EmptyState
            message="No reports saved yet."
            linkHref="/shifts/new"
            linkLabel="Document a shift"
            className="print:hidden"
          />
        ) : (
          <>
            {/* ── Filters ─────────────────────────────────── */}
            <div className="print:hidden">
              {/* Resident filter — tab-style chips */}
              {residentFilterOptions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Filter by Resident
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <FilterChip
                      label="All Residents"
                      active={selectedResident === 'all'}
                      onClick={() => setSelectedResident('all')}
                    />
                    {residentFilterOptions.map((name) => (
                      <FilterChip
                        key={name}
                        label={name}
                        active={selectedResident === name}
                        onClick={() => setSelectedResident(name)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Date range filter — tab-style chips */}
              <div className="mt-4 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Filter by Date
                </p>
                <div className="flex flex-wrap gap-2">
                  {DATE_RANGES.map((range) => (
                    <FilterChip
                      key={range.value}
                      label={range.label}
                      active={selectedDateRange === range.value}
                      onClick={() => setSelectedDateRange(range.value)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* ── Report list ──────────────────────────────── */}
            {filteredReports.length === 0 ? (
              <EmptyState
                message="No saved reports match the selected filters."
                className="print:hidden"
              />
            ) : (
              <div className="space-y-4">
                {filteredReports.map((report) => {
                  const isExpanded          = expandedId === report.id
                  const isPrintingThisReport = printReportId === report.id

                  return (
                    <ReportCard
                      key={report.id}
                      report={report}
                      isExpanded={isExpanded}
                      showDetailedNotes={isExpanded || isPrintingThisReport}
                      printMode={isPrintingThisReport}
                      printOnly={Boolean(printReportId && !isPrintingThisReport)}
                      heading={isPrintingThisReport ? 'KingdomCare OS' : 'Shift Report'}
                      onToggleDetails={() => setExpandedId(isExpanded ? null : report.id)}
                      onPrint={() => setPrintReportId(report.id)}
                      onDelete={() => handleDeleteReport(report.id)}
                    />
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>
    </PageShell>
  )
}

/* ── FilterChip component ────────────────────────────────────── */

function FilterChip({
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
      className={[
        'kc-chip rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-100',
        active
          ? 'border-blue-500 bg-blue-600 text-white shadow-sm'
          : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700',
      ].join(' ')}
    >
      {label}
    </button>
  )
}
