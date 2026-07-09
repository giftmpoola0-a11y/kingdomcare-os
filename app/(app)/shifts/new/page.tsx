import { getAuthenticatedAppContext } from '@/app/lib/authenticated-app'
import { getActiveCurrentCareHomeResidents, type ResidentRecord } from '@/app/lib/supabase/residents'
import NewShiftClient from './NewShiftClient'

interface NewShiftPageProps {
  searchParams: Promise<{ residentId?: string | string[] }>
}

export default async function NewShiftPage({ searchParams }: NewShiftPageProps) {
  const resolvedSearchParams = await searchParams
  const residentIdParam = resolvedSearchParams.residentId
  const initialResidentId = typeof residentIdParam === 'string' ? residentIdParam : null

  await getAuthenticatedAppContext()

  let activeResidents: ResidentRecord[] = []
  let loadError: string | null = null

  try {
    activeResidents = await getActiveCurrentCareHomeResidents()
  } catch (error) {
    console.error('Failed to load residents for new shift report:', error)
    loadError = 'Unable to load residents. Please refresh the page.'
  }

  return (
    <NewShiftClient
      activeResidents={activeResidents}
      initialResidentId={initialResidentId}
      loadError={loadError}
    />
  )
}
