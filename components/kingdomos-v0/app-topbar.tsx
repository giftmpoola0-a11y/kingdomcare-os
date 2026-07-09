'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell, ChevronRight, LoaderCircle, Menu, Search, ShieldCheck } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { MembershipRole } from '@/app/lib/supabase/access'

interface AppTopbarProps {
  onMenu: () => void
  role?: MembershipRole | null
  userDisplayName?: string | null
}

interface SearchResult {
  id: string
  kind: 'resident' | 'task' | 'incident' | 'shift_report'
  title: string
  subtitle: string
  href: string
}

interface AlertItem {
  id: string
  kind: 'task' | 'incident' | 'medication_alert'
  title: string
  subtitle: string
  href: string
}

interface ResidentAlertItem {
  id: string
  kind: 'resident'
  title: string
  subtitle: string
  href: string
}

const SEARCH_KIND_LABELS: Record<SearchResult['kind'], string> = {
  resident: 'Resident',
  task: 'Task queue',
  incident: 'Incident',
  shift_report: 'Shift report',
}

const ALERT_KIND_LABELS: Record<AlertItem['kind'], string> = {
  task: 'Overdue task',
  incident: 'Open incident',
  medication_alert: 'Medication alert',
}

const SEARCH_INPUT_CLASSES =
  'h-12 w-full rounded-2xl border border-white/10 bg-background/80 pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/25 placeholder:text-muted-foreground [font-family:var(--font-v0-sans,var(--font-geist-sans),system-ui,sans-serif)]'

export function AppTopbar({ onMenu, role = null, userDisplayName = null }: AppTopbarProps) {
  const alertsPanelRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const roleLabel = formatRoleLabel(role)
  const badgeLabel = role ? roleLabel : 'Workspace'
  const secondaryLabel = formatSecondaryLabel(role)
  const userLabel = userDisplayName?.trim() || 'Signed-in user'
  const initials = getInitials(userLabel)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [residentAlerts, setResidentAlerts] = useState<ResidentAlertItem[]>([])
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [alertsError, setAlertsError] = useState('')
  const alertsBadgeCount = alerts.length + residentAlerts.length
  const alertsFetchingRef = useRef(false)

  useEffect(() => {
    if (!searchOpen) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim())
    }, 220)

    return () => window.clearTimeout(timeoutId)
  }, [searchOpen, searchQuery])

  useEffect(() => {
    if (!searchOpen || debouncedSearchQuery.length < 2) {
      return
    }

    const controller = new AbortController()

    async function loadSearchResults() {
      setSearchLoading(true)
      setSearchError('')

      try {
        const response = await fetch(`/api/chrome/search?q=${encodeURIComponent(debouncedSearchQuery)}`, {
          signal: controller.signal,
          cache: 'no-store',
        })
        const payload = (await response.json()) as { error?: string; results?: SearchResult[] }

        if (!response.ok) {
          throw new Error(payload.error || 'Unable to search right now.')
        }

        setSearchResults(Array.isArray(payload.results) ? payload.results : [])
      } catch (error) {
        if (controller.signal.aborted) {
          return
        }

        setSearchResults([])
        setSearchError(error instanceof Error ? error.message : 'Unable to search right now.')
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false)
        }
      }
    }

    loadSearchResults()

    return () => controller.abort()
  }, [debouncedSearchQuery, searchOpen])

  useEffect(() => {
    if (!searchOpen) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
    }, 30)

    return () => window.clearTimeout(timeoutId)
  }, [searchOpen])

  useEffect(() => {
    const controller = new AbortController()

    async function loadAlerts() {
      alertsFetchingRef.current = true
      setAlertsLoading(true)
      setAlertsError('')

      try {
        const response = await fetch('/api/chrome/alerts', {
          signal: controller.signal,
          cache: 'no-store',
        })
        const payload = (await response.json()) as {
          error?: string
          items?: AlertItem[]
          residents?: ResidentAlertItem[]
        }

        if (!response.ok) {
          throw new Error(payload.error || 'Unable to load alerts right now.')
        }

        setAlerts(Array.isArray(payload.items) ? payload.items : [])
        setResidentAlerts(Array.isArray(payload.residents) ? payload.residents : [])
      } catch (error) {
        if (controller.signal.aborted) {
          return
        }

        setAlerts([])
        setResidentAlerts([])
        setAlertsError(error instanceof Error ? error.message : 'Unable to load alerts right now.')
      } finally {
        alertsFetchingRef.current = false

        if (!controller.signal.aborted) {
          setAlertsLoading(false)
        }
      }
    }

    loadAlerts()

    return () => controller.abort()
    // Fetch once when the persistent topbar mounts so the bell badge reflects
    // real state without re-fetching on every client-side route transition.
  }, [])

  useEffect(() => {
    if (!alertsOpen || alertsFetchingRef.current) {
      return
    }

    const controller = new AbortController()

    async function refreshAlerts() {
      alertsFetchingRef.current = true
      setAlertsLoading(true)
      setAlertsError('')

      try {
        const response = await fetch('/api/chrome/alerts', {
          signal: controller.signal,
          cache: 'no-store',
        })
        const payload = (await response.json()) as {
          error?: string
          items?: AlertItem[]
          residents?: ResidentAlertItem[]
        }

        if (!response.ok) {
          throw new Error(payload.error || 'Unable to load alerts right now.')
        }

        setAlerts(Array.isArray(payload.items) ? payload.items : [])
        setResidentAlerts(Array.isArray(payload.residents) ? payload.residents : [])
      } catch (error) {
        if (controller.signal.aborted) {
          return
        }

        setAlerts([])
        setResidentAlerts([])
        setAlertsError(error instanceof Error ? error.message : 'Unable to load alerts right now.')
      } finally {
        alertsFetchingRef.current = false

        if (!controller.signal.aborted) {
          setAlertsLoading(false)
        }
      }
    }

    refreshAlerts()

    return () => controller.abort()
    // Refresh on open (user-initiated, not a route transition) so stale
    // badge data updates once the caregiver actually checks the bell,
    // unless a fetch triggered by the mount effect is already in flight.
  }, [alertsOpen])

  useEffect(() => {
    if (!alertsOpen) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      if (!alertsPanelRef.current?.contains(event.target as Node)) {
        setAlertsOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAlertsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [alertsOpen])

  useEffect(() => {
    function handleKeyboardShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        handleSearchOpenChange(true)
      }
    }

    document.addEventListener('keydown', handleKeyboardShortcut)
    return () => document.removeEventListener('keydown', handleKeyboardShortcut)
  }, [])

  const groupedSearchResults = useMemo(() => {
    const groups = new Map<SearchResult['kind'], SearchResult[]>()

    for (const result of searchResults) {
      const current = groups.get(result.kind) ?? []
      current.push(result)
      groups.set(result.kind, current)
    }

    return Array.from(groups.entries())
  }, [searchResults])

  function handleSearchOpenChange(nextOpen: boolean) {
    setSearchOpen(nextOpen)

    if (!nextOpen) {
      setSearchQuery('')
      setDebouncedSearchQuery('')
      setSearchResults([])
      setSearchError('')
      setSearchLoading(false)
    }
  }

  function handleSearchOpen() {
    handleSearchOpenChange(true)
  }

  function handleSearchLinkClick() {
    handleSearchOpenChange(false)
  }

  function handleAlertsLinkClick() {
    setAlertsOpen(false)
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-md md:px-6">
        <button
          type="button"
          onClick={onMenu}
          className="rounded-lg p-2 text-foreground hover:bg-accent lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </button>

        <button
          type="button"
          onClick={handleSearchOpen}
          className="group hidden h-10 max-w-md flex-1 items-center rounded-xl border border-border bg-card/90 px-3 text-left text-sm text-muted-foreground transition hover:border-white/15 hover:bg-accent sm:flex"
          aria-label="Open search"
        >
          <Search className="mr-2.5 size-4 text-muted-foreground transition group-hover:text-foreground" />
          <span className="truncate">Search residents, tasks, incidents, shift reports...</span>
          <span className="ml-auto rounded-lg border border-white/10 bg-background/70 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Ctrl K
          </span>
        </button>

        <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleSearchOpen}
            className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-card/90 text-foreground transition hover:bg-accent sm:hidden"
            aria-label="Open search"
          >
            <Search className="size-[18px]" />
          </button>

          <Badge className="gap-1.5 rounded-full border-transparent bg-accent px-3 py-1.5 text-accent-foreground hover:bg-accent">
            <ShieldCheck className="size-3.5" />
            {badgeLabel}
          </Badge>

          <div ref={alertsPanelRef} className="relative">
            <button
              type="button"
              onClick={() => setAlertsOpen((open) => !open)}
              className="relative rounded-xl border border-border bg-card p-2.5 text-foreground transition-colors hover:bg-accent"
              aria-label={
                alertsBadgeCount > 0
                  ? `Alerts and recent resident additions, ${alertsBadgeCount} new`
                  : 'Alerts and recent resident additions'
              }
              aria-expanded={alertsOpen}
            >
              <Bell className="size-[18px]" />
              {alertsBadgeCount > 0 ? (
                <span
                  className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-semibold leading-none text-white ring-2 ring-card"
                  aria-hidden="true"
                >
                  {alertsBadgeCount > 9 ? '9+' : alertsBadgeCount}
                </span>
              ) : null}
            </button>

            {alertsOpen ? (
              <div className="v0-dashboard-theme dark absolute right-0 top-[calc(100%+0.75rem)] z-40 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-white/10 bg-card/95 font-sans text-foreground shadow-[0_26px_90px_rgba(0,0,0,0.52)] ring-1 ring-black/20 backdrop-blur-xl anim-scale-in">
                <div className="border-b border-white/10 px-5 py-4">
                  <p className="text-sm font-semibold tracking-tight text-foreground">Alerts</p>
                  <p className="mt-1 text-xs text-muted-foreground">Real overdue items and recent resident additions.</p>
                </div>

                <div className="max-h-[26rem] overflow-y-auto px-3 py-3">
                  {alertsLoading ? (
                    <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-background/70 px-4 py-4 text-sm text-muted-foreground">
                      <LoaderCircle className="size-4 animate-spin" />
                      Loading alerts...
                    </div>
                  ) : alertsError ? (
                    <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                      {alertsError}
                    </div>
                  ) : alerts.length === 0 && residentAlerts.length === 0 ? (
                    <div className="rounded-2xl border border-white/8 bg-background/70 px-4 py-5 text-sm text-muted-foreground">
                      No active alerts.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {alerts.length > 0 ? (
                        <div>
                          <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Operational alerts
                          </p>
                          <div className="space-y-2">
                            {alerts.map((alert) => (
                              <Link
                                key={`${alert.kind}:${alert.id}`}
                                href={alert.href}
                                onClick={handleAlertsLinkClick}
                                className="block rounded-2xl border border-white/8 bg-background/70 px-4 py-3 transition hover:border-white/14 hover:bg-accent/70"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                      {ALERT_KIND_LABELS[alert.kind]}
                                    </p>
                                    <p className="mt-1 line-clamp-1 text-sm font-semibold text-foreground">{alert.title}</p>
                                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{alert.subtitle}</p>
                                  </div>
                                  <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {residentAlerts.length > 0 ? (
                        <div>
                          <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            New residents
                          </p>
                          <div className="space-y-2">
                            {residentAlerts.map((resident) => (
                              <Link
                                key={`resident:${resident.id}`}
                                href={resident.href}
                                onClick={handleAlertsLinkClick}
                                className="block rounded-2xl border border-white/8 bg-background/70 px-4 py-3 transition hover:border-white/14 hover:bg-accent/70"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="mt-1 line-clamp-1 text-sm font-semibold text-foreground">{resident.title}</p>
                                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{resident.subtitle}</p>
                                  </div>
                                  <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <Link
            href="/account"
            className="flex items-center gap-2.5 rounded-xl border border-border bg-card py-1 pl-1 pr-3 transition-colors hover:bg-accent"
            aria-label="Open account settings"
          >
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden leading-tight md:block">
              <p className="text-sm font-medium text-foreground">{userLabel}</p>
              <p className="text-xs text-muted-foreground">{secondaryLabel}</p>
            </div>
          </Link>
        </div>
      </header>

      <Dialog open={searchOpen} onOpenChange={handleSearchOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="v0-dashboard-theme dark max-w-3xl gap-0 overflow-hidden border-white/10 bg-card/95 p-0 font-sans text-foreground shadow-[0_28px_90px_rgba(0,0,0,0.58)]"
        >
          <div className="border-b border-white/10 px-5 py-5">
            <DialogTitle className="font-sans text-xl font-semibold tracking-tight text-foreground [font-family:var(--font-v0-sans,var(--font-geist-sans),system-ui,sans-serif)]">
              Search KingdomCare OS
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground [font-family:var(--font-v0-sans,var(--font-geist-sans),system-ui,sans-serif)]">
              Search real residents, open tasks, incidents, and shift reports for your current care home.
            </DialogDescription>
          </div>

          <div className="px-5 py-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className={SEARCH_INPUT_CLASSES}
                placeholder="Search by resident name, task title, incident summary, shift report..."
                type="search"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="max-h-[26rem] overflow-y-auto border-t border-white/10 bg-background/35 px-5 py-4">
            {searchQuery.trim().length < 2 ? (
              <div className="rounded-2xl border border-dashed border-white/12 bg-background/65 px-4 py-5 text-sm text-muted-foreground">
                Type at least 2 characters to search your care home data.
              </div>
            ) : searchLoading ? (
              <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-background/65 px-4 py-4 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Searching live records...
              </div>
            ) : searchError ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {searchError}
              </div>
            ) : searchResults.length === 0 ? (
              <div className="rounded-2xl border border-white/8 bg-background/65 px-4 py-5 text-sm text-muted-foreground">
                No matching residents, tasks, incidents, or shift reports found.
              </div>
            ) : (
              <div className="space-y-5">
                {groupedSearchResults.map(([kind, results]) => (
                  <section key={kind}>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      {SEARCH_KIND_LABELS[kind]}
                    </p>
                    <div className="space-y-2">
                      {results.map((result) => (
                        <Link
                          key={`${result.kind}:${result.id}`}
                          href={result.href}
                          onClick={handleSearchLinkClick}
                          className="block rounded-2xl border border-white/8 bg-background/70 px-4 py-3 transition hover:border-white/14 hover:bg-accent/70"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="line-clamp-1 text-sm font-semibold text-foreground">{result.title}</p>
                              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                {result.subtitle}
                              </p>
                            </div>
                            <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function formatRoleLabel(role: MembershipRole | null) {
  if (role === 'admin') return 'Admin'
  if (role === 'nurse') return 'Nurse'
  if (role === 'caregiver') return 'Caregiver'
  return 'Workspace access'
}

function formatSecondaryLabel(role: MembershipRole | null) {
  if (role === 'admin') return 'Owner/Admin'
  if (role === 'nurse' || role === 'caregiver') return 'Care Team'
  return 'Workspace access'
}

function getInitials(value: string) {
  const parts = value
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) {
    return 'KC'
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}
