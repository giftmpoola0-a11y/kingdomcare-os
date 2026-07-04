'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import AuthShell from '@/app/auth/AuthShell'
import { signUpAction } from '@/app/auth/actions'
import { getSupabaseBrowserClient } from '@/app/lib/supabase/client'

const INPUT_CLASS =
  'h-11 w-full rounded-xl border border-input bg-white/5 px-3.5 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors focus:border-white/22 focus:ring-2 focus:ring-white/12'

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
          <Link href="/auth/sign-in" className="font-semibold text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fullName" className="text-sm font-medium text-foreground/90">
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

        <div className="grid gap-4 sm:grid-cols-2">
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
              autoComplete="new-password"
              placeholder="Create password"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground/90">
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

        {errorMessage ? (
          <p className="rounded-xl border border-red-400/18 bg-red-500/10 px-3.5 py-3 text-sm text-red-200">
            {errorMessage}
          </p>
        ) : null}

        {message ? (
          <p className="rounded-xl border border-white/10 bg-white/6 px-3.5 py-3 text-sm text-foreground/90">
            {message}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="mt-2 h-11 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-lg shadow-black/30 transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Signing up...' : 'Sign up'}
        </button>
      </div>
    </AuthShell>
  )
}
