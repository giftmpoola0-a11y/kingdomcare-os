'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { AppSidebar } from '@/components/kingdomos-v0/app-sidebar'
import { AppTopbar } from '@/components/kingdomos-v0/app-topbar'
import type { SidebarBadgeCounts } from '@/app/lib/sidebar-badge-counts'
import { getCurrentUserAccess, normalizeMembershipRole, type MembershipRole } from '@/app/lib/supabase/access'
import { getSupabaseBrowserClient } from '@/app/lib/supabase/client'

interface StaffMember {
  membershipId: string
  userId: string
  email: string
  fullName: string
  role: MembershipRole
  createdAt: string
}

interface StaffPageState {
  currentUserId: string
  careHomeId: string
  careHomeName: string
  currentUserRole: MembershipRole
  members: StaffMember[]
}

interface StaffManagementClientProps {
  sidebarBadgeCounts: SidebarBadgeCounts
}

const INPUT_CLASS =
  'h-11 w-full rounded-xl border border-border bg-background/70 px-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60'

const ROLE_BADGE_CLASSES: Record<MembershipRole, string> = {
  admin: 'bg-rose-500/12 text-rose-200 ring-rose-400/20',
  nurse: 'bg-sky-500/12 text-sky-200 ring-sky-400/20',
  caregiver: 'bg-emerald-500/12 text-emerald-200 ring-emerald-400/20',
}

const ROLE_OPTIONS: MembershipRole[] = ['admin', 'nurse', 'caregiver']

export default function StaffManagementClient({
  sidebarBadgeCounts,
}: StaffManagementClientProps) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [actionKey, setActionKey] = useState('')
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [pageState, setPageState] = useState<StaffPageState | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<MembershipRole>('caregiver')

  useEffect(() => {
    let active = true

    async function loadStaffPage() {
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

        if (!access.role) {
          throw new Error('Unable to determine your care home role.')
        }

        if (access.role !== 'admin') {
          setPageState({
            currentUserId: access.user?.id ?? '',
            careHomeId: access.membership.careHomeId,
            careHomeName: access.membership.careHomeName,
            currentUserRole: access.role,
            members: [],
          })
          return
        }

        const { data: membersData, error: membersError } = await supabase.rpc('get_care_home_staff', {
          p_care_home_id: access.membership.careHomeId,
        })

        if (membersError) throw new Error(membersError.message)

        const members = Array.isArray(membersData)
          ? membersData
              .map((item) => normalizeStaffMember(item))
              .filter((item): item is StaffMember => item !== null)
          : []

        if (!active) return

        setPageState({
          currentUserId: access.user?.id ?? '',
          careHomeId: access.membership.careHomeId,
          careHomeName: access.membership.careHomeName,
          currentUserRole: access.role,
          members,
        })
      } catch (error) {
        if (!active) return
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load staff management.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadStaffPage()

    return () => {
      active = false
    }
  }, [router])

  const adminCount = useMemo(() => {
    return pageState?.members.filter((member) => member.role === 'admin').length ?? 0
  }, [pageState])

  async function refreshStaffMembers(careHomeId: string) {
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase.rpc('get_care_home_staff', {
      p_care_home_id: careHomeId,
    })

    if (error) throw new Error(error.message)

    const members = Array.isArray(data)
      ? data
          .map((item) => normalizeStaffMember(item))
          .filter((item): item is StaffMember => item !== null)
      : []

    setPageState((prev) => (prev ? { ...prev, members } : prev))
  }

  async function handleAddStaffMember() {
    if (!pageState) return

    const trimmedEmail = inviteEmail.trim().toLowerCase()
    if (!trimmedEmail) {
      setErrorMessage('Please enter a staff email.')
      return
    }

    setSubmitting(true)
    setMessage('')
    setErrorMessage('')

    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.rpc('add_care_home_member', {
        p_care_home_id: pageState.careHomeId,
        p_email: trimmedEmail,
        p_role: inviteRole,
      })

      if (error) throw new Error(error.message)

      await refreshStaffMembers(pageState.careHomeId)
      setInviteEmail('')
      setInviteRole('caregiver')
      setMessage('Staff member added successfully.')
    } catch (error) {
      const nextMessage =
        error instanceof Error ? error.message : 'Unable to add this staff member.'

      if (nextMessage.includes('profile_not_found')) {
        setErrorMessage('This user must sign up first before they can be added.')
      } else {
        setErrorMessage(nextMessage)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRoleChange(member: StaffMember, nextRole: MembershipRole) {
    if (!pageState || member.role === nextRole) return

    setActionKey(`role:${member.membershipId}`)
    setMessage('')
    setErrorMessage('')

    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.rpc('update_care_home_member_role', {
        p_membership_id: member.membershipId,
        p_role: nextRole,
      })

      if (error) throw new Error(error.message)

      await refreshStaffMembers(pageState.careHomeId)
      setMessage('Staff role updated successfully.')
    } catch (error) {
      const nextMessage =
        error instanceof Error ? error.message : 'Unable to update this staff role.'

      if (nextMessage.includes('last_admin')) {
        setErrorMessage('At least one admin must remain in the care home.')
      } else if (nextMessage.includes('cannot_change_own_role')) {
        setErrorMessage('You cannot change your own role here.')
      } else {
        setErrorMessage(nextMessage)
      }
    } finally {
      setActionKey('')
    }
  }

  async function handleRemoveMember(member: StaffMember) {
    if (!pageState) return

    if (!window.confirm('Remove this staff member from the care home?')) {
      return
    }

    setActionKey(`remove:${member.membershipId}`)
    setMessage('')
    setErrorMessage('')

    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.rpc('remove_care_home_member', {
        p_membership_id: member.membershipId,
      })

      if (error) throw new Error(error.message)

      await refreshStaffMembers(pageState.careHomeId)
      setMessage('Staff member removed successfully.')
    } catch (error) {
      const nextMessage =
        error instanceof Error ? error.message : 'Unable to remove this staff member.'

      if (nextMessage.includes('last_admin')) {
        setErrorMessage('At least one admin must remain in the care home.')
      } else if (nextMessage.includes('cannot_remove_self')) {
        setErrorMessage('Use another admin account to remove your own membership.')
      } else {
        setErrorMessage(nextMessage)
      }
    } finally {
      setActionKey('')
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} badgeCounts={sidebarBadgeCounts} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar onMenu={() => setSidebarOpen(true)} />

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 lg:py-8">
          <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-rose-500/12 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-rose-200 ring-1 ring-rose-400/20">
                  <span className="inline-flex size-2 rounded-full bg-rose-400" aria-hidden="true" />
                  Access Control
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  Staff Management
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Manage who has access to this care home.
                </p>
              </div>

              <Link
                href="/staff"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/70 px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-background"
              >
                <ArrowLeft className="size-4" />
                Back to Staff Workspace
              </Link>
            </div>
          </section>

          {loading ? (
            <section className="mt-6 rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
              <p className="text-sm text-muted-foreground">Loading staff management...</p>
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
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                      {pageState?.careHomeName || 'Care home workspace'}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Staff access is managed per care home membership.
                    </p>
                  </div>
                  {pageState?.currentUserRole ? (
                    <StatusPill tone={pageState.currentUserRole}>
                      Your role: {formatRole(pageState.currentUserRole)}
                    </StatusPill>
                  ) : null}
                </div>
              </section>

              {pageState?.currentUserRole !== 'admin' ? (
                <section className="mt-6 rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/25">
                      <ShieldCheck className="size-5" />
                    </span>
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">Admin access required</h2>
                      <p className="text-sm text-muted-foreground">
                        You do not have permission to manage staff.
                      </p>
                    </div>
                  </div>
                </section>
              ) : (
                <>
                  <section className="mt-6 rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/25">
                        <UserPlus className="size-5" />
                      </span>
                      <div>
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Add Staff Member</h2>
                        <p className="text-sm text-muted-foreground">
                          Invite an existing KingdomCare user into this care home with the right role.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1.5fr)_220px_auto] md:items-end">
                      <div className="space-y-2">
                        <label htmlFor="staffEmail" className="block text-sm font-medium text-foreground">
                          Email
                        </label>
                        <input
                          id="staffEmail"
                          type="email"
                          value={inviteEmail}
                          onChange={(event) => setInviteEmail(event.target.value)}
                          className={INPUT_CLASS}
                          placeholder="name@example.com"
                          autoComplete="email"
                          disabled={submitting}
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="staffRole" className="block text-sm font-medium text-foreground">
                          Role
                        </label>
                        <select
                          id="staffRole"
                          value={inviteRole}
                          onChange={(event) => setInviteRole(normalizeRole(event.target.value) ?? 'caregiver')}
                          className={INPUT_CLASS}
                          disabled={submitting}
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>
                              {formatRole(role)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleAddStaffMember()}
                        disabled={submitting}
                        className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {submitting ? 'Adding...' : 'Add Staff Member'}
                      </button>
                    </div>
                  </section>

                  <section className="mt-6 rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/25">
                          <Users className="size-5" />
                        </span>
                        <div>
                          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Staff Members</h2>
                          <p className="text-sm text-muted-foreground">
                            {pageState.members.length} member{pageState.members.length === 1 ? '' : 's'} in this care home.
                          </p>
                        </div>
                      </div>
                      <StatusPill tone="neutral">
                        {adminCount} admin{adminCount === 1 ? '' : 's'}
                      </StatusPill>
                    </div>

                    <div className="mt-6 space-y-4">
                      {pageState.members.map((member) => {
                        const isCurrentUser = member.userId === pageState.currentUserId
                        const isOnlyAdmin = member.role === 'admin' && adminCount <= 1
                        const roleActionBusy = actionKey === `role:${member.membershipId}`
                        const removeActionBusy = actionKey === `remove:${member.membershipId}`
                        const disableRoleEdit = isCurrentUser || (isOnlyAdmin && member.role === 'admin')
                        const disableRemove = isCurrentUser || isOnlyAdmin

                        return (
                          <article
                            key={member.membershipId}
                            className="rounded-2xl border border-border bg-background/60 p-4 sm:p-5"
                          >
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                              <div className="min-w-0 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-lg font-semibold text-foreground">
                                    {member.fullName || member.email || 'Unnamed staff member'}
                                  </h3>
                                  <StatusPill tone={member.role}>{formatRole(member.role)}</StatusPill>
                                  {isCurrentUser ? <StatusPill tone="neutral">You</StatusPill> : null}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {member.email || 'No profile email available'}
                                </p>
                                <p className="text-xs text-muted-foreground/80">
                                  Joined {formatDateTime(member.createdAt)}
                                </p>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-[180px_auto] sm:items-end">
                                <div className="space-y-2">
                                  <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                    Role
                                  </label>
                                  <select
                                    value={member.role}
                                    onChange={(event) => {
                                      const nextRole = normalizeRole(event.target.value)
                                      if (nextRole) {
                                        void handleRoleChange(member, nextRole)
                                      }
                                    }}
                                    disabled={disableRoleEdit || roleActionBusy}
                                    className={INPUT_CLASS}
                                  >
                                    {ROLE_OPTIONS.map((role) => (
                                      <option key={role} value={role}>
                                        {formatRole(role)}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => void handleRemoveMember(member)}
                                  disabled={disableRemove || removeActionBusy}
                                  className="inline-flex h-11 items-center justify-center rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 text-sm font-semibold text-rose-200 transition-colors hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {removeActionBusy ? 'Removing...' : 'Remove'}
                                </button>
                              </div>
                            </div>

                            {disableRoleEdit || disableRemove ? (
                              <p className="mt-3 text-xs text-muted-foreground/80">
                                {isCurrentUser
                                  ? 'Use another admin account to change or remove your own membership.'
                                  : isOnlyAdmin
                                    ? 'At least one admin must remain in the care home.'
                                    : ''}
                              </p>
                            ) : null}
                          </article>
                        )
                      })}
                    </div>
                  </section>
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function normalizeRole(role: string | null | undefined): MembershipRole | null {
  return normalizeMembershipRole(role)
}

function normalizeStaffMember(value: unknown): StaffMember | null {
  if (!value || typeof value !== 'object') return null

  const item = value as Record<string, unknown>
  const role = normalizeRole(typeof item.role === 'string' ? item.role : null)

  if (
    typeof item.membership_id !== 'string' ||
    typeof item.user_id !== 'string' ||
    !role ||
    typeof item.created_at !== 'string'
  ) {
    return null
  }

  return {
    membershipId: item.membership_id,
    userId: item.user_id,
    email: typeof item.email === 'string' ? item.email : '',
    fullName: typeof item.full_name === 'string' ? item.full_name : '',
    role,
    createdAt: item.created_at,
  }
}

function formatRole(role: MembershipRole) {
  return role.charAt(0).toUpperCase() + role.slice(1)
}

function formatDateTime(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown date'
  }

  return parsed.toLocaleString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatusPill({
  tone,
  children,
}: {
  tone: MembershipRole | 'neutral'
  children: ReactNode
}) {
  const className =
    tone === 'neutral'
      ? 'bg-card/70 text-muted-foreground ring-border'
      : ROLE_BADGE_CLASSES[tone]

  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1 ${className}`}>
      {children}
    </span>
  )
}
