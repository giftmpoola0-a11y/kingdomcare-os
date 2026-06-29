"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/kingdomos-v0/app-sidebar"
import { AppTopbar } from "@/components/kingdomos-v0/app-topbar"
import { WelcomeHeader } from "@/components/kingdomos-v0/dashboard/welcome-header"
import { KpiCards } from "@/components/kingdomos-v0/dashboard/kpi-cards"
import { TodayGlance } from "@/components/kingdomos-v0/dashboard/today-glance"
import { CareAttention } from "@/components/kingdomos-v0/dashboard/care-attention"
import { StaffOnDuty } from "@/components/kingdomos-v0/dashboard/staff-on-duty"
import { RecentActivity } from "@/components/kingdomos-v0/dashboard/recent-activity"

interface DashboardShellProps {
  activeResidentsCount?: number
  openTasksCount?: number
  medicationAlertsCount?: number
  recentIncidentsCount?: number
}

export function DashboardShell({
  activeResidentsCount,
  openTasksCount,
  medicationAlertsCount,
  recentIncidentsCount,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        openTasksCount={openTasksCount}
        recentIncidentsCount={recentIncidentsCount}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar onMenu={() => setSidebarOpen(true)} />

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 lg:py-8">
          <WelcomeHeader />

          <div className="mt-7">
            <KpiCards
              activeResidentsCount={activeResidentsCount}
              openTasksCount={openTasksCount}
              medicationAlertsCount={medicationAlertsCount}
              recentIncidentsCount={recentIncidentsCount}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-6 lg:col-span-2">
              <TodayGlance />
              <CareAttention />
            </div>

            <div className="flex flex-col gap-6">
              <StaffOnDuty />
              <RecentActivity />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
