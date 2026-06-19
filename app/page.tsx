'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import PageShell from '@/app/components/ui/PageShell'
import { getSupabaseBrowserClient } from '@/app/lib/supabase/client'
import { getMyMembership } from '@/app/lib/supabase/careHomes'

const DASHBOARD_STATS = [
  {
    label: 'Resident confidence',
    value: '24',
    note: 'Active profiles expected after migration',
    tone: 'from-amber-200 to-yellow-100',
  },
  {
    label: 'Shift handoff readiness',
    value: '92%',
    note: 'Mock operational pulse for shell review',
    tone: 'from-emerald-200 to-lime-100',
  },
  {
    label: 'Open incident watch',
    value: '3',
    note: 'Muted rose tone for escalation visibility',
    tone: 'from-rose-200 to-orange-100',
  },
  {
    label: 'Medication follow-up',
    value: '7',
    note: 'Dashboard mock data only',
    tone: 'from-stone-200 to-amber-100',
  },
]

const MODULE_CARDS = [
  {
    href: '/residents',
    title: 'Residents workspace',
    description:
      'Profiles, support snapshots, and resident-facing detail pages now running on Supabase.',
    accent: 'Residents',
  },
  {
    href: '/shifts/new',
    title: 'Shift handoff studio',
    description:
      'Capture key care updates with the same flow your team already knows while the shell takes on the new look.',
    accent: 'Daily operations',
  },
  {
    href: '/staff',
    title: 'Staff and access',
    description:
      'Roles, care-home membership, and account setup remain intact under the refreshed shell.',
    accent: 'Access control',
  },
]

const MOCK_ACTIVITY = [
  {
    title: 'Warm dashboard shell approved',
    detail:
      'Premium shell visuals are being layered in without changing live residents workflows.',
    tone: 'bg-[var(--kc-gold)]',
  },
  {
    title: 'Residents migration stable',
    detail:
      'Residents create, list, detail, and soft-delete remain connected to Supabase.',
    tone: 'bg-[var(--kc-sage)]',
  },
  {
    title: 'Operational modules pending',
    detail:
      'Reports, incidents, medications, tasks, and shifts stay on their current logic until separate checkpoints.',
    tone: 'bg-[var(--kc-rose)]',
  },
]

const MIGRATION_NOTES = [
  'Dashboard cards below use mock overview data only.',
  'Auth redirects and onboarding checks remain live.',
  'Residents pages continue using the Supabase-backed data layer.',
]

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

  const todayStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())

  return (
    <PageShell>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 lg:py-8">
        <section className="anim-fade-up rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-7">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              <span
                className="inline-flex h-2 w-2 rounded-full bg-primary"
                aria-hidden="true"
              />
              Warm dashboard shell
            </div>
            <p className="text-sm font-medium text-primary">{todayStr}</p>
            <h1 className="mt-3 font-heading text-3xl font-semibold text-foreground md:text-4xl">
              KingdomCare OS
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              A calmer, more premium command space for care-home teams. This dashboard now
              reflects the approved warm-shell direction while preserving the live auth,
              onboarding, and residents workflows underneath.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/residents"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                Open Residents
              </Link>
              <Link
                href="/shifts/new"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                Start New Shift
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-7">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {DASHBOARD_STATS.map((stat, index) => (
              <article
                key={stat.label}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <div
                  className={[
                    'inline-flex h-10 w-10 items-center justify-center rounded-xl',
                    index === 0 && 'bg-primary/15 text-primary',
                    index === 1 && 'bg-success/15 text-success',
                    index === 2 && 'bg-destructive/15 text-destructive',
                    index === 3 && 'bg-warning/20 text-warning-foreground',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-current" aria-hidden="true" />
                </div>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-3 text-4xl font-semibold text-foreground">{stat.value}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{stat.note}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <div className="anim-fade-up rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                  Core modules
                </p>
                <h2 className="mt-2 font-heading text-2xl font-semibold text-foreground md:text-3xl">
                  Approved v0 direction, safely ported
                </h2>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {MODULE_CARDS.map((card) => (
                  <Link
                    key={card.href}
                    href={card.href}
                    className="rounded-xl border border-border bg-background/60 p-3.5 transition-colors hover:bg-accent/40"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                      {card.accent}
                    </p>
                    <h3 className="mt-3 font-heading text-xl font-semibold text-foreground">
                      {card.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {card.description}
                    </p>
                    <p className="mt-5 text-sm font-semibold text-foreground">Open module</p>
                  </Link>
                ))}
              </div>
            </div>
            <div className="anim-fade-up anim-delay-100 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                Today&apos;s pulse
              </p>
              <div className="mt-5 space-y-4">
                {MOCK_ACTIVITY.map((item) => (
                  <div
                    key={item.title}
                    className="flex gap-4 rounded-xl border border-border bg-background/60 p-3.5 transition-colors hover:bg-accent/40"
                  >
                    <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${item.tone}`} aria-hidden="true" />
                    <div>
                      <h3 className="font-heading text-lg font-semibold text-foreground">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <div className="anim-fade-up anim-delay-150 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                Migration guardrails
              </p>
              <h2 className="mt-3 font-heading text-2xl font-semibold text-foreground md:text-3xl">
                Mock dashboard data only
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                This dashboard intentionally uses visual-only summary content so the refreshed
                shell does not interfere with real Supabase modules or any still-legacy
                operational pages.
              </p>
              <ul className="mt-6 space-y-3">
                {MIGRATION_NOTES.map((note) => (
                  <li
                    key={note}
                    className="flex gap-3 rounded-xl border border-border bg-background/60 p-3.5 text-sm leading-6 text-muted-foreground transition-colors hover:bg-accent/40"
                  >
                    <span
                      className="mt-2 inline-flex h-2 w-2 shrink-0 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="anim-fade-up anim-delay-200 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                Quick links
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <QuickLink href="/reports" title="Reports" />
                <QuickLink href="/incidents" title="Incidents" />
                <QuickLink href="/medications" title="Medications" />
                <QuickLink href="/tasks" title="Tasks" />
              </div>
            </div>
          </div>
        </section>
      </main>
    </PageShell>
  )
}

function QuickLink({
  href,
  title,
}: {
  href: string
  title: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl border border-border bg-background/60 p-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent/40"
    >
      <span>{title}</span>
      <span className="text-muted-foreground">Open</span>
    </Link>
  )
}
