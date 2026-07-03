'use client'

import { useMemo, useState, useTransition } from 'react'
import { AlertTriangle, CheckCircle2, ClipboardList, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppSidebar } from '@/components/kingdomos-v0/app-sidebar'
import { AppTopbar } from '@/components/kingdomos-v0/app-topbar'
import type { ResidentRecord } from '@/app/lib/supabase/residents'
import type { TaskRecord } from '@/app/lib/supabase/tasks'
import type { SidebarBadgeCounts } from '@/app/lib/sidebar-badge-counts'
import { cn } from '@/lib/utils'
import { clearCompletedTasksAction, deleteTaskAction, toggleTaskCompletionAction } from './actions'

const FILTER_OPTIONS = ['Today', 'Pending', 'Completed', 'All'] as const

type TaskFilter = (typeof FILTER_OPTIONS)[number]

export interface TasksClientProps {
  initialTasks: TaskRecord[]
  activeResidents: ResidentRecord[]
  canManageTasks: boolean
  loadError: string | null
  sidebarBadgeCounts: SidebarBadgeCounts
}

export default function TasksClient({
  initialTasks,
  activeResidents,
  canManageTasks,
  loadError,
  sidebarBadgeCounts,
}: TasksClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [filter, setFilter] = useState<TaskFilter>('Pending')
  const [actionError, setActionError] = useState('')

  const visibleTasks = useMemo(
    () => initialTasks.filter((task) => task.status !== 'archived' && task.deletedAt === null),
    [initialTasks],
  )

  const todayKey = new Date().toISOString().slice(0, 10)

  const filteredTasks = useMemo(() => {
    if (filter === 'All') return visibleTasks
    if (filter === 'Pending') {
      return visibleTasks.filter((task) => task.status === 'open' || task.status === 'in_progress')
    }
    if (filter === 'Completed') {
      return visibleTasks.filter((task) => task.status === 'completed')
    }
    return visibleTasks.filter((task) => task.dueAt?.slice(0, 10) === todayKey)
  }, [filter, todayKey, visibleTasks])

  const summary = useMemo(() => {
    const tasksToday = visibleTasks.filter((task) => task.dueAt?.slice(0, 10) === todayKey).length
    const pending = visibleTasks.filter((task) => task.status === 'open' || task.status === 'in_progress').length
    const completedToday = visibleTasks.filter(
      (task) => task.completedAt && task.completedAt.slice(0, 10) === todayKey,
    ).length
    const urgentPending = visibleTasks.filter(
      (task) => (task.status === 'open' || task.status === 'in_progress') && task.priority === 'urgent',
    ).length

    return { tasksToday, pending, completedToday, urgentPending }
  }, [todayKey, visibleTasks])

  function handleToggleComplete(task: TaskRecord) {
    setActionError('')
    startTransition(async () => {
      const result = await toggleTaskCompletionAction({
        id: task.id,
        completed: task.status !== 'completed',
      })

      if (!result.success) {
        setActionError(result.error)
        return
      }

      router.refresh()
    })
  }

  function handleDeleteTask(id: string) {
    if (!window.confirm('Delete this task?')) return

    setActionError('')
    startTransition(async () => {
      const result = await deleteTaskAction(id)
      if (!result.success) {
        setActionError(result.error)
        return
      }
      router.refresh()
    })
  }

  function handleClearCompleted() {
    if (!window.confirm('Archive completed tasks from this view?')) return

    setActionError('')
    startTransition(async () => {
      const result = await clearCompletedTasksAction()
      if (!result.success) {
        setActionError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} badgeCounts={sidebarBadgeCounts} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar onMenu={() => setSidebarOpen(true)} />

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 lg:py-8">
          <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-500/12 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-amber-200 ring-1 ring-amber-400/20">
                  <span className="inline-flex size-2 rounded-full bg-amber-400" aria-hidden="true" />
                  Tasks Workspace
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  Daily Tasks
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Track house duties, resident activities, and follow-ups using real Supabase-backed tasks.
                </p>
              </div>

              {canManageTasks && (
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/tasks/new"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                  >
                    <Plus className="size-4" />
                    Create Task
                  </Link>
                  {visibleTasks.some((task) => task.status === 'completed') && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={handleClearCompleted}
                      className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Clear Completed
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Tasks today" value={summary.tasksToday} tone="gray" />
              <SummaryCard label="Pending" value={summary.pending} tone="amber" />
              <SummaryCard label="Completed today" value={summary.completedToday} tone="green" />
              <SummaryCard label="Urgent pending" value={summary.urgentPending} tone="red" />
            </div>
          </section>

          {(loadError || actionError) && (
            <p
              role="alert"
              className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200"
            >
              {loadError ?? actionError}
            </p>
          )}

          <div className="mt-6">
            <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-sm sm:p-7">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">Task List</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} shown
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {FILTER_OPTIONS.map((option) => {
                    const active = filter === option

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setFilter(option)}
                        className={cn(
                          'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-border bg-background/70 text-muted-foreground hover:bg-accent hover:text-foreground',
                        )}
                      >
                        {option}
                      </button>
                    )
                  })}
                </div>
              </div>

              {filteredTasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-background/60 p-8 text-center">
                  <p className="text-sm text-muted-foreground">No tasks match the current filter yet.</p>
                  {canManageTasks && visibleTasks.length === 0 ? (
                    <Link
                      href="/tasks/new"
                      className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                    >
                      <Plus className="size-4" />
                      Create the first task
                    </Link>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTasks.map((task) => {
                    const residentName = task.residentId
                      ? activeResidents.find((resident) => resident.id === task.residentId)?.name ?? 'Resident'
                      : 'House'
                    const isCompleted = task.status === 'completed'
                    const isUrgent = task.priority === 'urgent'

                    return (
                      <article
                        key={task.id}
                        className={cn(
                          'rounded-2xl border p-4 transition-colors',
                          isCompleted
                            ? 'border-emerald-400/20 bg-emerald-500/8'
                            : isUrgent
                              ? 'border-rose-400/20 bg-card'
                              : 'border-border bg-background/60',
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleToggleComplete(task)}
                            className={cn(
                              'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-60',
                              isCompleted
                                ? 'border-emerald-400 bg-emerald-400 text-emerald-950'
                                : 'border-amber-400/45 bg-amber-500/10 text-amber-300',
                            )}
                            aria-label={`Mark ${task.title} as ${isCompleted ? 'incomplete' : 'complete'}`}
                          >
                            {isCompleted ? <CheckCircle2 className="size-3.5" /> : <span className="size-2 rounded-full bg-current" />}
                          </button>

                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className={cn('text-sm font-semibold text-foreground', isCompleted && 'line-through text-muted-foreground')}>
                                    {task.title}
                                  </h3>
                                  <TaskStatusBadge task={task} />
                                  <span className="rounded-full border border-border bg-secondary/80 px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
                                    {task.category}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">Due {formatDue(task.dueAt)}</p>
                                <p className="mt-1 text-xs text-muted-foreground">Assigned to: {residentName}</p>
                              </div>

                              {canManageTasks && (
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-300 transition-colors hover:text-rose-200 disabled:opacity-60"
                                >
                                  <Trash2 className="size-3.5" />
                                  Delete
                                </button>
                              )}
                            </div>

                            {task.description && (
                              <p className="text-sm leading-relaxed text-muted-foreground">{task.description}</p>
                            )}
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'green' | 'amber' | 'red' | 'gray'
}) {
  const toneClass = {
    green: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200',
    amber: 'border-amber-400/20 bg-amber-500/10 text-amber-200',
    red: 'border-rose-400/20 bg-rose-500/10 text-rose-200',
    gray: 'border-border bg-background/60 text-foreground',
  }[tone]

  const Icon = {
    green: CheckCircle2,
    amber: ClipboardList,
    red: AlertTriangle,
    gray: ClipboardList,
  }[tone]

  return (
    <div className={cn('rounded-2xl border p-5 shadow-sm', toneClass)}>
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-black/10 ring-1 ring-white/10">
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-80">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  )
}

function TaskStatusBadge({ task }: { task: TaskRecord }) {
  if (task.status === 'completed') {
    return <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-400/35">Completed</span>
  }

  if (task.priority === 'urgent') {
    return <span className="rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-rose-300 ring-1 ring-rose-400/35">Urgent</span>
  }

  if (task.status === 'in_progress') {
    return <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300 ring-1 ring-amber-400/35">In progress</span>
  }

  return <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300 ring-1 ring-amber-400/35">Open</span>
}

function formatDue(dueAt: string | null) {
  if (!dueAt) return 'No due date'

  const date = new Date(dueAt)
  if (Number.isNaN(date.getTime())) return dueAt

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
