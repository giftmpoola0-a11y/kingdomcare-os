import { NextResponse } from 'next/server'
import { buildMedicationAlarmsPayload } from '@/app/lib/chrome-medication-alarms'
import { measureServerStep } from '@/app/lib/perf'
import { getCurrentRequestSupabaseAccess } from '@/app/lib/supabase/request-context'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { supabase, access } = await measureServerStep(
      'api:/api/chrome/medication-alarms:access',
      () => getCurrentRequestSupabaseAccess()
    )

    if (!access.isSignedIn) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    if (!access.careHomeId || !access.role) {
      return NextResponse.json({ error: 'Care home membership required.' }, { status: 403 })
    }

    return NextResponse.json(
      await measureServerStep(
        'api:/api/chrome/medication-alarms:GET',
        () => buildMedicationAlarmsPayload(supabase, access),
        { role: access.role }
      )
    )
  } catch (error) {
    console.error('Medication alarms fetch failed:', error)
    return NextResponse.json({ error: 'Unable to load medication alarms right now.' }, { status: 500 })
  }
}
