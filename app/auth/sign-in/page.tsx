'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import AuthShell from '@/app/auth/AuthShell'
import { signInAction } from '@/app/auth/actions'
import { getSupabaseBrowserClient } from '@/app/lib/supabase/client'

const INPUT_CLASS =
  'w-full rounded-2xl border border-white/10 bg-background/70 px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

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
          <Link href="/auth/sign-up" className="font-semibold text-primary transition-colors hover:text-primary/80">
            Sign up
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
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

        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-foreground">
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

        <div className="min-h-0">
          {errorMessage ? (
            <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_12px_30px_rgba(217,164,65,0.22)] transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
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
      description="Loading the secure sign-in form..."
      footer={
        <>
          Need an account?{' '}
          <Link href="/auth/sign-up" className="font-semibold text-primary transition-colors hover:text-primary/80">
            Sign up
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        <div className="h-14 rounded-2xl border border-white/10 bg-background/60" />
        <div className="h-14 rounded-2xl border border-white/10 bg-background/60" />
        <div className="h-12 rounded-2xl bg-primary/70" />
      </div>
    </AuthShell>
  )
}
