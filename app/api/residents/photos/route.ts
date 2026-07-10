import { NextResponse } from 'next/server'
import { measureServerStep } from '@/app/lib/perf'
import { getCurrentUserServerAccess } from '@/app/lib/supabase/server-access'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'
import type { TypedSupabaseClient } from '@/app/lib/supabase/shared'

const RESIDENT_PHOTO_SIGNED_URL_TTL_SECONDS = 60 * 60
const RESIDENT_PHOTOS_BUCKET = 'resident-photos'
const MAX_PHOTO_PATHS = 24

export async function POST(request: Request) {
  try {
    const supabase = (await getSupabaseServerClient()) as TypedSupabaseClient
    const access = await getCurrentUserServerAccess(supabase)

    if (!access.isSignedIn) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    if (!access.careHomeId || !access.role) {
      return NextResponse.json({ error: 'Care home membership required.' }, { status: 403 })
    }

    const payload = (await request.json().catch(() => null)) as {
      photoPaths?: unknown
    } | null

    const requestedPhotoPaths = Array.isArray(payload?.photoPaths)
      ? payload.photoPaths.filter((photoPath): photoPath is string => typeof photoPath === 'string' && photoPath.length > 0)
      : []

    const safePhotoPaths = Array.from(new Set(requestedPhotoPaths))
      .filter((photoPath) => photoPath.startsWith(`${access.careHomeId}/`))
      .slice(0, MAX_PHOTO_PATHS)

    if (safePhotoPaths.length === 0) {
      return NextResponse.json({ signedUrls: {} satisfies Record<string, string> })
    }

    const signedUrls = await measureServerStep(
      'api:/api/residents/photos',
      async () => {
        const { data, error } = await supabase.storage
          .from(RESIDENT_PHOTOS_BUCKET)
          .createSignedUrls(safePhotoPaths, RESIDENT_PHOTO_SIGNED_URL_TTL_SECONDS)

        if (error) {
          throw new Error(error.message)
        }

        return Object.fromEntries(
          safePhotoPaths.flatMap((photoPath, index) => {
            const signedUrl = data?.[index]?.signedUrl
            return typeof signedUrl === 'string' ? [[photoPath, signedUrl] as const] : []
          })
        )
      },
      {
        careHomeId: access.careHomeId,
        photoCount: safePhotoPaths.length,
      }
    )

    return NextResponse.json({ signedUrls })
  } catch (error) {
    console.error('Resident photo signing failed:', error)
    return NextResponse.json({ error: 'Unable to load resident photos right now.' }, { status: 500 })
  }
}
