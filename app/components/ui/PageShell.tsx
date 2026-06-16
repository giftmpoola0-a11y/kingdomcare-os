import AppHeader from '@/app/components/AppHeader'

interface PageShellProps {
  subtitle?: string
  children: React.ReactNode
  printFriendly?: boolean
}

export default function PageShell({
  subtitle,
  children,
  printFriendly = false,
}: PageShellProps) {
  return (
    <div
      className={[
        'relative min-h-screen',
        !printFriendly ? 'kc-bg-grid bg-[#FAF9F7]' : 'bg-white',
        printFriendly ? 'print:bg-white' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Subtle ambient top glow */}
      {!printFriendly && (
        <div
          className="pointer-events-none fixed top-0 left-0 right-0 z-0 h-72 overflow-hidden"
          aria-hidden="true"
        >
          <div className="absolute left-1/2 top-0 h-48 w-[800px] -translate-x-1/2 rounded-b-full bg-blue-500/4 blur-3xl" />
        </div>
      )}

      <div className="relative z-10">
        <AppHeader subtitle={subtitle} className={printFriendly ? 'print:hidden' : ''} />

        {/* Prototype warning banner */}
        <div
          className={[
            'anim-slide-down border-b border-amber-200/70 bg-amber-50/95',
            printFriendly ? 'print:hidden' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          role="alert"
          aria-label="Prototype warning"
        >
          <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5 sm:px-6">
            <span className="shrink-0 text-xs font-bold text-amber-500" aria-hidden="true">
              ◆
            </span>
            <p className="text-[11px] font-semibold text-amber-800">
              Prototype only — do not enter real resident, care, medication, or incident
              information. Data is stored locally in this browser only.
            </p>
          </div>
        </div>

        {children}
      </div>
    </div>
  )
}
