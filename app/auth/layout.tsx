import type { CSSProperties, ReactNode } from 'react'

const authThemeStyles = {
  '--background': 'oklch(0.145 0 0)',
  '--foreground': 'oklch(0.985 0 0)',
  '--card': 'oklch(0.228 0.004 0)',
  '--card-foreground': 'oklch(0.985 0 0)',
  '--primary': 'oklch(0.922 0 0)',
  '--primary-foreground': 'oklch(0.205 0 0)',
  '--muted-foreground': 'oklch(0.76 0 0)',
  '--border': 'oklch(1 0 0 / 11%)',
  '--input': 'oklch(1 0 0 / 14%)',
  '--ring': 'oklch(0.72 0 0)',
} as CSSProperties

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="v0-dashboard-theme dark min-h-screen bg-background font-sans text-foreground antialiased" style={authThemeStyles}>
      {children}
    </div>
  )
}
