import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCurrentUserAccess } from '@/app/lib/supabase/access'
import { updateSession } from '@/app/lib/supabase/middleware'

const PUBLIC_AUTH_PATHS = ['/auth/sign-in', '/auth/sign-up']
const ONBOARDING_PATH = '/onboarding'

function isPublicAuthPath(pathname: string) {
  return PUBLIC_AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { response, supabase, user } = await updateSession(request)

  if (isPublicAuthPath(pathname)) {
    if (user) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    return response
  }

  if (!user) {
    const redirectUrl = new URL('/auth/sign-in', request.url)
    redirectUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (!supabase) {
    return response
  }

  const access = await getCurrentUserAccess(supabase, { user })

  if (!access.hasCareHome && pathname !== ONBOARDING_PATH) {
    return NextResponse.redirect(new URL(ONBOARDING_PATH, request.url))
  }

  if (access.hasCareHome && pathname === ONBOARDING_PATH) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/',
    '/residents/:path*',
    '/shifts/new',
    '/reports',
    '/incidents',
    '/medications',
    '/tasks',
    '/staff',
    '/account',
    '/onboarding',
    '/auth/:path*',
  ],
}
