'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { DashboardShell } from '@/components/kingdomos-v0/dashboard-shell'
import { getSupabaseBrowserClient } from '@/app/lib/supabase/client'
import { getMyMembership } from '@/app/lib/supabase/careHomes'

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-v0-sans',
  subsets: ['latin'],
})

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    let active = true

    async function checkMembership() {
      try {
        const supabase = getSupabaseBrowserClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!active || !user) return

        const membership = await getMyMembership(supabase)
        if (active && membership === null) {
          router.replace('/onboarding')
        }
      } catch {
        // If Supabase is unavailable in the browser, keep the dashboard shell visible.
      }
    }

    checkMembership()
    return () => {
      active = false
    }
  }, [router])

  return (
    <div className={`${plusJakartaSans.variable} bg-background font-sans antialiased`}>
      <div className="v0-dashboard-theme dark">
        <DashboardShell />
      </div>
    </div>
  )
}
