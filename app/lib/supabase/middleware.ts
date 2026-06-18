import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'

export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse
  supabase: SupabaseClient | null
  user: User | null
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !publishableKey) {
    return {
      response: NextResponse.next({ request }),
      supabase: null,
      user: null,
    }
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { response, supabase, user }
}
