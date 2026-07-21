'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { AppSidebar } from '@/components/kingdomos-v0/app-sidebar'
import { AppTopbar } from '@/components/kingdomos-v0/app-topbar'
import { MedicationAlarm } from '@/components/kingdomos-v0/medication-alarm'
import type { AppChromeProps } from '@/app/lib/app-chrome'
import { CHROME_DATA_REFRESH_EVENT, dispatchChromeDataRefresh } from '@/app/lib/chrome-realtime'
import { getSupabaseBrowserClient } from '@/app/lib/supabase/client'
import { EMPTY_SIDEBAR_BADGE_COUNTS, type SidebarBadgeCounts } from '@/app/lib/sidebar-badge-counts'

interface AuthenticatedAppChromeContextValue extends AppChromeProps {
  badgeCounts: SidebarBadgeCounts
}

const AuthenticatedAppChromeContext = createContext<AuthenticatedAppChromeContextValue | null>(null)

export function useAuthenticatedAppChrome() {
  const value = useContext(AuthenticatedAppChromeContext)

  if (!value) {
    throw new Error('useAuthenticatedAppChrome must be used within AuthenticatedAppShell.')
  }

  return value
}

interface AuthenticatedAppShellProps extends AppChromeProps {
  children: React.ReactNode
}

export function AuthenticatedAppShell({
  role,
  userDisplayName,
  careHomeName,
  careHomeId,
  children,
}: AuthenticatedAppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [badgeCounts, setBadgeCounts] = useState<SidebarBadgeCounts>(EMPTY_SIDEBAR_BADGE_COUNTS)
  const badgeCountsFetchingRef = useRef(false)

  useEffect(() => {
    let active = true

    async function loadBadgeCounts() {
      if (badgeCountsFetchingRef.current) {
        return
      }

      badgeCountsFetchingRef.current = true

      try {
        const response = await fetch('/api/chrome/sidebar-badge-counts', {
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error('Unable to load sidebar badge counts.')
        }

        const payload = (await response.json()) as Partial<SidebarBadgeCounts>

        if (!active) {
          return
        }

        setBadgeCounts((current) => ({
          activeResidentsCount:
            typeof payload.activeResidentsCount === 'number'
              ? payload.activeResidentsCount
              : current.activeResidentsCount,
          openTasksCount:
            typeof payload.openTasksCount === 'number'
              ? payload.openTasksCount
              : current.openTasksCount,
          medicationAlertsCount:
            typeof payload.medicationAlertsCount === 'number'
              ? payload.medicationAlertsCount
              : current.medicationAlertsCount,
          recentIncidentsCount:
            typeof payload.recentIncidentsCount === 'number'
              ? payload.recentIncidentsCount
              : current.recentIncidentsCount,
        }))
      } catch (error) {
        if (active) {
          console.error('Failed to load sidebar badge counts in app shell:', error)
        }
      } finally {
        badgeCountsFetchingRef.current = false
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') {
        return
      }

      void loadBadgeCounts()
    }

    function handleChromeRefresh() {
      void loadBadgeCounts()
    }

    void loadBadgeCounts()
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleVisibilityChange)
    window.addEventListener(CHROME_DATA_REFRESH_EVENT, handleChromeRefresh)

    return () => {
      active = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleVisibilityChange)
      window.removeEventListener(CHROME_DATA_REFRESH_EVENT, handleChromeRefresh)
    }
  }, [])

  useEffect(() => {
    if (!careHomeId) {
      return
    }

    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(`chrome-medication-alerts:${careHomeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'medication_alerts',
          filter: `care_home_id=eq.${careHomeId}`,
        },
        () => {
          dispatchChromeDataRefresh({ source: 'medication-alerts', careHomeId })
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'medication_alerts',
          filter: `care_home_id=eq.${careHomeId}`,
        },
        () => {
          dispatchChromeDataRefresh({ source: 'medication-alerts', careHomeId })
        },
      )

    void channel.subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [careHomeId])

  return (
    <AuthenticatedAppChromeContext.Provider
      value={{ role, userDisplayName, careHomeName, careHomeId, badgeCounts }}
    >
      <div className="flex min-h-screen bg-background">
        <AppSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          badgeCounts={badgeCounts}
          role={role}
          careHomeName={careHomeName}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopbar onMenu={() => setSidebarOpen(true)} role={role} userDisplayName={userDisplayName} />
          {children}
        </div>
      </div>
      <MedicationAlarm role={role} />
    </AuthenticatedAppChromeContext.Provider>
  )
}
