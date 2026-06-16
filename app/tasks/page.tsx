'use client'

import { useEffect, useMemo, useState } from 'react'
import PageShell from '@/app/components/ui/PageShell'
import PageHeader from '@/app/components/ui/PageHeader'
import SectionCard from '@/app/components/ui/SectionCard'
import EmptyState from '@/app/components/ui/EmptyState'
import StatusBadge from '@/app/components/ui/StatusBadge'
import { loadResidents } from '@/app/lib/residents'
import {
  clearCompletedTasks,
  deleteTask,
  loadTasks,
  saveTask,
  toggleTaskComplete,
} from '@/app/lib/tasks'
import {
  TASK_ASSIGNED_TO_TYPES,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  type SavedTask,
  type TaskAssignedToType,
  type TaskCategory,
  type TaskPriority,
} from '@/app/lib/taskTypes'
import type { DemoResident } from '@/app/lib/reportTypes'

const QUICK_TASK_CHIPS = [
  'Clean kitchen',
  'Clean bathroom',
  'Take out trash',
  'Prepare breakfast',
  'Prepare lunch',
  'Prepare dinner',
  'Laundry',
  'Check supplies',
  'Restock gloves',
  'Restock wipes',
  'Resident walk/activity',
  'Document follow-up',
  'Call supervisor',
  'Check common area',
  'End-of-shift handoff',
]

const FILTER_OPTIONS = ['Today', 'Pending', 'Completed', 'All'] as const
type TaskFilter = (typeof FILTER_OPTIONS)[number]

const INPUT_CLASS =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

const TEXTAREA_CLASS =
  'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none'

const PRIORITY_BADGE_CLASSES: Record<TaskPriority, string> = {
  Low: 'bg-slate-100 text-slate-700',
  Normal: 'bg-blue-100 text-blue-700',
  High: 'bg-amber-100 text-amber-800',
  Urgent: 'bg-red-100 text-red-700',
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<SavedTask[]>([])
  const [residents, setResidents] = useState<DemoResident[]>([])
  const [filter, setFilter] = useState<TaskFilter>('Pending')
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    priority: '',
    dueDate: '',
    dueTime: '',
    assignedToType: 'House',
    residentId: '',
  })
  const [errors, setErrors] = useState<{
    title?: string
    category?: string
    priority?: string
    dueDate?: string
    residentId?: string
  }>({})

  useEffect(() => {
    setTasks(loadTasks())
    setResidents(loadResidents())
  }, [])

  const activeResidents = residents.filter((resident) => resident.status !== 'archived')
  const todayKey = new Date().toISOString().slice(0, 10)

  const filteredTasks = useMemo(() => {
    if (filter === 'All') return tasks
    if (filter === 'Pending') return tasks.filter((task) => !task.completed)
    if (filter === 'Completed') return tasks.filter((task) => task.completed)
    return tasks.filter((task) => task.dueDate === todayKey)
  }, [filter, tasks, todayKey])

  const summary = useMemo(() => {
    const tasksToday = tasks.filter((task) => task.dueDate === todayKey).length
    const pending = tasks.filter((task) => !task.completed).length
    const completedToday = tasks.filter(
      (task) => task.completedAt && task.completedAt.slice(0, 10) === todayKey
    ).length
    const urgentPending = tasks.filter(
      (task) => !task.completed && task.priority === 'Urgent'
    ).length

    return { tasksToday, pending, completedToday, urgentPending }
  }, [tasks, todayKey])

  function refreshTasks() {
    setTasks(loadTasks())
  }

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value }

      if (field === 'assignedToType' && value === 'House') {
        next.residentId = ''
      }

      return next
    })

    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  function handleQuickTask(title: string) {
    setForm((prev) => ({ ...prev, title }))
    if (errors.title) {
      setErrors((prev) => ({ ...prev, title: undefined }))
    }
  }

  function validateForm() {
    const nextErrors: typeof errors = {}

    if (!form.title.trim()) nextErrors.title = 'Task title is required.'
    if (!form.category) nextErrors.category = 'Category is required.'
    if (!form.priority) nextErrors.priority = 'Priority is required.'
    if (!form.dueDate) nextErrors.dueDate = 'Due date is required.'
    if (form.assignedToType === 'Resident' && !form.residentId) {
      nextErrors.residentId = 'Resident selection is required.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function resetForm() {
    setForm({
      title: '',
      description: '',
      category: '',
      priority: '',
      dueDate: '',
      dueTime: '',
      assignedToType: 'House',
      residentId: '',
    })
    setErrors({})
  }

  function handleSubmit() {
    if (!validateForm()) return

    const resident =
      form.assignedToType === 'Resident'
        ? activeResidents.find((entry) => entry.id === form.residentId)
        : undefined

    saveTask({
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category as TaskCategory,
      priority: form.priority as TaskPriority,
      dueDate: form.dueDate,
      dueTime: form.dueTime,
      assignedToType: form.assignedToType as TaskAssignedToType,
      residentId: resident?.id,
      residentNameSnapshot: resident?.name,
      completed: false,
      completedAt: undefined,
    })

    refreshTasks()
    resetForm()
  }

  function handleToggleComplete(id: string) {
    toggleTaskComplete(id)
    refreshTasks()
  }

  function handleDeleteTask(id: string) {
    if (!window.confirm('Delete this task?')) return
    deleteTask(id)
    refreshTasks()
  }

  function handleClearCompleted() {
    if (!window.confirm('Clear completed tasks?')) return
    clearCompletedTasks()
    refreshTasks()
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Tasks"
        title="Daily Tasks"
        subtitle="Track house duties, resident activities, and daily follow-ups."
        maxWidth="max-w-6xl"
        action={
          tasks.some((task) => task.completed) ? (
            <button
              type="button"
              onClick={handleClearCompleted}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              Clear Completed
            </button>
          ) : undefined
        }
      />

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
        <SectionCard className="border-amber-200 bg-amber-50/70 p-4">
          <p className="text-sm font-medium text-amber-900">
            Prototype only. Do not enter real resident or care information.
          </p>
        </SectionCard>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Tasks today" value={summary.tasksToday} tone="blue" />
          <SummaryCard label="Pending" value={summary.pending} tone="slate" />
          <SummaryCard label="Completed today" value={summary.completedToday} tone="emerald" />
          <SummaryCard label="Urgent pending" value={summary.urgentPending} tone="red" />
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <SectionCard className="p-6">
            <h2 className="mb-5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Add Task
            </h2>

            <div className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="taskTitle" className="block text-sm font-medium text-slate-700">
                  Task title
                </label>
                <input
                  id="taskTitle"
                  type="text"
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className={INPUT_CLASS}
                />
                {errors.title && <p className="text-xs text-red-600">{errors.title}</p>}
              </div>

              <div className="flex flex-wrap gap-2">
                {QUICK_TASK_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleQuickTask(chip)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-800"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="taskDescription"
                  className="block text-sm font-medium text-slate-700"
                >
                  Description
                </label>
                <textarea
                  id="taskDescription"
                  rows={3}
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className={TEXTAREA_CLASS}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="taskCategory" className="block text-sm font-medium text-slate-700">
                    Category
                  </label>
                  <select
                    id="taskCategory"
                    value={form.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    className={INPUT_CLASS}
                  >
                    <option value="">Select category...</option>
                    {TASK_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  {errors.category && <p className="text-xs text-red-600">{errors.category}</p>}
                </div>

                <div className="space-y-1">
                  <label htmlFor="taskPriority" className="block text-sm font-medium text-slate-700">
                    Priority
                  </label>
                  <select
                    id="taskPriority"
                    value={form.priority}
                    onChange={(e) => handleChange('priority', e.target.value)}
                    className={INPUT_CLASS}
                  >
                    <option value="">Select priority...</option>
                    {TASK_PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                  {errors.priority && <p className="text-xs text-red-600">{errors.priority}</p>}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="taskDueDate" className="block text-sm font-medium text-slate-700">
                    Due date
                  </label>
                  <input
                    id="taskDueDate"
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => handleChange('dueDate', e.target.value)}
                    className={INPUT_CLASS}
                  />
                  {errors.dueDate && <p className="text-xs text-red-600">{errors.dueDate}</p>}
                </div>

                <div className="space-y-1">
                  <label htmlFor="taskDueTime" className="block text-sm font-medium text-slate-700">
                    Due time
                  </label>
                  <input
                    id="taskDueTime"
                    type="time"
                    value={form.dueTime}
                    onChange={(e) => handleChange('dueTime', e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="taskAssignedToType"
                  className="block text-sm font-medium text-slate-700"
                >
                  Assign to
                </label>
                <select
                  id="taskAssignedToType"
                  value={form.assignedToType}
                  onChange={(e) => handleChange('assignedToType', e.target.value)}
                  className={INPUT_CLASS}
                >
                  {TASK_ASSIGNED_TO_TYPES.map((assignedToType) => (
                    <option key={assignedToType} value={assignedToType}>
                      {assignedToType}
                    </option>
                  ))}
                </select>
              </div>

              {form.assignedToType === 'Resident' && (
                <div className="space-y-2">
                  {activeResidents.length === 0 ? (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      Add a resident before assigning resident tasks.
                    </p>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <label
                          htmlFor="taskResidentId"
                          className="block text-sm font-medium text-slate-700"
                        >
                          Resident
                        </label>
                        <select
                          id="taskResidentId"
                          value={form.residentId}
                          onChange={(e) => handleChange('residentId', e.target.value)}
                          className={INPUT_CLASS}
                        >
                          <option value="">Select a resident...</option>
                          {activeResidents.map((resident) => (
                            <option key={resident.id} value={resident.id}>
                              {resident.name}
                            </option>
                          ))}
                        </select>
                        {errors.residentId && (
                          <p className="text-xs text-red-600">{errors.residentId}</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 hover:shadow-md active:scale-[0.99] active:bg-blue-800"
                >
                  Save Task
                </button>
              </div>
            </div>
          </SectionCard>

          <SectionCard className="p-6">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Task List
                </h2>
                <p className="mt-1 text-sm text-slate-500">
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
                      className={[
                        'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                        active
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                      ].join(' ')}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            </div>

            {filteredTasks.length === 0 ? (
              <EmptyState message="No tasks match the current filter yet." />
            ) : (
              <div className="space-y-3">
                {filteredTasks.map((task) => (
                  <article
                    key={task.id}
                    className={[
                      'rounded-2xl border border-slate-200 p-4 transition-colors',
                      task.completed ? 'bg-slate-50/80 opacity-75' : 'bg-white',
                    ].join(' ')}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => handleToggleComplete(task.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                        aria-label={`Mark ${task.title} as ${task.completed ? 'incomplete' : 'complete'}`}
                      />

                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3
                                className={[
                                  'text-sm font-semibold text-slate-900',
                                  task.completed ? 'line-through text-slate-500' : '',
                                ].join(' ')}
                              >
                                {task.title}
                              </h3>
                              <StatusBadge
                                label={task.priority}
                                colorClass={PRIORITY_BADGE_CLASSES[task.priority]}
                              />
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                                {task.category}
                              </span>
                              {task.completed && (
                                <StatusBadge
                                  label="Completed"
                                  colorClass="bg-emerald-100 text-emerald-700"
                                />
                              )}
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              Due {formatDue(task.dueDate, task.dueTime)}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              Assigned to:{' '}
                              {task.assignedToType === 'Resident'
                                ? task.residentNameSnapshot || 'Resident'
                                : 'House'}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task.id)}
                            className="shrink-0 text-xs font-semibold text-red-500 transition-colors hover:text-red-700"
                          >
                            Delete
                          </button>
                        </div>

                        {task.description && (
                          <p className="text-sm leading-relaxed text-slate-600">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </main>
    </PageShell>
  )
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'blue' | 'slate' | 'emerald' | 'red'
}) {
  const toneClass = {
    blue: 'text-blue-700 bg-blue-50 border-blue-100',
    slate: 'text-slate-700 bg-slate-50 border-slate-200',
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    red: 'text-red-700 bg-red-50 border-red-100',
  }[tone]

  return (
    <SectionCard className={`p-5 ${toneClass}`}>
      <p className="text-[11px] font-bold uppercase tracking-widest opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
    </SectionCard>
  )
}

function formatDue(dueDate: string, dueTime: string) {
  const combined = dueTime ? new Date(`${dueDate}T${dueTime}`) : new Date(dueDate)
  if (Number.isNaN(combined.getTime())) {
    return [dueDate, dueTime].filter(Boolean).join(' ').trim()
  }

  return combined.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...(dueTime
      ? {
          hour: 'numeric' as const,
          minute: '2-digit' as const,
        }
      : {}),
  })
}
