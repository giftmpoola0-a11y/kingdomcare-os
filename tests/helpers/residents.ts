import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../app/lib/supabase/database.types'

const PLAYWRIGHT_RESIDENT_PREFIX = 'Playwright Test Resident '
const E2E_TEST_EMAIL = process.env.E2E_TEST_EMAIL
const E2E_TEST_PASSWORD = process.env.E2E_TEST_PASSWORD
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

interface ActiveResidentRow {
  id: string
  full_name: string
}

interface CleanupOptions {
  diagnostics?: string[]
  residentNames?: string[]
}

export async function cleanupPlaywrightResidents(options: CleanupOptions = {}) {
  const residents = await findActivePlaywrightResidents(options)

  if (residents.length === 0) {
    options.diagnostics?.push('playwright resident cleanup matched 0 active rows')
    return []
  }

  const supabase = await createAdminTestSupabaseClient()
  const deletedAt = new Date().toISOString()
  const ids = residents.map((resident) => resident.id)

  options.diagnostics?.push(
    `playwright resident cleanup matched: ${residents.map((resident) => resident.full_name).join(', ')}`
  )

  const { error } = await supabase
    .from('residents')
    .update({
      deleted_at: deletedAt,
      status: 'archived',
    })
    .in('id', ids)
    .is('deleted_at', null)

  if (error) {
    throw new Error(`Playwright resident cleanup failed: ${error.message}`)
  }

  const { data: verifyRows, error: verifyError } = await supabase
    .from('residents')
    .select('id, full_name')
    .in('id', ids)
    .eq('status', 'active')
    .is('deleted_at', null)

  if (verifyError) {
    throw new Error(`Playwright resident cleanup verification failed: ${verifyError.message}`)
  }

  if ((verifyRows ?? []).length > 0) {
    throw new Error(
      `Playwright resident cleanup left active rows: ${verifyRows!.map((row) => row.full_name).join(', ')}`
    )
  }

  return residents
}

export async function findActivePlaywrightResidents(options: CleanupOptions = {}) {
  const supabase = await createAdminTestSupabaseClient()
  const careHomeId = await getAdminCareHomeId(supabase)
  const residentNames = normalizeResidentNames(options.residentNames)

  let query = supabase
    .from('residents')
    .select('id, full_name')
    .eq('care_home_id', careHomeId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (residentNames.length > 0) {
    query = query.in('full_name', residentNames)
  } else {
    query = query.ilike('full_name', `${PLAYWRIGHT_RESIDENT_PREFIX}%`)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Playwright resident lookup failed: ${error.message}`)
  }

  return (data ?? []) as ActiveResidentRow[]
}

async function createAdminTestSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Missing Supabase URL or publishable key for Playwright resident cleanup.')
  }

  if (!E2E_TEST_EMAIL || !E2E_TEST_PASSWORD) {
    throw new Error('Missing E2E admin credentials for Playwright resident cleanup.')
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const {
    data: { user },
    error,
  } = await supabase.auth.signInWithPassword({
    email: E2E_TEST_EMAIL,
    password: E2E_TEST_PASSWORD,
  })

  if (error || !user) {
    throw new Error(error?.message ?? 'Unable to sign in test admin for resident cleanup.')
  }

  return supabase
}

async function getAdminCareHomeId(
  supabase: ReturnType<typeof createClient<Database>>
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error(userError?.message ?? 'Unable to resolve test admin user for resident cleanup.')
  }

  const { data, error } = await supabase
    .from('care_home_members')
    .select('care_home_id, role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Unable to resolve test admin care home: ${error.message}`)
  }

  if (!data?.care_home_id) {
    throw new Error('Test admin is missing an admin care home membership for resident cleanup.')
  }

  return data.care_home_id
}

function normalizeResidentNames(residentNames: string[] | undefined) {
  return Array.from(
    new Set(
      (residentNames ?? [])
        .map((residentName) => residentName.trim())
        .filter((residentName) => residentName.startsWith(PLAYWRIGHT_RESIDENT_PREFIX))
    )
  )
}

