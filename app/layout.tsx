import type { Metadata, Viewport } from 'next'
import './globals.css'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'KingdomCare OS — Daily Operations Command Center',
  description:
    'KingdomCare OS is the daily operations command center for The Kingdom Care Homes — manage residents, tasks, shift notes, incidents, medications, and staff.',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f6efe2',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={cn('h-full', 'antialiased', 'font-sans')}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  )
}
