import { NextResponse } from 'next/server'
import { measureServerStep } from '@/app/lib/perf'
import { getCurrentRequestSupabaseAccess } from '@/app/lib/supabase/request-context'
import { getCurrentCareHomeSidebarBadgeCounts } from '@/app/lib/supabase/sidebar-badge-counts'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { supabase, access } = await measureServerStep(
      'api:/api/chrome/sidebar-badge-counts:access',
      () => getCurrentRequestSupabaseAccess()
    )
    const badgeCounts = await measureServerStep(
      'api:/api/chrome/sidebar-badge-counts:GET',
      () => getCurrentCareHomeSidebarBadgeCounts(access, supabase),
      { role: access.role }
    )

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
