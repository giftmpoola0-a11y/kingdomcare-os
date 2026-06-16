import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  subtitle?: string
  action?: ReactNode
  maxWidth?: string
}

export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
  maxWidth = 'max-w-6xl',
}: PageHeaderProps) {
  return (
    <div className="anim-slide-down border-b border-slate-200 bg-white">
      <div
        className={`${maxWidth} mx-auto flex flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6`}
      >
        <div className="anim-fade-up">
          {eyebrow && (
            <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-blue-600">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {action && (
          <div className="anim-fade-up anim-delay-100 shrink-0">
            {action}
          </div>
        )}
      </div>
    </div>
  )
}
