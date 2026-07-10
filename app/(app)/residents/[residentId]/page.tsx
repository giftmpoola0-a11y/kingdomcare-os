import { notFound } from 'next/navigation'
import { measureServerStep } from '@/app/lib/perf'
import { getAuthenticatedAppContext } from '@/app/lib/authenticated-app'
import { getResidentById, type ResidentRecord } from '@/app/lib/supabase/residents'
import ResidentDetailClient from './ResidentDetailClient'

export default async function ResidentDetailPage(props: PageProps<'/residents/[residentId]'>) {
  return measureServerStep('route:/residents/[residentId]', async () => {
    const { residentId } = await props.params
    const { access } = await getAuthenticatedAppContext()

    let resident: ResidentRecord | null = null

    try {
      resident = await getResidentById(residentId)
    } catch (error) {
      console.error('Failed to load resident detail:', error)
      notFound()
    }

    if (!resident) {
      notFound()
    }

    return <ResidentDetailClient resident={resident} canManage={access.role === 'admin'} />
  })
}
