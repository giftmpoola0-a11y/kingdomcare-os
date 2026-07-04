'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import AuthShell from '@/app/auth/AuthShell'
import { signUpAction } from '@/app/auth/actions'
import { getSupabaseBrowserClient } from '@/app/lib/supabase/client'

const INPUT_CLASS =
  'w-full rounded-2xl border border-white/10 bg-background/70 px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

export default function SignUpPage() {
  const router = useRouter()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
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
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    setSubmitting(true)
    setMessage('')
    setErrorMessage('')

    try {
      const result = await signUpAction({
        fullName,
        email,
        password,
      })

      if (!result.success) {
        setErrorMessage(result.error)
        return
      }

      if (!result.requiresEmailConfirmation) {
        router.replace('/')
        router.refresh()
        return
      }

      setMessage('Account created. Check your email to finish signing up.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign up.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      eyebrow="KingdomCare OS"
      title="Create your KingdomCare OS account"
      description="Set up your secure workspace access for care-home operations, reporting, and daily coordination."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/auth/sign-in" className="font-semibold text-primary transition-colors hover:text-primary/80">
            Sign in
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="fullName" className="block text-sm font-medium text-foreground">
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={INPUT_CLASS}
            autoComplete="name"
            placeholder="Your full name"
          />
        </div>

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

        <div className="grid gap-4 sm:grid-cols-2">
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
              autoComplete="new-password"
              placeholder="Create password"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={INPUT_CLASS}
              autoComplete="new-password"
              placeholder="Repeat password"
            />
          </div>
        </div>

        <div className="min-h-0 space-y-3">
          {errorMessage ? (
            <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200">
              {errorMessage}
            </p>
          ) : null}

          {message ? (
            <p className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200">
              {message}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_12px_30px_rgba(217,164,65,0.22)] transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Signing up...' : 'Sign up'}
        </button>
      </div>
    </AuthShell>
  )
}
