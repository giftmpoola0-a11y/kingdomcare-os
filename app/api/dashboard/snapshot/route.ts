import { NextResponse } from 'next/server'
import { loadDashboardSnapshot } from '@/app/lib/dashboard/snapshot'
import { getCurrentRequestSupabaseAccess } from '@/app/lib/supabase/request-context'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { supabase, access } = await getCurrentRequestSupabaseAccess()

  if (!access.isSignedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!access.hasCareHome || !access.membership || !access.careHomeId) {
    return NextResponse.json({ error: 'Care home membership required' }, { status: 403 })
  }

  const snapshot = await loadDashboardSnapshot({
    supabase,
    careHomeId: access.careHomeId,
    role: access.membership.role ?? access.role ?? 'caregiver',
  })

  return NextResponse.json(snapshot, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
