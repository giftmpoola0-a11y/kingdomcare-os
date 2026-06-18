import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import MedicationReminderWatcher from '@/app/components/MedicationReminderWatcher'
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'})

const geistMono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'KingdomCare OS',
  description: 'Care home shift documentation and resident reporting',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={cn("h-full", "antialiased", geistMono.variable, "font-sans", geist.variable)}>
      <body className="min-h-full">
        {children}
        <MedicationReminderWatcher />
      </body>
    </html>
  )
}
