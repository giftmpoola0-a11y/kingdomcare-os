import { redirect } from 'next/navigation'
import { getAuthenticatedAppContext } from '@/app/lib/authenticated-app'
import StaffManagementClient from './StaffManagementClient'

export default async function StaffManagementPage() {
  const { access } = await getAuthenticatedAppContext()

  if (access.role !== 'admin') {
    redirect('/staff')
  }

  return <StaffManagementClient />
}
