import { Plus_Jakarta_Sans } from "next/font/google"

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-v0-sans",
  subsets: ["latin"],
})

export default function V0DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className={`${plusJakartaSans.variable} bg-background font-sans antialiased`}>
      {children}
    </div>
  )
}