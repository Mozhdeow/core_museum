import {createClient} from '@supabase/supabase-js'
import type {Database} from '@/types/database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined
export const supabaseConfigured = Boolean(url && key && !/YOUR_|placeholder/i.test(`${url}${key}`))
export const supabase = supabaseConfigured ? createClient<Database>(url!, key!, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
}) : null

export function requireSupabase() {
    if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.') ;
    return supabase
}
