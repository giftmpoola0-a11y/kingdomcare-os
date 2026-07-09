import { getAuthenticatedAppContext } from '@/app/lib/authenticated-app'
import AccountClient from './AccountClient'

export default async function AccountPage() {
  await getAuthenticatedAppContext()

  return <AccountClient />
}
