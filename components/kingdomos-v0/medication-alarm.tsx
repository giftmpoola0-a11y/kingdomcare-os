'use client'

import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import Link from 'next/link'
import { BellRing, Volume2, X } from 'lucide-react'
import { CHROME_DATA_REFRESH_EVENT } from '@/app/lib/chrome-realtime'
import type {
  MedicationAlarmItem,
  MedicationAlarmsPayload,
} from '@/app/lib/chrome-medication-alarms'
import type { MembershipRole } from '@/app/lib/supabase/access'

const POLL_INTERVAL_MS = 60_000
const REFRESH_DEBOUNCE_MS = 140
const MAX_VISIBLE_TOASTS = 3
const DEFAULT_ACTION = {
  canManage: false as const,
  actionHref: '/staff?focus=medications#medication-reminders',
  actionLabel: 'Open staff workspace',
}

interface LoadMedicationAlarmsDeps {
  signal?: AbortSignal
  fetchingRef: MutableRefObject<boolean>
  pendingRefreshRef: MutableRefObject<boolean>
  playedAlertIdsRef: MutableRefObject<Set<string>>
  soundEnabledRef: MutableRefObject<boolean>
  setItems: (items: MedicationAlarmItem[]) => void
  setAlarmAction: (next: { canManage: boolean; actionHref: string; actionLabel: string }) => void
  setDismissedIds: (updater: (current: Set<string>) => Set<string>) => void
}

async function loadMedicationAlarms(deps: LoadMedicationAlarmsDeps) {
  const {
    signal,
    fetchingRef,
    pendingRefreshRef,
    playedAlertIdsRef,
    soundEnabledRef,
    setItems,
    setAlarmAction,
    setDismissedIds,
  } = deps

  if (fetchingRef.current) {
    pendingRefreshRef.current = true
    return
  }

  fetchingRef.current = true

  try {
    const response = await fetch('/api/chrome/medication-alarms', {
      signal,
      cache: 'no-store',
    })

    if (!response.ok) {
      return
    }

    const payload = (await response.json()) as Partial<MedicationAlarmsPayload>
    const nextItems = Array.isArray(payload.items) ? payload.items : []
    setItems(nextItems)
    setAlarmAction({
      canManage: payload.canManage === true,
      actionHref:
        typeof payload.actionHref === 'string' && payload.actionHref.length > 0
          ? payload.actionHref
          : DEFAULT_ACTION.actionHref,
      actionLabel:
        typeof payload.actionLabel === 'string' && payload.actionLabel.length > 0
          ? payload.actionLabel
          : DEFAULT_ACTION.actionLabel,
    })

    const overdueIds = new Set(nextItems.filter((item) => item.urgency === 'overdue').map((item) => item.id))

    for (const item of nextItems) {
      if (item.urgency !== 'overdue') continue
      if (playedAlertIdsRef.current.has(item.id)) continue

      playedAlertIdsRef.current.add(item.id)
      if (soundEnabledRef.current) {
        playChime()
      }
    }

    setDismissedIds((current) => {
      if (current.size === 0) return current
      const next = new Set(Array.from(current).filter((id) => overdueIds.has(id)))
      return next.size === current.size ? current : next
    })
  } catch {
    // Silent - this is a background convenience alarm, not a page the
    // user is actively waiting on. The medications page itself already
    // surfaces load errors.
  } finally {
    fetchingRef.current = false

    if (pendingRefreshRef.current && !signal?.aborted) {
      pendingRefreshRef.current = false
      void loadMedicationAlarms(deps)
    }
  }
}

export function MedicationAlarm({ role }: { role: MembershipRole | null }) {
  const canSeeAlarms = role === 'admin' || role === 'nurse' || role === 'caregiver'

  const [items, setItems] = useState<MedicationAlarmItem[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [soundOfferVisible, setSoundOfferVisible] = useState(true)
  const [alarmAction, setAlarmAction] = useState<{ canManage: boolean; actionHref: string; actionLabel: string }>(DEFAULT_ACTION)

  const fetchingRef = useRef(false)
  const pendingRefreshRef = useRef(false)
  const scheduledRefreshRef = useRef<number | null>(null)
  const playedAlertIdsRef = useRef<Set<string>>(new Set())
  const soundEnabledRef = useRef(false)
  const audioContextRef = useRef<AudioContext | null>(null)

  function requestMedicationAlarmRefresh(options?: { signal?: AbortSignal; immediate?: boolean }) {
    if (scheduledRefreshRef.current !== null) {
      window.clearTimeout(scheduledRefreshRef.current)
      scheduledRefreshRef.current = null
    }

    const run = () =>
      loadMedicationAlarms({
        signal: options?.signal,
        fetchingRef,
        pendingRefreshRef,
        playedAlertIdsRef,
        soundEnabledRef,
        setItems,
        setAlarmAction,
        setDismissedIds,
      })

    if (options?.immediate) {
      void run()
      return
    }

    scheduledRefreshRef.current = window.setTimeout(() => {
      scheduledRefreshRef.current = null
      void run()
    }, REFRESH_DEBOUNCE_MS)
  }

  useEffect(() => {
    if (!canSeeAlarms) return

    const controller = new AbortController()
    requestMedicationAlarmRefresh({ signal: controller.signal, immediate: true })
    return () => {
      controller.abort()
      if (scheduledRefreshRef.current !== null) {
        window.clearTimeout(scheduledRefreshRef.current)
      }
    }
  }, [canSeeAlarms])

  useEffect(() => {
    if (!canSeeAlarms) return

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        requestMedicationAlarmRefresh()
      }
    }

    function handleChromeRefresh() {
      requestMedicationAlarmRefresh()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleVisibilityChange)
    window.addEventListener(CHROME_DATA_REFRESH_EVENT, handleChromeRefresh)

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        requestMedicationAlarmRefresh()
      }
    }, POLL_INTERVAL_MS)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleVisibilityChange)
      window.removeEventListener(CHROME_DATA_REFRESH_EVENT, handleChromeRefresh)
      window.clearInterval(interval)
    }
  }, [canSeeAlarms])

  if (!canSeeAlarms) {
    return null
  }

  const overdueItems = items.filter((item) => item.urgency === 'overdue' && !dismissedIds.has(item.id))
  const visibleItems = overdueItems.slice(0, MAX_VISIBLE_TOASTS)
  const overflowCount = overdueItems.length - visibleItems.length

  function handleEnableSound() {
    soundEnabledRef.current = true
    setSoundEnabled(true)
    setSoundOfferVisible(false)
    playChime(getAudioContext(audioContextRef))
  }

  function handleDismiss(id: string) {
    setDismissedIds((current) => new Set(current).add(id))
  }

  if (overdueItems.length === 0) {
    return null
  }

  return (
    <div
      className="v0-dashboard-theme dark fixed right-4 top-20 z-40 w-[min(24rem,calc(100vw-2rem))] space-y-2 font-sans"
      role="region"
      aria-label="Medication alarms"
      aria-live="polite"
    >
      {!soundEnabled && soundOfferVisible ? (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-card/95 px-4 py-2.5 text-xs text-muted-foreground shadow-[0_16px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl anim-scale-in">
          <span>Enable a subtle sound for overdue medication alerts?</span>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={handleEnableSound}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Volume2 className="size-3.5" />
              Enable sound
            </button>
            <button
              type="button"
              onClick={() => setSoundOfferVisible(false)}
              aria-label="Dismiss sound prompt"
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      ) : null}

      {visibleItems.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 rounded-2xl border border-rose-400/30 bg-card/95 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)] ring-1 ring-rose-400/20 backdrop-blur-xl anim-scale-in"
        >
          <span
            className="flex size-9 shrink-0 animate-pulse items-center justify-center rounded-xl bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/35"
            aria-hidden="true"
          >
            <BellRing className="size-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-rose-200">
              Medication alert overdue: {item.residentName ?? 'Unlinked resident'}
              {item.medicationName ? ` - ${item.medicationName}` : ''}
            </p>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.message}</p>
            <Link
              href={alarmAction.actionHref}
              className="mt-2 inline-flex items-center text-xs font-semibold text-rose-200 underline decoration-rose-400/40 underline-offset-2 hover:text-rose-100"
            >
              {alarmAction.actionLabel}
            </Link>
          </div>
          <button
            type="button"
            onClick={() => handleDismiss(item.id)}
            aria-label="Dismiss this alarm"
            className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}

      {overflowCount > 0 ? (
        <Link
          href={alarmAction.actionHref}
          className="block rounded-2xl border border-white/10 bg-card/90 px-4 py-2.5 text-xs font-semibold text-muted-foreground shadow-sm backdrop-blur-xl transition-colors hover:bg-accent hover:text-foreground"
        >
          +{overflowCount} more overdue medication alert{overflowCount === 1 ? '' : 's'}
        </Link>
      ) : null}
    </div>
  )
}

function getAudioContext(ref: MutableRefObject<AudioContext | null>): AudioContext | null {
  if (typeof window === 'undefined') return null

  const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  if (!AudioContextCtor) return null

  if (!ref.current) {
    ref.current = new AudioContextCtor()
  }

  if (ref.current.state === 'suspended') {
    void ref.current.resume()
  }

  return ref.current
}

function playChime(context?: AudioContext | null) {
  try {
    const ctx = context ?? new (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const now = ctx.currentTime
    const notes = [660, 880]

    notes.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency

      const start = now + index * 0.16
      const end = start + 0.22

      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.08, start + 0.02)
      gain.gain.linearRampToValueAtTime(0, end)

      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.start(start)
      oscillator.stop(end)
    })
  } catch {
    // Browsers can block autoplay/audio context creation until a user gesture.
    // Silently ignore and keep the visual alarm visible.
  }
}
