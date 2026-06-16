import Link from 'next/link'

interface EmptyStateProps {
  message: string
  linkHref?: string
  linkLabel?: string
  className?: string
}

export default function EmptyState({
  message,
  linkHref,
  linkLabel,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`anim-fade-in rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-16 text-center ${className}`}
    >
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
        <span className="text-xl leading-none text-slate-300" aria-hidden="true">—</span>
      </div>
      <p className="text-sm font-medium text-slate-500">{message}</p>
      {linkHref && linkLabel && (
        <Link
          href={linkHref}
          className="mt-4 inline-flex items-center gap-1 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 hover:shadow-md active:scale-[0.98]"
        >
          {linkLabel}
          <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  )
}
