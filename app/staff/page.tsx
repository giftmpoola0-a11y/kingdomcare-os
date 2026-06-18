'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/app/components/ui/PageShell'
import PageHeader from '@/app/components/ui/PageHeader'
import SectionCard from '@/app/components/ui/SectionCard'
import StatusBadge from '@/app/components/ui/StatusBadge'
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

const INPUT_CLASS =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

const ROLE_BADGE_CLASSES: Record<MembershipRole, string> = {
  admin: 'bg-red-100 text-red-700',
  nurse: 'bg-blue-100 text-blue-700',
  caregiver: 'bg-emerald-100 text-emerald-700',
}

const ROLE_OPTIONS: MembershipRole[] = ['admin', 'nurse', 'caregiver']

export default function StaffPage() {
  const router = useRouter()
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

    loadStaffPage()

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
        setErrorMessage('Use Account Settings to leave your own care home access.')
      } else {
        setErrorMessage(nextMessage)
      }
    } finally {
      setActionKey('')
    }
  }

  if (loading) {
    return (
      <PageShell>
        <PageHeader
          eyebrow="Access"
          title="Staff Management"
          subtitle="Manage who has access to this care home."
          maxWidth="max-w-6xl"
        />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <SectionCard className="p-6">
            <p className="text-sm text-slate-500">Loading staff management...</p>
          </SectionCard>
        </main>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Access"
        title="Staff Management"
        subtitle="Manage who has access to this care home."
        maxWidth="max-w-6xl"
      />

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {pageState?.careHomeName || 'Care home workspace'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Staff access is managed per care home membership.
              </p>
            </div>
            {pageState?.currentUserRole && (
              <StatusBadge
                label={`Your role: ${pageState.currentUserRole}`}
                colorClass={ROLE_BADGE_CLASSES[pageState.currentUserRole]}
              />
            )}
          </div>
        </SectionCard>

        {pageState?.currentUserRole !== 'admin' ? (
          <SectionCard className="p-6">
            <p className="text-sm font-medium text-slate-700">
              You do not have permission to manage staff.
            </p>
          </SectionCard>
        ) : (
          <>
            <SectionCard className="p-6">
              <h2 className="mb-5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Add Staff Member
              </h2>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1.5fr)_220px_auto] md:items-end">
                <div className="space-y-1">
                  <label htmlFor="staffEmail" className="block text-sm font-medium text-slate-700">
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

                <div className="space-y-1">
                  <label htmlFor="staffRole" className="block text-sm font-medium text-slate-700">
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
                  onClick={handleAddStaffMember}
                  disabled={submitting}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 hover:shadow-md active:scale-[0.99] active:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {submitting ? 'Adding...' : 'Add Staff Member'}
                </button>
              </div>
            </SectionCard>

            <SectionCard className="p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Staff Members
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    {pageState.members.length} member{pageState.members.length === 1 ? '' : 's'} in this care home
                  </p>
                </div>
                <StatusBadge
                  label={`${adminCount} admin${adminCount === 1 ? '' : 's'}`}
                  colorClass="bg-slate-100 text-slate-700"
                />
              </div>

              <div className="space-y-3">
                {pageState.members.map((member) => {
                  const isCurrentUser = member.userId === pageState.currentUserId
                  const isOnlyAdmin = member.role === 'admin' && adminCount <= 1
                  const roleActionBusy = actionKey === `role:${member.membershipId}`
                  const removeActionBusy = actionKey === `remove:${member.membershipId}`
                  const disableRoleEdit = isCurrentUser || (isOnlyAdmin && member.role === 'admin')
                  const disableRemove = isCurrentUser || isOnlyAdmin

                  return (
                    <div
                      key={member.membershipId}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">
                              {member.fullName || member.email || 'Unnamed staff member'}
                            </p>
                            <StatusBadge
                              label={member.role}
                              colorClass={ROLE_BADGE_CLASSES[member.role]}
                            />
                            {isCurrentUser && (
                              <StatusBadge
                                label="You"
                                colorClass="bg-slate-100 text-slate-700"
                              />
                            )}
                          </div>
                          <p className="text-sm text-slate-600">{member.email || 'No profile email available'}</p>
                          <p className="text-xs text-slate-400">
                            Joined {formatDateTime(member.createdAt)}
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-[180px_auto] sm:items-end">
                          <div className="space-y-1">
                            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                            className="rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 shadow-sm transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                          >
                            {removeActionBusy ? 'Removing...' : 'Remove'}
                          </button>
                        </div>
                      </div>

                      {(disableRoleEdit || disableRemove) && (
                        <p className="mt-3 text-xs text-slate-400">
                          {isCurrentUser
                            ? 'Use another admin account to change or remove your own membership.'
                            : isOnlyAdmin
                              ? 'At least one admin must remain in the care home.'
                              : ''}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </SectionCard>
          </>
        )}
      </main>
    </PageShell>
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
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date'
  }

  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]

  const weekday = weekdays[date.getDay()]
  const month = months[date.getMonth()]
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()
  const hours = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const normalizedHours = hours % 12 || 12
  const meridiem = hours >= 12 ? 'PM' : 'AM'

  return `${weekday}, ${day} ${month} ${year} at ${normalizedHours}:${minutes} ${meridiem}`
}
