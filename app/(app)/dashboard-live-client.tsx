'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import type { DashboardSnapshot } from '@/app/lib/dashboard/snapshot'
import {
  CHROME_DATA_REFRESH_EVENT,
  type ChromeDataRefreshDetail,
  type ChromeDataRefreshSource,
} from '@/app/lib/chrome-realtime'
import { DashboardShell } from '@/components/kingdomos-v0/dashboard-shell'
import { TodayGlance } from '@/components/kingdomos-v0/dashboard/today-glance'
import { CareAttention } from '@/components/kingdomos-v0/dashboard/care-attention'
import { RecentShiftReports } from '@/components/kingdomos-v0/dashboard/recent-shift-reports'
import { RecentActivity } from '@/components/kingdomos-v0/dashboard/recent-activity'
import { CareTeam } from '@/components/kingdomos-v0/dashboard/staff-on-duty'
import { useAuthenticatedAppChrome } from '@/components/kingdomos-v0/authenticated-app-shell'

const DASHBOARD_REFRESH_DEBOUNCE_MS = 450
const DASHBOARD_REFRESH_SOURCES = new Set<ChromeDataRefreshSource>([
  'tasks',
  'incidents',
  'medication-alerts',
  'shift-reports',
  'residents',
])

export function DashboardLiveClient({
  roleLabel,
  initialSnapshot,
}: {
  roleLabel: string
  initialSnapshot: DashboardSnapshot
}) {
  const pathname = usePathname()
  const { badgeCounts } = useAuthenticatedAppChrome()
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const timerRef = useRef<number | null>(null)
  const isFetchingRef = useRef(false)
  const queuedRefreshRef = useRef(false)
  const previousBadgeSignatureRef = useRef<string | null>(null)



  useEffect(() => {
    ;(window as Window & {
      __kcDashboardLive?: { mounted: boolean; refreshes: number; lastOpenTasksCount: number; lastFetchedAt: string }
    }).__kcDashboardLive = {
      mounted: true,
      refreshes: 0,
      lastOpenTasksCount: initialSnapshot.openTasksCount,
      lastFetchedAt: initialSnapshot.fetchedAt,
    }

    return () => {
      delete (window as Window & { __kcDashboardLive?: unknown }).__kcDashboardLive
    }
  }, [initialSnapshot.fetchedAt, initialSnapshot.openTasksCount])

  const debugLog = useCallback((message: string, detail?: unknown) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[dashboard-live] ${message}`, detail ?? '')
    }
  }, [])

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const fetchSnapshot = useCallback(async () => {
    if (pathname !== '/') {
      return
    }

    if (isFetchingRef.current) {
      queuedRefreshRef.current = true
      return
    }

    isFetchingRef.current = true
    debugLog('fetch snapshot:start')

    try {
      const response = await fetch('/api/dashboard/snapshot', {
        cache: 'no-store',
        headers: {
          'x-kingdomcare-dashboard-snapshot': '1',
        },
      })

      if (!response.ok) {
        throw new Error(`Snapshot request failed with ${response.status}`)
      }

      const nextSnapshot = (await response.json()) as DashboardSnapshot

      debugLog('fetch snapshot:success', {
        activeResidentsCount: nextSnapshot.activeResidentsCount,
        openTasksCount: nextSnapshot.openTasksCount,
        openIncidentsCount: nextSnapshot.openIncidentsCount,
      })
      ;(window as Window & {
        __kcDashboardLive?: { mounted: boolean; refreshes: number; lastOpenTasksCount: number; lastFetchedAt: string }
      }).__kcDashboardLive = {
        mounted: true,
        refreshes: ((window as Window & { __kcDashboardLive?: { refreshes: number } }).__kcDashboardLive?.refreshes ?? 0) + 1,
        lastOpenTasksCount: nextSnapshot.openTasksCount,
        lastFetchedAt: nextSnapshot.fetchedAt,
      }
      setSnapshot(nextSnapshot)
    } catch (error) {
      console.error('Failed to refresh dashboard snapshot:', error)
    } finally {
      isFetchingRef.current = false

      if (queuedRefreshRef.current) {
        queuedRefreshRef.current = false
        void fetchSnapshot()
      }
    }
  }, [debugLog, pathname])

  const clearScheduledRefresh = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const scheduleSnapshotRefresh = useCallback(
    (immediate = false) => {
      if (pathname !== '/') {
        return
      }

      clearScheduledRefresh()

      if (immediate) {
        void fetchSnapshot()
        return
      }

      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        void fetchSnapshot()
      }, DASHBOARD_REFRESH_DEBOUNCE_MS)
    },
    [clearScheduledRefresh, fetchSnapshot, pathname],
  )

  useEffect(() => {
    function handleChromeRefresh(event: Event) {
      const detail = (event as CustomEvent<ChromeDataRefreshDetail>).detail

      if (!detail || !DASHBOARD_REFRESH_SOURCES.has(detail.source)) {
        return
      }

      debugLog('event received', detail)
      scheduleSnapshotRefresh()
    }

    window.addEventListener(CHROME_DATA_REFRESH_EVENT, handleChromeRefresh)

    return () => {
      clearScheduledRefresh()
      window.removeEventListener(CHROME_DATA_REFRESH_EVENT, handleChromeRefresh)
    }
  }, [clearScheduledRefresh, debugLog, scheduleSnapshotRefresh])

  useEffect(() => {
    if (pathname !== '/') {
      return
    }

    const intervalId = window.setInterval(() => {
      debugLog('poll refresh')
      scheduleSnapshotRefresh(true)
    }, 5000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [debugLog, pathname, scheduleSnapshotRefresh])

  const badgeSignature = [
    badgeCounts.activeResidentsCount,
    badgeCounts.openTasksCount,
    badgeCounts.medicationAlertsCount,
    badgeCounts.recentIncidentsCount,
  ].join(':')

  useEffect(() => {
    if (pathname !== '/') {
      previousBadgeSignatureRef.current = badgeSignature
      return
    }

    if (previousBadgeSignatureRef.current === null) {
      previousBadgeSignatureRef.current = badgeSignature
      return
    }

    if (previousBadgeSignatureRef.current !== badgeSignature) {
      previousBadgeSignatureRef.current = badgeSignature
      debugLog('badge counts changed', badgeSignature)
      scheduleSnapshotRefresh(true)
    }
  }, [badgeSignature, debugLog, pathname, scheduleSnapshotRefresh])

  return (
    <div className="bg-background font-sans antialiased">
      <div className="v0-dashboard-theme dark">
        <DashboardShell
          roleLabel={roleLabel}
          activeResidentsCount={snapshot.activeResidentsCount}
          openTasksCount={snapshot.openTasksCount}
          overdueTasksCount={snapshot.overdueTasksCount}
          openIncidentsCount={snapshot.openIncidentsCount}
          dashboardContent={
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="flex flex-col gap-6 lg:col-span-2">
                <TodayGlance items={snapshot.operationalQueueItems} />
                <CareAttention items={snapshot.careAttentionItems} />
              </div>

              <div className="flex flex-col gap-6">
                <RecentShiftReports reports={snapshot.recentShiftReports} />
                <RecentActivity items={snapshot.recentActivityItems} />
                <CareTeam members={snapshot.careTeamMembers} />
              </div>
            </div>
          }
        />
      </div>
    </div>
  )
}
