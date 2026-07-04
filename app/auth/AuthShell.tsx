import Image from 'next/image'
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
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden px-4 py-10 sm:py-12">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(58%_52%_at_50%_10%,_rgba(255,255,255,0.11),_transparent_72%)]" />
      <div
        className="absolute -top-20 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: 'rgba(255, 255, 255, 0.06)' }}
      />

      <section className="relative w-full max-w-[520px]">
        <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(36,36,39,0.9)_0%,rgba(22,22,24,0.96)_100%)] p-8 shadow-[0_28px_72px_rgba(0,0,0,0.44)] backdrop-blur-xl sm:p-10">
          <div className="flex size-16 items-center justify-center rounded-[1.4rem] bg-white/[0.045] ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="relative size-10 overflow-hidden rounded-xl">
              <Image
                src="/brand/the-kingdom-care-homes-logo.png"
                alt="The Kingdom Care Homes butterfly mark"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/62">{eyebrow}</p>
          <h1 className="mt-3 text-[1.95rem] font-semibold tracking-[-0.03em] text-white sm:text-[2.35rem]">{title}</h1>
          <p className="mt-3 max-w-[26rem] text-sm leading-7 text-white/58">{description}</p>

          <div className="mt-8">{children}</div>

          <div className="mt-6 text-center text-sm text-white/56">{footer}</div>
        </div>
      </section>
    </main>
  )
}
