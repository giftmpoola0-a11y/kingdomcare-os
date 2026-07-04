import Image from 'next/image'
import Link from 'next/link'
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
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(217,164,65,0.22),_transparent_32%),radial-gradient(circle_at_20%_20%,_rgba(89,120,177,0.16),_transparent_24%),linear-gradient(180deg,_rgba(7,10,16,1)_0%,_rgba(11,14,22,1)_48%,_rgba(8,11,18,1)_100%)]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top,_rgba(255,215,140,0.22),_transparent_55%)]" />
      <div className="absolute left-1/2 top-1/2 -z-10 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-3xl" />

      <div className="w-full max-w-md">
        <div className="rounded-[2rem] border border-white/10 bg-card/95 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-8">
          <div className="mb-8 text-center">
            <Link href="/" className="inline-flex items-center justify-center rounded-[1.5rem] border border-white/10 bg-background/80 px-5 py-4 shadow-sm">
              <Image
                src="/brand/the-kingdom-care-homes-logo.png"
                alt="The Kingdom Care Homes"
                height={44}
                width={220}
                className="h-10 w-auto object-contain"
                priority
              />
            </Link>
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">{eyebrow}</p>
            <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>

          <div className="space-y-5">{children}</div>

          <div className="mt-6 border-t border-white/10 pt-5 text-center text-sm text-muted-foreground">{footer}</div>
        </div>
      </div>
    </main>
  )
}
