export const CHROME_DATA_REFRESH_EVENT = 'kingdomcare:chrome-data-refresh'

export type ChromeDataRefreshSource = 'medication-alerts'

export interface ChromeDataRefreshDetail {
  source: ChromeDataRefreshSource
  careHomeId: string
}

export function dispatchChromeDataRefresh(detail: ChromeDataRefreshDetail) {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent<ChromeDataRefreshDetail>(CHROME_DATA_REFRESH_EVENT, {
      detail,
    }),
  )
}
