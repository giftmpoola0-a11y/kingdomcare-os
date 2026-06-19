import type { Metadata, Viewport } from 'next'
import { Fraunces, Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import MedicationReminderWatcher from '@/app/components/MedicationReminderWatcher'
import { cn } from '@/lib/utils'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })

const fraunces = Fraunces({
  variable: '--font-heading',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const geistMono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
})

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
    <html
      lang="en"
      className={cn(
        'h-full',
        'antialiased',
        geistSans.variable,
        fraunces.variable,
        geistMono.variable,
        'font-sans'
      )}
    >
      <body className="min-h-full font-sans">
        {children}
        <MedicationReminderWatcher />
      </body>
    </html>
  )
}
