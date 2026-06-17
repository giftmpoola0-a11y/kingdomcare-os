'use client'

import { useEffect, useState } from 'react'
import PageShell from '@/app/components/ui/PageShell'
import PageHeader from '@/app/components/ui/PageHeader'
import SectionCard from '@/app/components/ui/SectionCard'
import { getSupabaseBrowserClient } from '@/app/lib/supabase/client'

export default function SupabaseTestPage() {
  const [clientLoaded, setClientLoaded] = useState(false)
  const [connectionPassed, setConnectionPassed] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function runConnectionTest() {
      try {
        const supabase = getSupabaseBrowserClient()
        setClientLoaded(true)

        const { error } = await supabase.auth.getSession()
        if (error) {
          setErrorMessage(error.message)
          return
        }

        setConnectionPassed(true)
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unknown Supabase error.')
      }
    }

    runConnectionTest()
  }, [])

  return (
    <PageShell>
      <PageHeader
        eyebrow="Developer"
        title="Supabase Test"
        subtitle="Temporary connection check for local development only."
        maxWidth="max-w-3xl"
      />

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <SectionCard className="space-y-4 p-6">
          <p className="text-sm text-slate-600">
            This page checks whether the Supabase browser client can initialize and call
            `auth.getSession()` without error.
          </p>

          <div className="space-y-2">
            <StatusRow
              label="Client"
              value={clientLoaded ? 'Supabase client loaded' : 'Loading Supabase client...'}
              tone={clientLoaded ? 'success' : 'neutral'}
            />
            <StatusRow
              label="Connection"
              value={
                connectionPassed
                  ? 'Connection test passed'
                  : errorMessage
                    ? 'Connection test failed'
                    : 'Running connection test...'
              }
              tone={connectionPassed ? 'success' : errorMessage ? 'error' : 'neutral'}
            />
            {errorMessage && (
              <StatusRow label="Error" value={errorMessage} tone="error" />
            )}
          </div>
        </SectionCard>
      </main>
    </PageShell>
  )
}

function StatusRow({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'neutral' | 'success' | 'error'
}) {
  const toneClass = {
    neutral: 'border-slate-200 bg-slate-50 text-slate-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    error: 'border-red-200 bg-red-50 text-red-800',
  }[tone]

  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClass}`}>
      <p className="text-[11px] font-bold uppercase tracking-widest opacity-75">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}
