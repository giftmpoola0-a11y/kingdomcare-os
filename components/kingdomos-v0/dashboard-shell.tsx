"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/kingdomos-v0/app-sidebar"
import { AppTopbar } from "@/components/kingdomos-v0/app-topbar"
import { WelcomeHeader } from "@/components/kingdomos-v0/dashboard/welcome-header"
import { KpiCards } from "@/components/kingdomos-v0/dashboard/kpi-cards"
import { TodayGlance, type DashboardOperationalQueueItem } from "@/components/kingdomos-v0/dashboard/today-glance"
import { CareAttention, type DashboardCareAttentionItem } from "@/components/kingdomos-v0/dashboard/care-attention"
import { CareTeam, type DashboardCareTeamMember } from "@/components/kingdomos-v0/dashboard/staff-on-duty"
import { RecentActivity, type DashboardRecentActivityItem } from "@/components/kingdomos-v0/dashboard/recent-activity"
import { RecentShiftReports } from "@/components/kingdomos-v0/dashboard/recent-shift-reports"
import type { SidebarBadgeCounts } from "@/app/lib/sidebar-badge-counts"
import type { MembershipRole } from "@/app/lib/supabase/access"
import type { ShiftReportRecord } from "@/app/lib/supabase/shiftReports"

interface DashboardShellProps {
  roleLabel?: string
  role?: MembershipRole | null
  userDisplayName?: string
  careHomeName?: string
  activeResidentsCount?: number
  openTasksCount?: number
  overdueTasksCount?: number
  openIncidentsCount?: number
  recentActivityItems?: DashboardRecentActivityItem[]
  careAttentionItems?: DashboardCareAttentionItem[]
  operationalQueueItems?: DashboardOperationalQueueItem[]
  careTeamMembers?: DashboardCareTeamMember[]
  recentShiftReports?: ShiftReportRecord[]
  sidebarBadgeCounts?: SidebarBadgeCounts
}

export function DashboardShell({
  roleLabel,
  role,
  userDisplayName,
  careHomeName,
  activeResidentsCount,
  openTasksCount,
  overdueTasksCount,
  openIncidentsCount,
  recentActivityItems,
  careAttentionItems,
  operationalQueueItems,
  careTeamMembers,
  recentShiftReports,
  sidebarBadgeCounts,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        badgeCounts={sidebarBadgeCounts}
        role={role}
        careHomeName={careHomeName}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar onMenu={() => setSidebarOpen(true)} role={role} userDisplayName={userDisplayName} />

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 lg:py-8">
          <WelcomeHeader roleLabel={roleLabel} />

          <div className="mt-7">
            <KpiCards
              activeResidentsCount={activeResidentsCount}
              openTasksCount={openTasksCount}
              overdueTasksCount={overdueTasksCount}
              openIncidentsCount={openIncidentsCount}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-6 lg:col-span-2">
              <TodayGlance items={operationalQueueItems} />
              <CareAttention items={careAttentionItems} />
            </div>

            <div className="flex flex-col gap-6">
              <RecentShiftReports reports={recentShiftReports} />
              <RecentActivity items={recentActivityItems} />
              <CareTeam members={careTeamMembers} />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
