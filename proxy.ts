import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from '@/app/lib/supabase/middleware'

const PUBLIC_AUTH_PATHS = ['/auth/sign-in', '/auth/sign-up']

function isPublicAuthPath(pathname: string) {
  return PUBLIC_AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { response, user } = await updateSession(request)

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
    '/account',
    '/auth/:path*',
  ],
}
