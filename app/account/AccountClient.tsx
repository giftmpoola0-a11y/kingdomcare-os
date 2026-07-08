'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { AppSidebar } from '@/components/kingdomos-v0/app-sidebar'
import { AppTopbar } from '@/components/kingdomos-v0/app-topbar'
import type { AppChromeProps } from '@/app/lib/app-chrome'
import type { SidebarBadgeCounts } from '@/app/lib/sidebar-badge-counts'
import { getCurrentUserAccess, type MembershipRole } from '@/app/lib/supabase/access'
import { getSupabaseBrowserClient } from '@/app/lib/supabase/client'

interface AccountState {
  userId: string
  email: string
  fullName: string
  careHomeName: string
  role: MembershipRole | null
}

interface AccountClientProps extends AppChromeProps {
  sidebarBadgeCounts: SidebarBadgeCounts
}

const INPUT_CLASS =
  'h-11 w-full rounded-xl border border-border bg-background/70 px-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60'

const ROLE_BADGE_CLASSES: Record<MembershipRole, string> = {
  admin: 'bg-rose-500/12 text-rose-200 ring-rose-400/20',
  nurse: 'bg-sky-500/12 text-sky-200 ring-sky-400/20',
  caregiver: 'bg-emerald-500/12 text-emerald-200 ring-emerald-400/20',
}

function formatRole(role: MembershipRole | null) {
  if (role === 'admin') return 'Admin'
  if (role === 'nurse') return 'Nurse'
  if (role === 'caregiver') return 'Caregiver'
  return 'Workspace access pending'
}

export default function AccountClient({
  role,
  userDisplayName,
  careHomeName,
  sidebarBadgeCounts,
}: AccountClientProps) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [account, setAccount] = useState<AccountState | null>(null)
  const [fullName, setFullName] = useState('')

  useEffect(() => {
    let active = true

    async function loadAccount() {
      try {
        const supabase = getSupabaseBrowserClient()
        const access = await getCurrentUserAccess(supabase)

        if (!active) return

        if (!access.isSignedIn) {
          router.replace('/auth/sign-in')
          return
        }

        if (!access.hasCareHome || !access.membership) {
          router.replace('/onboarding')
          return
        }

        const nextAccount: AccountState = {
          userId: access.user?.id ?? '',
          email: access.user?.email ?? access.profile?.email ?? '',
          fullName: access.profile?.fullName ?? '',
          careHomeName: access.membership.careHomeName,
          role: access.membership.role,
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

  async function handleSignOut() {
    setSigningOut(true)
    setMessage('')
    setErrorMessage('')

    try {
      const supabase = getSupabaseBrowserClient()
      await supabase.auth.signOut()
      router.replace('/auth/sign-in')
      router.refresh()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign out.')
      setSigningOut(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        badgeCounts={sidebarBadgeCounts}
        role={role}
        careHomeName={careHomeName}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar onMenu={() => setSidebarOpen(true)} role={role} userDisplayName={userDisplayName} />

        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 md:px-6 lg:py-8">
          <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-sky-500/12 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-sky-200 ring-1 ring-sky-400/20">
                <span className="inline-flex size-2 rounded-full bg-sky-400" aria-hidden="true" />
                Account
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                Account Settings
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Manage your profile and view your care home access.
              </p>
            </div>
          </section>

          {loading ? (
            <section className="mt-6 rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
              <p className="text-sm text-muted-foreground">Loading account settings...</p>
            </section>
          ) : (
            <>
              {(message || errorMessage) && (
                <p
                  role="alert"
                  className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-medium ${
                    errorMessage
                      ? 'border-rose-400/20 bg-rose-500/10 text-rose-200'
                      : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'
                  }`}
                >
                  {errorMessage || message}
                </p>
              )}

              <section className="mt-6 rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/25">
                    <UserRound className="size-5" />
                  </span>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Profile</h2>
                    <p className="text-sm text-muted-foreground">Your personal display details.</p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="accountEmail" className="block text-sm font-medium text-foreground">
                      Email
                    </label>
                    <input
                      id="accountEmail"
                      type="email"
                      value={account?.email ?? ''}
                      readOnly
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div className="space-y-2">
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
                    />
                  </div>

                  <div className="border-t border-border pt-4">
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={saving || !account}
                      className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </div>
              </section>

              <section className="mt-6 rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25">
                      <ShieldCheck className="size-5" />
                    </span>
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">
                        {account?.careHomeName || 'Care home workspace'}
                      </h2>
                      <p className="text-sm text-muted-foreground">Current care home workspace</p>
                    </div>
                  </div>

                  {account?.role ? (
                    <span
                      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ring-1 ${ROLE_BADGE_CLASSES[account.role]}`}
                    >
                      {formatRole(account.role)}
                    </span>
                  ) : null}
                </div>

                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  To leave this care home or change membership, contact your care home administrator.
                </p>
              </section>

              <section className="mt-6 rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-accent/60 text-foreground ring-1 ring-border">
                    <LogOut className="size-5" />
                  </span>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Session</h2>
                    <p className="text-sm text-muted-foreground">Sign out of KingdomCare OS on this device.</p>
                  </div>
                </div>

                <div className="mt-6 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/70 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <LogOut className="size-4" />
                    {signingOut ? 'Signing Out...' : 'Sign Out'}
                  </button>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
