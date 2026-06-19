'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { getCurrentUserAccess, type MembershipRole } from '@/app/lib/supabase/access'
import { getSupabaseBrowserClient } from '@/app/lib/supabase/client'

function IcDashboard() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="1" width="5.5" height="5.5" rx="1.2" />
      <rect x="8.5" y="1" width="5.5" height="5.5" rx="1.2" />
      <rect x="1" y="8.5" width="5.5" height="5.5" rx="1.2" />
      <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.2" />
    </svg>
  )
}

function IcPerson() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="7.5" cy="4.5" r="2.5" />
      <path d="M2 14c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5" />
    </svg>
  )
}

function IcClipboard() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="2" width="10" height="12" rx="1.5" />
      <path d="M5.5 2h4" />
      <path d="M7.5 6.5v4M5.5 8.5h4" />
    </svg>
  )
}

function IcDocument() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="1.5" width="10" height="12" rx="1.5" />
      <path d="M5 5.5h5M5 8h5M5 10.5h3" />
    </svg>
  )
}

function IcWarning() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7.5 2L1 13.5h13L7.5 2z" />
      <path d="M7.5 6v4M7.5 11.5v.5" />
    </svg>
  )
}

function IcPill() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1.5" y="5.5" width="12" height="4" rx="2" />
      <line x1="7.5" y1="5.5" x2="7.5" y2="9.5" />
    </svg>
  )
}

function IcChecklist() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 4.5h1.5l1 1.2 2-2.4" />
      <path d="M8 4.5h4.5" />
      <path d="M2.5 8h1.5l1 1.2 2-2.4" />
      <path d="M8 8h4.5" />
      <path d="M2.5 11.5h1.5l1 1.2 2-2.4" />
      <path d="M8 11.5h4.5" />
    </svg>
  )
}

function IcAccount() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="7.5" cy="4" r="2.25" />
      <path d="M2.5 13c0-2.485 2.239-4.5 5-4.5s5 2.015 5 4.5" />
      <path d="M11.75 5.25h1.75M12.625 4.375v1.75" />
    </svg>
  )
}

function IcTeam() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="5" cy="5" r="2" />
      <circle cx="10.5" cy="4.5" r="1.5" />
      <path d="M1.75 12.5c0-2.347 2.015-4.25 4.5-4.25s4.5 1.903 4.5 4.25" />
      <path d="M9.5 12.5c0-1.625 1.288-2.986 3-3.227" />
    </svg>
  )
}

const NAV_LINKS = [
  { href: '/', label: 'Dashboard', icon: <IcDashboard /> },
  { href: '/residents', label: 'Residents', icon: <IcPerson /> },
  { href: '/shifts/new', label: 'New Shift', icon: <IcClipboard /> },
  { href: '/reports', label: 'Reports', icon: <IcDocument /> },
  { href: '/incidents', label: 'Incidents', icon: <IcWarning /> },
  { href: '/medications', label: 'Medications', icon: <IcPill /> },
  { href: '/tasks', label: 'Tasks', icon: <IcChecklist /> },
  { href: '/staff', label: 'Staff', icon: <IcTeam /> },
  { href: '/account', label: 'Account', icon: <IcAccount /> },
]

export default function AppHeader({ className = '' }: { subtitle?: string; className?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<MembershipRole | null>(null)
  const [careHomeName, setCareHomeName] = useState('')
  const [authReady, setAuthReady] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      try {
        const supabase = getSupabaseBrowserClient()
        const access = await getCurrentUserAccess(supabase)

        if (mounted) {
          setUser(access.user)
          setRole(access.role)
          setCareHomeName(access.careHomeName)
          setAuthReady(true)
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          if (!mounted) return

          if (!nextSession?.user) {
            setUser(null)
            setRole(null)
            setCareHomeName('')
            setAuthReady(true)
            return
          }

          void getCurrentUserAccess(supabase, { user: nextSession.user })
            .then((nextAccess) => {
              if (!mounted) return
              setUser(nextAccess.user)
              setRole(nextAccess.role)
              setCareHomeName(nextAccess.careHomeName)
              setAuthReady(true)
            })
            .catch(() => {
              if (!mounted) return
              setUser(nextSession.user)
              setRole(null)
              setCareHomeName('')
              setAuthReady(true)
            })
        })

        return () => subscription.unsubscribe()
      } catch {
        if (mounted) {
          setUser(null)
          setRole(null)
          setCareHomeName('')
          setAuthReady(true)
        }
      }

      return undefined
    }

    let cleanup: (() => void) | undefined

    loadSession().then((unsubscribe) => {
      cleanup = unsubscribe
    })

    return () => {
      mounted = false
      cleanup?.()
    }
  }, [])

  async function handleLogout() {
    setLoggingOut(true)

    try {
      const supabase = getSupabaseBrowserClient()
      await supabase.auth.signOut()
      setUser(null)
      setRole(null)
      setCareHomeName('')
      router.replace('/auth/sign-in')
      router.refresh()
    } finally {
      setLoggingOut(false)
    }
  }

  const userEmail = getCleanEmail(user?.email)
  const visibleLinks = NAV_LINKS.filter((link) => link.href !== '/staff' || role === 'admin')

  return (
    <>
      <header
        className={`sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 text-foreground backdrop-blur-md md:px-6 lg:hidden ${className}`.trim()}
      >
        <div className="flex w-full items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="The Kingdom Care Homes home">
            <div className="rounded-xl border border-border bg-card p-2 shadow-sm">
              <Image
                src="/brand/the-kingdom-care-homes-logo.png"
                alt="The Kingdom Care Homes"
                height={28}
                width={140}
                className="h-7 w-auto object-contain"
                priority
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                Care Workspace
              </p>
              <p className="truncate text-sm text-muted-foreground">KingdomCare OS</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {authReady && !user ? (
              <Link
                href="/auth/sign-in"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                Sign In
              </Link>
            ) : null}
            <button
              type="button"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-drawer"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="rounded-lg p-2 text-foreground transition-colors hover:bg-accent lg:hidden"
            >
              <span className="sr-only">Toggle navigation</span>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                <path d="M3 5h12" />
                <path d="M3 9h12" />
                <path d="M3 13h12" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex ${className}`.trim()}
      >
        <div className="flex flex-1 flex-col px-5 py-6">
          <Link
            href="/"
            className="rounded-[28px] border border-sidebar-border bg-sidebar-accent/35 p-4 shadow-[0_22px_50px_rgba(0,0,0,0.18)]"
            aria-label="The Kingdom Care Homes home"
          >
            <Image
              src="/brand/the-kingdom-care-homes-logo.png"
              alt="The Kingdom Care Homes"
              height={46}
              width={220}
              className="h-10 w-auto object-contain"
              priority
            />
            <div className="mt-4 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
                Operations Command
              </p>
              <p className="text-sm leading-relaxed text-sidebar-foreground/80">
                Calm operations for The Kingdom Care Homes team.
              </p>
            </div>
          </Link>

          <div className="mt-4 rounded-[24px] border border-sidebar-border bg-sidebar-accent/45 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">
              Current Care Home
            </p>
            <p className="mt-2 text-sm font-semibold text-sidebar-foreground">
              {careHomeName || 'No care home selected'}
            </p>
            <p className="mt-1 text-xs text-sidebar-foreground/70">
              {role ? formatRole(role) : 'Workspace access pending'}
            </p>
          </div>

          <nav aria-label="Primary navigation" className="mt-5 flex-1 space-y-1.5">
            {visibleLinks.map((link) => (
              <NavItem key={link.href} link={link} pathname={pathname} />
            ))}
          </nav>

          <div className="mt-6 rounded-[24px] border border-sidebar-border bg-sidebar-accent/45 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">
              Session
            </p>
            {authReady && user ? (
              <div className="mt-3 space-y-3">
                <div>
                  <p className="truncate text-sm font-semibold text-sidebar-foreground">
                    {userEmail ?? 'Signed in'}
                  </p>
                  <p className="mt-1 text-xs text-sidebar-foreground/60">{formatRole(role)}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="inline-flex w-full items-center justify-center rounded-full border border-sidebar-border bg-sidebar-accent/60 px-4 py-2.5 text-sm font-semibold text-sidebar-foreground transition-colors hover:bg-sidebar-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loggingOut ? 'Logging Out...' : 'Logout'}
                </button>
              </div>
            ) : authReady ? (
              <Link
                href="/auth/sign-in"
                className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-sidebar-border bg-sidebar-accent/60 px-4 py-2.5 text-sm font-semibold text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
              >
                Sign In
              </Link>
            ) : (
              <p className="mt-3 text-sm text-sidebar-foreground/60">Checking session...</p>
            )}
          </div>
        </div>
      </aside>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-sidebar/70 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            id="mobile-navigation-drawer"
            className="relative h-full w-[88vw] max-w-sm overflow-y-auto border-r border-sidebar-border bg-sidebar px-5 py-6 text-sidebar-foreground shadow-[0_40px_80px_rgba(0,0,0,0.28)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="rounded-[28px] border border-sidebar-border bg-sidebar-accent/35 p-4">
                <Image
                  src="/brand/the-kingdom-care-homes-logo.png"
                  alt="The Kingdom Care Homes"
                  height={42}
                  width={210}
                  className="h-9 w-auto object-contain"
                  priority
                />
                <p className="mt-3 text-xs leading-relaxed text-sidebar-foreground/72">
                  Care-home workspace navigation for the full team.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl border border-border bg-card p-2.5 text-foreground transition-colors hover:bg-accent"
              >
                <span className="sr-only">Close navigation</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                  <path d="M3 3l10 10" />
                  <path d="M13 3L3 13" />
                </svg>
              </button>
            </div>

            <div className="mt-4 rounded-[24px] border border-sidebar-border bg-sidebar-accent/45 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">
                Current Care Home
              </p>
              <p className="mt-2 text-sm font-semibold text-sidebar-foreground">
                {careHomeName || 'No care home selected'}
              </p>
              <p className="mt-1 text-xs text-sidebar-foreground/70">
                {role ? formatRole(role) : 'Workspace access pending'}
              </p>
            </div>

            <nav aria-label="Mobile primary navigation" className="mt-5 space-y-1.5">
              {visibleLinks.map((link) => (
                <NavItem
                  key={link.href}
                  link={link}
                  pathname={pathname}
                  onClick={() => setMobileMenuOpen(false)}
                />
              ))}
            </nav>

            <div className="mt-6 rounded-[24px] border border-sidebar-border bg-sidebar-accent/45 p-4">
              {authReady && user ? (
                <div className="space-y-3">
                  <div>
                    <p className="truncate text-sm font-semibold text-sidebar-foreground">
                      {userEmail ?? 'Signed in'}
                    </p>
                    <p className="mt-1 text-xs text-sidebar-foreground/60">{formatRole(role)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="inline-flex w-full items-center justify-center rounded-full border border-sidebar-border bg-sidebar-accent/60 px-4 py-2.5 text-sm font-semibold text-sidebar-foreground transition-colors hover:bg-sidebar-accent disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loggingOut ? 'Logging Out...' : 'Logout'}
                  </button>
                </div>
              ) : authReady ? (
                <Link
                  href="/auth/sign-in"
                  className="inline-flex w-full items-center justify-center rounded-full border border-sidebar-border bg-sidebar-accent/60 px-4 py-2.5 text-sm font-semibold text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                >
                  Sign In
                </Link>
              ) : (
                <p className="text-sm text-sidebar-foreground/60">Checking session...</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function NavItem({
  link,
  pathname,
  onClick,
}: {
  link: { href: string; label: string; icon: React.ReactNode }
  pathname: string
  onClick?: () => void
}) {
  const isActive =
    link.href === '/'
      ? pathname === '/'
      : pathname === link.href || pathname.startsWith(link.href + '/')

  return (
    <Link
      href={link.href}
      aria-current={isActive ? 'page' : undefined}
      onClick={onClick}
      className={[
        'group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-all duration-150',
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
          isActive
            ? 'bg-primary-foreground/12 text-primary-foreground'
            : 'bg-sidebar-accent/40 text-sidebar-foreground/75 group-hover:bg-sidebar-accent/80',
        ].join(' ')}
      >
        {link.icon}
      </span>
      <span className="font-medium tracking-[0.01em]">{link.label}</span>
    </Link>
  )
}

function getCleanEmail(email?: string | null) {
  if (!email) return null
  if (!email.includes('@')) return null
  if (email.length > 80) return null
  return email
}

function formatRole(role: MembershipRole | null) {
  if (!role) return 'Workspace access pending'
  if (role === 'admin') return 'Admin access'
  if (role === 'nurse') return 'Nurse access'
  return 'Caregiver access'
}
