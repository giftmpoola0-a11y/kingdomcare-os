import { NextResponse } from 'next/server'
import { getCurrentCareHomeSidebarBadgeCounts } from '@/app/lib/supabase/sidebar-badge-counts'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const badgeCounts = await getCurrentCareHomeSidebarBadgeCounts()
    return NextResponse.json(badgeCounts)
  } catch (error) {
    console.error('Failed to load sidebar badge counts route:', error)
    return NextResponse.json(
      {
        activeResidentsCount: 0,
        openTasksCount: 0,
        medicationAlertsCount: 0,
        recentIncidentsCount: 0,
      },
      { status: 200 },
    )
  }
}
