import { ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'

interface AuthShellProps {
  eyebrow: string
  title: string
  description: string
  footer: ReactNode
  children: ReactNode
}

export default function AuthShell({ eyebrow, title, description, footer, children }: AuthShellProps) {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_55%_at_50%_12%,_rgba(255,255,255,0.08),_transparent_70%)]" />
      <div
        className="absolute -top-24 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: 'rgba(255, 255, 255, 0.07)' }}
      />

      <section className="relative w-full max-w-[520px]">
        <div className="rounded-3xl border border-border bg-card/80 p-8 shadow-2xl shadow-black/40 backdrop-blur-sm sm:p-10">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-white/6 ring-1 ring-white/10">
            <ShieldCheck className="size-6 text-foreground" aria-hidden="true" />
          </div>

          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-foreground/68">{eyebrow}</p>
          <h1 className="mt-2 text-2xl font-semibold leading-tight text-balance sm:text-3xl">{title}</h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground text-pretty">{description}</p>

          <div className="mt-8">{children}</div>

          <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
        </div>
      </section>
    </main>
  )
}
