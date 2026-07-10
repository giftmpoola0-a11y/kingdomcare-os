import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/app/lib/supabase/database.types'

export type TypedSupabaseClient = SupabaseClient<Database>
