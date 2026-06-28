import { Fraunces, Geist } from "next/font/google"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const fraunces = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

export default function V0DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div
      className={`${geistSans.variable} ${fraunces.variable} bg-background font-sans antialiased`}
    >
      {children}
    </div>
  )
}