import Link from 'next/link'
import { redirect } from 'next/navigation'
import PageShell from '@/app/components/ui/PageShell'
import PageHeader from '@/app/components/ui/PageHeader'
import SectionCard from '@/app/components/ui/SectionCard'
import EmptyState from '@/app/components/ui/EmptyState'
import StatusBadge from '@/app/components/ui/StatusBadge'
import { getCurrentUserAccess } from '@/app/lib/supabase/access'
import { getResidentById } from '@/app/lib/supabase/residents'
import { getSupabaseServerClient } from '@/app/lib/supabase/server'

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
        <PageHeader title="Resident Not Found" maxWidth="max-w-5xl" />
        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <EmptyState
            message="The resident profile you requested is not available."
            linkHref="/residents"
            linkLabel="Back to Residents"
          />
        </main>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Residents"
        title={resident.name}
        subtitle={`Age ${resident.age} · ${resident.careLevel}`}
        maxWidth="max-w-5xl"
        action={
          resident.status !== 'archived' ? (
            <Link
              href={`/shifts/new?residentId=${resident.id}`}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 active:bg-blue-800"
            >
              Start Shift →
            </Link>
          ) : undefined
        }
      />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <SectionCard className="p-6">
          <div className="space-y-4">
            {resident.status === 'archived' && (
              <div>
                <StatusBadge label="Archived" colorClass="bg-amber-100 text-amber-800" />
              </div>
            )}

            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Support Needs
              </p>
              <div className="flex flex-wrap gap-1.5">
                {resident.primarySupportNeeds.map((need) => (
                  <span
                    key={need}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] text-slate-600"
                  >
                    {need}
                  </span>
                ))}
              </div>
            </div>

            {resident.notes && (
              <div className="border-t border-slate-100 pt-4">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Notes
                </p>
                <p className="text-sm leading-relaxed text-slate-600">{resident.notes}</p>
              </div>
            )}
          </div>
        </SectionCard>

        <section className="space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Resident Tasks
          </h2>
          <EmptyState
            message="No tasks saved for this resident yet."
            linkHref="/tasks"
            linkLabel="Add a task"
          />
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Report History
            </h2>
            <Link
              href="/residents"
              className="text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700"
            >
              ← All Residents
            </Link>
          </div>
          <EmptyState
            message="No reports saved for this resident yet."
            linkHref="/shifts/new"
            linkLabel="Document a shift"
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Incident History
          </h2>
          <EmptyState
            message="No incidents saved for this resident yet."
            linkHref="/incidents"
            linkLabel="Log an incident"
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Medication History
          </h2>
          <EmptyState
            message="No medication entries saved for this resident yet."
            linkHref="/medications"
            linkLabel="Log a medication entry"
          />
        </section>
      </main>
    </PageShell>
  )
}
