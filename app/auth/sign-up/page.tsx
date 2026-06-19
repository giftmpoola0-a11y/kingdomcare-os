'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PageShell from '@/app/components/ui/PageShell'
import SectionCard from '@/app/components/ui/SectionCard'
import { signUpAction } from '@/app/auth/actions'
import { getSupabaseBrowserClient } from '@/app/lib/supabase/client'

const INPUT_CLASS =
  'w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

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
    <PageShell>
      <main className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-7xl items-center justify-center px-4 py-6 md:px-6 lg:py-8">
        <div className="w-full max-w-xl">
          <div className="mb-6 flex justify-center">
            <Image
              src="/brand/the-kingdom-care-homes-logo.png"
              alt="The Kingdom Care Homes"
              height={52}
              width={260}
              className="h-12 w-auto object-contain"
              priority
            />
          </div>

          <SectionCard className="rounded-2xl border-border bg-card p-6 shadow-sm backdrop-blur-none sm:p-7">
            <div className="space-y-6">
              <div className="space-y-3 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                  Authentication
                </p>
                <h1 className="font-heading text-3xl font-semibold text-foreground">
                  Sign Up
                </h1>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Create a Supabase account for KingdomCare OS.
                </p>
              </div>

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
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-foreground"
                    >
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

                {errorMessage && (
                  <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                    {errorMessage}
                  </p>
                )}

                {message && (
                  <p className="rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm font-medium text-success">
                    {message}
                  </p>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? 'Signing Up...' : 'Sign Up'}
                  </button>
                </div>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <Link href="/auth/sign-in" className="font-semibold text-primary hover:text-primary/80">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </SectionCard>
        </div>
      </main>
    </PageShell>
  )
}
