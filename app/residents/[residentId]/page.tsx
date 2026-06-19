import Link from 'next/link'
import { redirect } from 'next/navigation'
import PageShell from '@/app/components/ui/PageShell'
import StatusBadge from '@/app/components/ui/StatusBadge'
import { getCurrentUserAccess } from '@/app/lib/supabase/access'
import { getResidentById } from '@/app/lib/supabase/residents'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'

function DetailEmptyState({
  message,
  linkHref,
  linkLabel,
}: {
  message: string
  linkHref?: string
  linkLabel?: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background/60">
        <span className="text-xl leading-none text-muted-foreground" aria-hidden="true">
          -
        </span>
      </div>
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
      {linkHref && linkLabel ? (
        <Link
          href={linkHref}
          className="mt-4 inline-flex items-center gap-1 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
        >
          {linkLabel}
          <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </div>
  )
}

function DetailField({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

export default async function ResidentDetailPage({
  params,
}: {
  params: Promise<{ residentId: string }>
}) {
  const { residentId } = await params
  const supabase = await getSupabaseServerClient()
  const access = await getCurrentUserAccess(supabase)

  if (!access.isSignedIn) {
    redirect('/auth/sign-in')
  }

  if (!access.hasCareHome) {
    redirect('/onboarding')
  }

  let resident = null

  try {
    resident = await getResidentById(residentId)
  } catch {
    resident = null
  }

  if (!resident) {
    return (
      <PageShell>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:py-8">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
              Residents
            </p>
            <h1 className="mt-2 font-heading text-3xl font-semibold text-foreground md:text-4xl">
              Resident Not Found
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              The resident profile you requested is not available.
            </p>
          </div>

          <div className="mt-6">
            <DetailEmptyState
              message="The resident profile you requested is not available."
              linkHref="/residents"
              linkLabel="Back to Residents"
            />
          </div>
        </main>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:py-8">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href="/residents"
              className="inline-flex items-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
            >
              ← Back to Residents
            </Link>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
              Residents
            </p>
            <h1 className="mt-2 font-heading text-3xl font-semibold text-foreground md:text-4xl">
              {resident.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Age {resident.age} · {resident.careLevel}
            </p>
          </div>

          {resident.status !== 'archived' ? (
            <div className="shrink-0">
              <Link
                href={`/shifts/new?residentId=${resident.id}`}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                Start Shift →
              </Link>
            </div>
          ) : null}
        </div>

        <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <DetailField label="Status" value={resident.status} />
              {resident.status === 'archived' ? (
                <StatusBadge
                  label="Archived"
                  colorClass="bg-warning/20 text-warning-foreground"
                />
              ) : (
                <StatusBadge label="Active" colorClass="bg-success/15 text-success" />
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <DetailField label="Resident Name" value={resident.name} />
              <DetailField label="Age" value={String(resident.age)} />
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Care Level
              </p>
              <div className="mt-3">
                <span className="rounded-full bg-primary/15 px-3 py-1.5 text-sm font-semibold text-primary">
                  {resident.careLevel}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Support Needs
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {resident.primarySupportNeeds.map((need) => (
                  <span
                    key={need}
                    className="rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground"
                  >
                    {need}
                  </span>
                ))}
              </div>
            </div>

            {resident.notes ? (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Notes
                </p>
                <div className="mt-3 rounded-xl border border-border bg-background/60 p-3.5">
                  <p className="text-sm leading-relaxed text-foreground">{resident.notes}</p>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Resident Tasks
          </h2>
          <DetailEmptyState
            message="No tasks saved for this resident yet."
            linkHref="/tasks"
            linkLabel="Add a task"
          />
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Report History
          </h2>
          <DetailEmptyState
            message="No reports saved for this resident yet."
            linkHref="/shifts/new"
            linkLabel="Document a shift"
          />
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Incident History
          </h2>
          <DetailEmptyState
            message="No incidents saved for this resident yet."
            linkHref="/incidents"
            linkLabel="Log an incident"
          />
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Medication History
          </h2>
          <DetailEmptyState
            message="No medication entries saved for this resident yet."
            linkHref="/medications"
            linkLabel="Log a medication entry"
          />
        </section>
      </main>
    </PageShell>
  )
}
