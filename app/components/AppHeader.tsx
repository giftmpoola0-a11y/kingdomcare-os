'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

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

/* ── Nav link definitions ────────────────────────────────────── */

const NAV_LINKS = [
  { href: '/',           label: 'Dashboard',  icon: <IcDashboard /> },
  { href: '/residents',  label: 'Residents',  icon: <IcPerson />    },
  { href: '/shifts/new', label: 'New Shift',  icon: <IcClipboard /> },
  { href: '/reports',    label: 'Reports',    icon: <IcDocument />  },
  { href: '/incidents',  label: 'Incidents',  icon: <IcWarning />   },
  { href: '/medications',label: 'Medications',icon: <IcPill />      },
  { href: '/tasks',      label: 'Tasks',      icon: <IcChecklist /> },
]

export default function AppHeader({ className = '' }: { subtitle?: string; className?: string }) {
  const pathname = usePathname()

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
          {NAV_LINKS.map((link) => {
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
      </div>
    </header>
  )
}
