'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PageShell from '@/app/components/ui/PageShell'
import PageHeader from '@/app/components/ui/PageHeader'
import SectionCard from '@/app/components/ui/SectionCard'
import { getCurrentUserAccess } from '@/app/lib/supabase/access'
import { getSupabaseBrowserClient } from '@/app/lib/supabase/client'
import { createCareHomeAction } from './actions'

type PageStatus = 'loading' | 'needs-form'

const INPUT_CLASS =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

const PRIMARY_BTN =
  'w-full rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 hover:shadow-md active:scale-[0.99] active:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none'

export default function OnboardingPage() {
  const router = useRouter()
  const [status, setStatus] = useState<PageStatus>('loading')
  const [careHomeName, setCareHomeName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function checkAuth() {
      try {
        const supabase = getSupabaseBrowserClient()
        const access = await getCurrentUserAccess(supabase)

        if (!active) return

        if (!access.isSignedIn) {
          router.replace('/auth/sign-in?next=/onboarding')
          return
        }

        if (access.hasCareHome) {
          router.replace('/')
          return
        }

        setStatus('needs-form')
      } catch {
        // If the browser-side membership check fails, keep the page usable and
        // let the server action surface a real onboarding error.
        if (active) setStatus('needs-form')
      }
    }

    checkAuth()
    return () => {
      active = false
    }
  }, [router])

  async function handleSubmit() {
    if (!careHomeName.trim()) {
      setError('Please enter a care home name.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const result = await createCareHomeAction(careHomeName)
      if (!result.success) {
        setError(result.error)
        return
      }

      router.replace('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <PageShell>
        <PageHeader eyebrow="Setup" title="Care Home Setup" maxWidth="max-w-3xl" />
        <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          <SectionCard className="p-6">
            <p className="text-sm text-slate-400">Checking your account...</p>
          </SectionCard>
        </main>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Setup"
        title="Create Your Care Home"
        subtitle="Set up your care home to get started. You will be the admin."
        maxWidth="max-w-3xl"
      />

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <SectionCard className="p-6 sm:p-8">
          <div className="space-y-6">
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3.5">
              <p className="text-xs font-semibold leading-relaxed text-blue-800">
                You will be set up as the <strong>admin</strong> (owner / manager) of this care
                home. You can add nurses and caregivers after setup.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="careHomeName" className="block text-sm font-semibold text-slate-700">
                Care home name <span className="text-red-500">*</span>
              </label>
              <input
                id="careHomeName"
                type="text"
                value={careHomeName}
                onChange={(e) => {
                  setCareHomeName(e.target.value)
                  if (error) setError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit()
                }}
                placeholder="e.g. Sunrise Care Home"
                className={INPUT_CLASS}
                autoComplete="organization"
                disabled={submitting}
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700"
              >
                {error}
              </p>
            )}

            <div className="border-t border-slate-100 pt-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !careHomeName.trim()}
                className={PRIMARY_BTN}
              >
                {submitting ? 'Creating Care Home...' : 'Create Care Home'}
              </button>
            </div>

            <p className="text-center text-xs text-slate-400">
              Already have an account with a care home?{' '}
              <Link href="/auth/sign-in" className="font-semibold text-blue-600 hover:text-blue-700">
                Sign in instead
              </Link>
            </p>
          </div>
        </SectionCard>
      </main>
    </PageShell>
  )
}
