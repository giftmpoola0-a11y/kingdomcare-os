'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import AuthShell from '@/app/auth/AuthShell'
import { signInAction } from '@/app/auth/actions'
import { getSupabaseBrowserClient } from '@/app/lib/supabase/client'

const INPUT_CLASS =
  'h-11 w-full rounded-xl border border-input bg-white/5 px-3.5 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors focus:border-white/22 focus:ring-2 focus:ring-white/12'

function SignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true

    async function checkSession() {
      try {
        const supabase = getSupabaseBrowserClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (active && session) {
          router.replace('/')
        }
      } catch {
        // Ignore env or connection issues here and let submit flow show real errors.
      }
    }

    checkSession()

    return () => {
      active = false
    }
  }, [router])

  async function handleSubmit() {
    setSubmitting(true)
    setErrorMessage('')

    try {
      const result = await signInAction({
        email,
        password,
      })

      if (!result.success) {
        setErrorMessage(result.error)
        return
      }

      router.replace(nextPath)
      router.refresh()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      eyebrow="KingdomCare OS"
      title="Sign in to KingdomCare OS"
      description="Access the care-home workspace for residents, tasks, incidents, medications, and shift reporting."
      footer={
        <>
          Need an account?{' '}
          <Link href="/auth/sign-up" className="font-semibold text-foreground underline-offset-4 hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground/90">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT_CLASS}
            autoComplete="email"
            placeholder="name@carehome.com"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-foreground/90">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT_CLASS}
            autoComplete="current-password"
            placeholder="Enter your password"
          />
        </div>

        {errorMessage ? (
          <p className="rounded-xl border border-red-400/18 bg-red-500/10 px-3.5 py-3 text-sm text-red-200">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="mt-2 h-11 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-lg shadow-black/30 transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </div>
    </AuthShell>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInContent />
    </Suspense>
  )
}

function SignInFallback() {
  return (
    <AuthShell
      eyebrow="KingdomCare OS"
      title="Sign in to KingdomCare OS"
      description="Access the care-home workspace for residents, tasks, incidents, medications, and shift reporting."
      footer={
        <>
          Need an account?{' '}
          <Link href="/auth/sign-up" className="font-semibold text-foreground underline-offset-4 hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="h-11 rounded-xl border border-input bg-white/5" />
        <div className="h-11 rounded-xl border border-input bg-white/5" />
        <div className="mt-2 h-11 rounded-xl bg-primary shadow-lg shadow-black/30" />
      </div>
    </AuthShell>
  )
}
