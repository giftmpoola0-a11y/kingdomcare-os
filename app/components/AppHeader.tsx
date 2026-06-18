'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { getCurrentUserAccess, type MembershipRole } from '@/app/lib/supabase/access'
import { getSupabaseBrowserClient } from '@/app/lib/supabase/client'

/* ── Inline SVG icons ────────────────────────────────────────── */

function IcDashboard() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="1" width="5.5" height="5.5" rx="1.2"/>
      <rect x="8.5" y="1" width="5.5" height="5.5" rx="1.2"/>
      <rect x="1" y="8.5" width="5.5" height="5.5" rx="1.2"/>
      <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.2"/>
    </svg>
  )
}

function IcPerson() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="7.5" cy="4.5" r="2.5"/>
      <path d="M2 14c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5"/>
    </svg>
  )
}

function IcClipboard() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="2" width="10" height="12" rx="1.5"/>
      <path d="M5.5 2h4"/>
      <path d="M7.5 6.5v4M5.5 8.5h4"/>
    </svg>
  )
}

function IcDocument() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="1.5" width="10" height="12" rx="1.5"/>
      <path d="M5 5.5h5M5 8h5M5 10.5h3"/>
    </svg>
  )
}

function IcWarning() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7.5 2L1 13.5h13L7.5 2z"/>
      <path d="M7.5 6v4M7.5 11.5v.5"/>
    </svg>
  )
}

function IcPill() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1.5" y="5.5" width="12" height="4" rx="2"/>
      <line x1="7.5" y1="5.5" x2="7.5" y2="9.5"/>
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
      <circle cx="7.5" cy="4" r="2.25"/>
      <path d="M2.5 13c0-2.485 2.239-4.5 5-4.5s5 2.015 5 4.5"/>
      <path d="M11.75 5.25h1.75M12.625 4.375v1.75"/>
    </svg>
  )
}

function IcTeam() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="5" cy="5" r="2"/>
      <circle cx="10.5" cy="4.5" r="1.5"/>
      <path d="M1.75 12.5c0-2.347 2.015-4.25 4.5-4.25s4.5 1.903 4.5 4.25"/>
      <path d="M9.5 12.5c0-1.625 1.288-2.986 3-3.227"/>
    </svg>
  )
}

/* ── Nav link definitions ────────────────────────────────────── */

const NAV_LINKS = [
  { href: '/',           label: 'Dashboard',  icon: <IcDashboard /> },
  { href: '/residents',  label: 'Residents',  icon: <IcPerson />    },
  { href: '/shifts/new', label: 'New Shift',  icon: <IcClipboard /> },
  { href: '/reports',    label: 'Reports',    icon: <IcDocument />  },
  { href: '/incidents',  label: 'Incidents',  icon: <IcWarning />   },
  { href: '/medications',label: 'Medications',icon: <IcPill />      },
  { href: '/tasks',      label: 'Tasks',      icon: <IcChecklist /> },
  { href: '/staff',      label: 'Staff',      icon: <IcTeam />      },
  { href: '/account',    label: 'Account',    icon: <IcAccount />   },
]

export default function AppHeader({ className = '' }: { subtitle?: string; className?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<MembershipRole | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      try {
        const supabase = getSupabaseBrowserClient()
        const access = await getCurrentUserAccess(supabase)

        if (mounted) {
          setUser(access.user)
          setRole(access.role)
          setAuthReady(true)
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          if (!mounted) return

          if (!nextSession?.user) {
            setUser(null)
            setRole(null)
            setAuthReady(true)
            return
          }

          void getCurrentUserAccess(supabase, { user: nextSession.user })
            .then((nextAccess) => {
              if (!mounted) return
              setUser(nextAccess.user)
              setRole(nextAccess.role)
              setAuthReady(true)
            })
            .catch(() => {
              if (!mounted) return
              setUser(nextSession.user)
              setRole(null)
              setAuthReady(true)
            })
        })

        return () => subscription.unsubscribe()
      } catch {
        if (mounted) {
          setUser(null)
          setRole(null)
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
      router.replace('/auth/sign-in')
      router.refresh()
    } finally {
      setLoggingOut(false)
    }
  }

  const userEmail = getCleanEmail(user?.email)
  const visibleLinks = NAV_LINKS.filter((link) => link.href !== '/staff' || role === 'admin')

  return (
    <header className={`sticky top-0 z-40 border-b border-white/8 bg-slate-900 ${className}`.trim()}>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">

        {/* Brand */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="KingdomCare OS home">
          <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-linear-to-br from-blue-400 to-blue-600 text-[13px] font-black tracking-tight text-white shadow-md">
            K
          </span>
          <span className="hidden text-sm font-semibold tracking-tight text-white sm:block">
            KingdomCare{' '}
            <span className="font-normal text-slate-400">OS</span>
          </span>
        </Link>

        <div className="hidden h-5 w-px bg-white/10 sm:block" aria-hidden="true" />

        {/* Navigation */}
        <nav aria-label="Primary navigation" className="flex flex-1 items-center gap-0.5 overflow-x-auto scrollbar-none">
          {visibleLinks.map((link) => {
            const isActive =
              link.href === '/'
                ? pathname === '/'
                : pathname === link.href || pathname.startsWith(link.href + '/')

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150',
                  isActive
                    ? 'bg-white/12 text-white'
                    : 'text-slate-400 hover:bg-white/7 hover:text-slate-200',
                ].join(' ')}
              >
                {link.icon}
                <span className="hidden sm:block">{link.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {authReady && user ? (
            <>
              <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 md:inline-flex">
                {userEmail ?? 'Signed in'}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loggingOut ? 'Logging Out...' : 'Logout'}
              </button>
            </>
          ) : authReady ? (
            <Link
              href="/auth/sign-in"
              className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
            >
              Sign In
            </Link>
          ) : (
            <span className="hidden text-xs text-slate-400 sm:inline">Checking session...</span>
          )}
        </div>
      </div>
    </header>
  )
}

function getCleanEmail(email?: string | null) {
  if (!email) return null
  if (!email.includes('@')) return null
  if (email.length > 80) return null
  return email
}
