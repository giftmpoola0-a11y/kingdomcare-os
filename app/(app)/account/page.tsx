import { measureServerStep } from '@/app/lib/perf'
import { getAuthenticatedAppContext } from '@/app/lib/authenticated-app'
import AccountClient from './AccountClient'

export default async function AccountPage() {
  return measureServerStep('route:/account', async () => {
    const { access } = await getAuthenticatedAppContext()

    return (
      <AccountClient
        initialAccount={{
          userId: access.user?.id ?? '',
          email: access.user?.email ?? access.profile?.email ?? '',
          fullName: access.profile?.fullName ?? '',
          careHomeName: access.membership?.careHomeName ?? access.careHomeName,
          role: access.membership?.role ?? access.role,
        }}
      />
    )
  })
}
