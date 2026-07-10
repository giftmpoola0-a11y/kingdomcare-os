const APP_PERF_ENABLED = process.env.KC_PROFILE_APP === '1'

type PerfDetails = Record<string, unknown>

function now() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

export async function measureServerStep<T>(
  label: string,
  task: () => Promise<T>,
  details?: PerfDetails | (() => PerfDetails)
): Promise<T> {
  if (!APP_PERF_ENABLED) {
    return task()
  }

  const start = now()

  try {
    return await task()
  } finally {
    logServerPerf(label, now() - start, details)
  }
}

export function logServerPerf(
  label: string,
  durationMs: number,
  details?: PerfDetails | (() => PerfDetails)
) {
  if (!APP_PERF_ENABLED) {
    return
  }

  const resolvedDetails = typeof details === 'function' ? details() : details

  console.log(
    `[app-perf] ${JSON.stringify({
      label,
      ms: Number(durationMs.toFixed(1)),
      ...(resolvedDetails ?? {}),
    })}`
  )
}

export function isAppPerfEnabled() {
  return APP_PERF_ENABLED
}
