'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X, LifeBuoy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navItems } from '@/lib/kingdomos-v0-dashboard-data'

const navHrefMap: Record<string, string> = {
  Dashboard: '/',
  Residents: '/residents',
  'New Shift': '/shifts/new',
  Reports: '/reports',
  Incidents: '/incidents',
  Medications: '/medications',
  Tasks: '/tasks',
  Staff: '/staff',
  Account: '/account',
}

function isItemActive(pathname: string, label: string) {
  const href = navHrefMap[label] ?? '/'

  if (href === '/') {
    return pathname === '/'
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

function resolveItemBadge(
  label: string,
  defaultBadge: string | number | undefined,
  openTasksCount?: number,
  medicationAlertsCount?: number,
  recentIncidentsCount?: number,
) {
  if (label === 'Tasks' && typeof openTasksCount === 'number') {
    return openTasksCount
  }

  if (label === 'Medications' && typeof medicationAlertsCount === 'number') {
    return medicationAlertsCount
  }

  if (label === 'Incidents' && typeof recentIncidentsCount === 'number') {
    return recentIncidentsCount
  }

  return defaultBadge
}

export function AppSidebar({
  open,
  onClose,
  openTasksCount,
  medicationAlertsCount,
  recentIncidentsCount,
}: {
  open: boolean
  onClose: () => void
  openTasksCount?: number
  medicationAlertsCount?: number
  recentIncidentsCount?: number
}) {
  const pathname = usePathname()

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center overflow-hidden rounded-2xl bg-accent/60 ring-1 ring-border">
              <Image
                src="/brand/the-kingdom-care-homes-logo.png"
                alt="The Kingdom Care Homes logo"
                width={44}
                height={44}
                className="size-9 object-contain"
              />
            </div>
            <div className="leading-tight">
              <p className="text-base font-semibold text-sidebar-foreground">KingdomCare OS</p>
              <p className="text-xs text-muted-foreground">Care Operations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-sidebar-accent lg:hidden"
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mx-4 mb-4 rounded-xl border border-sidebar-border bg-card/60 px-3.5 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Current care home</p>
          <p className="mt-0.5 text-sm font-medium text-sidebar-foreground">The Kingdom Care Homes</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => {
              const href = navHrefMap[item.label] ?? item.href
              const active = isItemActive(pathname, item.label)
              const badge = resolveItemBadge(
                item.label,
                item.badge,
                openTasksCount,
                medicationAlertsCount,
                recentIncidentsCount,
              )

              return (
                <li key={item.label}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                    )}
                  >
                    <item.icon className="size-[18px] shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {badge ? (
                      <span
                        className={cn(
                          'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold',
                          active
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : 'bg-accent text-accent-foreground',
                        )}
                      >
                        {badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <a
            href="#"
            className="flex items-center gap-3 rounded-xl bg-accent/50 px-3.5 py-3 text-sm text-sidebar-foreground transition-colors hover:bg-accent"
          >
            <LifeBuoy className="size-[18px] text-primary" />
            <div className="leading-tight">
              <p className="font-medium">Need help?</p>
              <p className="text-xs text-muted-foreground">Contact support</p>
            </div>
          </a>
        </div>
      </aside>
    </>
  )
}
