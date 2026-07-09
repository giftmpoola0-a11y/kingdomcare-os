import { getAppChromeProps } from '@/app/lib/app-chrome'
import { getAuthenticatedAppContext } from '@/app/lib/authenticated-app'
import { dashboardFont } from '@/app/lib/dashboard-font'
import { AuthenticatedAppShell } from '@/components/kingdomos-v0/authenticated-app-shell'

export default async function AuthenticatedAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { access } = await getAuthenticatedAppContext()

  return (
    <div className={`${dashboardFont.variable} bg-background font-sans antialiased`}>
      <div className="v0-dashboard-theme dark">
        <AuthenticatedAppShell {...getAppChromeProps(access)}>{children}</AuthenticatedAppShell>
      </div>
    </div>
  )
}
