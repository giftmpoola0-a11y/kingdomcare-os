'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import AuthShell from '@/app/auth/AuthShell'
import { signInAction } from '@/app/auth/actions'
import { getSupabaseBrowserClient } from '@/app/lib/supabase/client'

const INPUT_CLASS =
  'h-11 w-full rounded-xl border border-input bg-white/[0.04] px-3.5 text-sm text-foreground placeholder:text-white/32 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition-[border-color,box-shadow,background-color] duration-200 hover:border-white/14 focus:border-white/20 focus:bg-white/[0.06] focus:ring-4 focus:ring-white/7'

const LINK_CLASS = 'font-semibold text-foreground/88 underline-offset-4 transition-all duration-200 hover:text-foreground hover:underline hover:opacity-80'
const BUTTON_CLASS =
  'mt-2 h-11 w-full rounded-xl bg-primary text-base font-semibold tracking-[-0.01em] text-primary-foreground shadow-[0_14px_32px_rgba(0,0,0,0.28)] transition-all duration-200 hover:-translate-y-px hover:bg-white hover:shadow-[0_18px_38px_rgba(0,0,0,0.34)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60'

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
          <Link href="/auth/sign-up" className={LINK_CLASS}>
            Sign up
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground/92">
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
          <label htmlFor="password" className="text-sm font-medium text-foreground/92">
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

        <button type="button" onClick={handleSubmit} disabled={submitting} className={BUTTON_CLASS}>
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
          <Link href="/auth/sign-up" className={LINK_CLASS}>
            Sign up
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="h-11 rounded-xl border border-input bg-white/[0.04]" />
        <div className="h-11 rounded-xl border border-input bg-white/[0.04]" />
        <div className="mt-2 h-11 rounded-xl bg-primary shadow-[0_14px_32px_rgba(0,0,0,0.28)]" />
      </div>
    </AuthShell>
  )
}
