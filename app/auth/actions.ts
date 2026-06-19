'use server'

import { getSupabaseServerClient } from '@/app/lib/supabase/server'

export type AuthActionResult =
  | { success: true; requiresEmailConfirmation: boolean }
  | { success: false; error: string }

function normalizeAuthErrorMessage(message: string) {
  return message.toLowerCase() === 'fetch failed'
    ? 'Unable to reach the authentication service right now. Please try again in a moment.'
    : message
}

function toUserSafeAuthError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.toLowerCase() === 'fetch failed') {
    return normalizeAuthErrorMessage(error.message)
  }

  return error instanceof Error ? error.message : fallback
}

export async function signInAction(input: {
  email: string
  password: string
}): Promise<AuthActionResult> {
  const email = input.email.trim()

  if (!email || !input.password) {
    return { success: false, error: 'Email and password are required.' }
  }

  try {
    const supabase = await getSupabaseServerClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: input.password,
    })

    if (error) {
      return { success: false, error: normalizeAuthErrorMessage(error.message) }
    }

    return { success: true, requiresEmailConfirmation: false }
  } catch (error) {
    return {
      success: false,
      error: toUserSafeAuthError(error, 'Unable to sign in.'),
    }
  }
}

export async function signUpAction(input: {
  fullName: string
  email: string
  password: string
}): Promise<AuthActionResult> {
  const fullName = input.fullName.trim()
  const email = input.email.trim()

  if (!email || !input.password) {
    return { success: false, error: 'Email and password are required.' }
  }

  try {
    const supabase = await getSupabaseServerClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      return { success: false, error: normalizeAuthErrorMessage(error.message) }
    }

    return {
      success: true,
      requiresEmailConfirmation: !data.session,
    }
  } catch (error) {
    return {
      success: false,
      error: toUserSafeAuthError(error, 'Unable to sign up.'),
    }
  }
}
