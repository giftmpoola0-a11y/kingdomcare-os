'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, FileText, Pill, UserRound, Workflow } from 'lucide-react'
import type { SidebarBadgeCounts } from '@/app/lib/sidebar-badge-counts'
import type { ResidentRecord, ResidentSex } from '@/app/lib/supabase/residents'
import StatusBadge from '@/app/components/ui/StatusBadge'
import { AppSidebar } from '@/components/kingdomos-v0/app-sidebar'
import { AppTopbar } from '@/components/kingdomos-v0/app-topbar'
import { ResidentPhotoUploader } from './ResidentPhotoUploader'

const SEX_LABELS: Record<ResidentSex, string> = {
  unknown: 'Unknown',
  male: 'Male',
  female: 'Female',
  other: 'Other',
}

export interface ResidentDetailClientProps {
  resident: ResidentRecord | null
  canManage: boolean
  sidebarBadgeCounts: SidebarBadgeCounts
}

export default function ResidentDetailClient({
  resident,
  canManage,
  sidebarBadgeCounts,
}: ResidentDetailClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        badgeCounts={sidebarBadgeCounts}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar onMenu={() => setSidebarOpen(true)} />

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 lg:py-8">
          {resident ? (
            <>
              <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                    <ResidentPhotoUploader
                      residentId={resident.id}
                      photoUrl={resident.photoUrl}
                      initials={getInitials(resident.name)}
                      canManage={canManage}
                    />

                    <div className="max-w-3xl">
                      <Link
                        href="/residents"
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/60 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
                      >
                        <ArrowLeft className="size-4" />
                        Back to Residents
                      </Link>

                      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/12 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200 ring-1 ring-emerald-400/20">
                        <span className="inline-flex size-2 rounded-full bg-emerald-400" aria-hidden="true" />
                        Resident Profile
                      </div>

                      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                        {resident.name}
                      </h1>
                      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                        Age {resident.age} - {resident.careLevel}
                      </p>
                    </div>
                  </div>

                  {resident.status !== 'archived' ? (
                    <Link
                      href={`/shifts/new?residentId=${resident.id}`}
                      className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                    >
                      <Workflow className="size-4" />
                      Start Shift
                    </Link>
                  ) : null}
                </div>
              </section>

              <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <DetailField label="Resident Name" value={resident.name} />
                <DetailField label="Age" value={String(resident.age)} />
                <DetailField label="Sex" value={SEX_LABELS[resident.sex]} />
                <div className="rounded-2xl border border-border bg-card/95 p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Status
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <p className="text-sm font-medium capitalize text-foreground">{resident.status}</p>
                    {resident.status === 'archived' ? (
                      <StatusBadge
                        label="Archived"
                        colorClass="bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/35"
                      />
                    ) : (
                      <StatusBadge
                        label="Active"
                        colorClass="bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/35"
                      />
                    )}
                  </div>
                </div>
              </section>

              <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <article className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/25">
                      <UserRound className="size-5" />
                    </span>
                    <div>
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                        Care Profile
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Real resident information from Supabase.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-5">
                    <div className="rounded-2xl border border-border bg-background/60 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Care Level
                      </p>
                      <div className="mt-3">
                        <span className="rounded-full bg-primary/15 px-3 py-1.5 text-sm font-semibold text-primary ring-1 ring-primary/20">
                          {resident.careLevel}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-background/60 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Support Needs
                      </p>
                      {resident.primarySupportNeeds.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {resident.primarySupportNeeds.map((need) => (
                            <span
                              key={need}
                              className="rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground ring-1 ring-border/80"
                            >
                              {need}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-muted-foreground">
                          No support needs recorded yet.
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-border bg-background/60 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Notes
                      </p>
                      <div className="mt-3 rounded-2xl border border-border bg-card/80 p-4">
                        <p className="text-sm leading-relaxed text-foreground">
                          {resident.notes || 'No notes recorded yet.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>

                <div className="space-y-6">
                  <EmptyPanel
                    icon={<FileText className="size-5" />}
                    title="Report History"
                    message="No reports saved for this resident yet."
                    href="/shifts/new"
                    linkLabel="Document a shift"
                  />
                  <EmptyPanel
                    icon={<Workflow className="size-5" />}
                    title="Resident Tasks"
                    message="No tasks saved for this resident yet."
                    href="/tasks"
                    linkLabel="Open tasks"
                  />
                  <EmptyPanel
                    icon={<Pill className="size-5" />}
                    title="Medication History"
                    message="No medication entries saved for this resident yet."
                    href="/medications"
                    linkLabel="View medications"
                  />
                </div>
              </section>
            </>
          ) : (
            <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/12 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-amber-200 ring-1 ring-amber-400/20">
                  <span className="inline-flex size-2 rounded-full bg-amber-400" aria-hidden="true" />
                  Residents
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  Resident Not Found
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  The resident profile you requested is not available.
                </p>
              </div>

              <div className="mt-6">
                <EmptyPanel
                  title="Resident Profile"
                  message="The resident profile you requested is not available."
                  href="/residents"
                  linkLabel="Back to Residents"
                />
              </div>
            </section>
          )}
        </main>
      </div>
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
    <div className="rounded-2xl border border-border bg-card/95 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

function EmptyPanel({
  icon,
  title,
  message,
  href,
  linkLabel,
}: {
  icon?: React.ReactNode
  title: string
  message: string
  href: string
  linkLabel: string
}) {
  return (
    <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-background/60 text-muted-foreground ring-1 ring-border/80">
          {icon ?? <FileText className="size-5" />}
        </span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>

      <Link
        href={href}
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
      >
        {linkLabel}
      </Link>
    </section>
  )
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}