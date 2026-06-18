'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/app/components/ui/PageShell'
import PageHeader from '@/app/components/ui/PageHeader'
import SectionCard from '@/app/components/ui/SectionCard'
import StatusBadge from '@/app/components/ui/StatusBadge'
import { getSupabaseBrowserClient } from '@/app/lib/supabase/client'

type MembershipRole = 'admin' | 'nurse' | 'caregiver'

interface AccountState {
  userId: string
  email: string
  fullName: string
  membershipId: string | null
  careHomeId: string | null
  careHomeName: string
  role: MembershipRole | null
  adminCount: number
}

const INPUT_CLASS =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

const ROLE_BADGE_CLASSES: Record<MembershipRole, string> = {
  admin: 'bg-red-100 text-red-700',
  nurse: 'bg-blue-100 text-blue-700',
  caregiver: 'bg-emerald-100 text-emerald-700',
}

export default function AccountPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [account, setAccount] = useState<AccountState | null>(null)
  const [fullName, setFullName] = useState('')

  useEffect(() => {
    let active = true

    async function loadAccount() {
      try {
        const supabase = getSupabaseBrowserClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!active) return

        if (!user) {
          router.replace('/auth/sign-in')
          return
        }

        const [{ data: profile, error: profileError }, { data: membership, error: membershipError }] =
          await Promise.all([
            supabase
              .from('profiles')
              .select('full_name')
              .eq('id', user.id)
              .maybeSingle(),
            supabase
              .from('care_home_members')
              .select('id, care_home_id, role, care_homes(name)')
              .eq('user_id', user.id)
              .limit(1)
              .maybeSingle(),
          ])

        if (profileError) throw new Error(profileError.message)
        if (membershipError) throw new Error(membershipError.message)

        const role = normalizeRole(membership?.role)
        let adminCount = 0

        if (membership?.care_home_id) {
          const { count, error: countError } = await supabase
            .from('care_home_members')
            .select('id', { count: 'exact', head: true })
            .eq('care_home_id', membership.care_home_id)
            .eq('role', 'admin')

          if (countError) throw new Error(countError.message)
          adminCount = count ?? 0
        }

        const nextAccount: AccountState = {
          userId: user.id,
          email: user.email ?? '',
          fullName: profile?.full_name ?? '',
          membershipId: membership?.id ?? null,
          careHomeId: membership?.care_home_id ?? null,
          careHomeName:
            membership?.care_homes && typeof membership.care_homes === 'object' && 'name' in membership.care_homes
              ? String(membership.care_homes.name ?? '')
              : '',
          role,
          adminCount,
        }

        if (!active) return

        setAccount(nextAccount)
        setFullName(nextAccount.fullName)
      } catch (error) {
        if (!active) return
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load account settings.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadAccount()

    return () => {
      active = false
    }
  }, [router])

  const leaveBlockedMessage = useMemo(() => {
    if (!account?.role || !account.careHomeId) return ''
    if (account.role !== 'admin') return ''
    if (account.adminCount > 1) return ''
    return 'You are the only admin for this care home. Add another admin before leaving.'
  }, [account])

  const canLeaveCareHome = Boolean(
    account?.careHomeId &&
      account.role &&
      (account.role === 'nurse' ||
        account.role === 'caregiver' ||
        (account.role === 'admin' && account.adminCount > 1))
  )

  async function handleSaveProfile() {
    if (!account) return

    setSaving(true)
    setMessage('')
    setErrorMessage('')

    try {
      const supabase = getSupabaseBrowserClient()
      const trimmedName = fullName.trim()

      const { error } = await supabase.from('profiles').upsert(
        {
          id: account.userId,
          email: account.email,
          full_name: trimmedName,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

      if (error) throw new Error(error.message)

      setAccount((prev) => (prev ? { ...prev, fullName: trimmedName } : prev))
      setMessage('Profile updated successfully.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save profile.')
    } finally {
      setSaving(false)
    }
  }

  async function handleLeaveCareHome() {
    if (!account?.careHomeId || !canLeaveCareHome) return

    if (!window.confirm('Leave this care home? You will lose access to this workspace.')) {
      return
    }

    setLeaving(true)
    setMessage('')
    setErrorMessage('')

    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.rpc('leave_care_home_membership', {
        p_care_home_id: account.careHomeId,
      })

      if (error) throw new Error(error.message)

      router.replace('/onboarding')
      router.refresh()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to leave this care home.'

      if (message.includes('last_admin')) {
        setErrorMessage('You are the only admin for this care home. Add another admin before leaving.')
      } else {
        setErrorMessage(message)
      }
    } finally {
      setLeaving(false)
    }
  }

  if (loading) {
    return (
      <PageShell>
        <PageHeader
          eyebrow="Account"
          title="Account Settings"
          subtitle="Manage your profile and care home access."
          maxWidth="max-w-5xl"
        />
        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <SectionCard className="p-6">
            <p className="text-sm text-slate-500">Loading account settings...</p>
          </SectionCard>
        </main>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Account"
        title="Account Settings"
        subtitle="Manage your profile and care home access."
        maxWidth="max-w-5xl"
      />

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
        {(message || errorMessage) && (
          <SectionCard className="p-4">
            {message && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
                {message}
              </p>
            )}
            {errorMessage && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">
                {errorMessage}
              </p>
            )}
          </SectionCard>
        )}

        <SectionCard className="p-6">
          <h2 className="mb-5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Profile
          </h2>

          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="accountEmail" className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="accountEmail"
                type="email"
                value={account?.email ?? ''}
                readOnly
                className={`${INPUT_CLASS} cursor-not-allowed bg-slate-50 text-slate-500`}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="fullName" className="block text-sm font-medium text-slate-700">
                Full name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={INPUT_CLASS}
                autoComplete="name"
              />
            </div>

            <div className="border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving || !account}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 hover:shadow-md active:scale-[0.99] active:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </SectionCard>

        <SectionCard className="p-6">
          <h2 className="mb-5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Care Home Access
          </h2>

          {account?.careHomeId && account.role ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {account.careHomeName || 'Care home name unavailable'}
                </p>
                <p className="mt-1 text-xs text-slate-400">Current care home workspace</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  label={account.role}
                  colorClass={ROLE_BADGE_CLASSES[account.role]}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No care home access assigned yet.</p>
          )}
        </SectionCard>

        <SectionCard className="border-red-200 bg-red-50/30 p-6">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-red-500">
            Danger Zone
          </h2>

          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-slate-700">
              Leaving a care home removes your access, but historical records you created may
              remain for audit and continuity.
            </p>

            {leaveBlockedMessage && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800">
                {leaveBlockedMessage}
              </p>
            )}

            <button
              type="button"
              onClick={handleLeaveCareHome}
              disabled={!canLeaveCareHome || leaving}
              className="rounded-xl border border-red-300 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 shadow-sm transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
            >
              {leaving ? 'Leaving...' : 'Leave Care Home'}
            </button>
          </div>
        </SectionCard>
      </main>
    </PageShell>
  )
}

function normalizeRole(role: string | null | undefined): MembershipRole | null {
  return role === 'admin' || role === 'nurse' || role === 'caregiver' ? role : null
}
