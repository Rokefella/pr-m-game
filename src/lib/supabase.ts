import { createClient } from '@supabase/supabase-js'
import { fetchWithTimeout, setSessionRefresher } from '@/lib/netQueue'

const supabaseUrl = 'https://jngofylkynipsnzyyzdq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuZ29meWxreW5pcHNuenl5emRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NjIzNDEsImV4cCI6MjA5MjUzODM0MX0.FWvc_DwabUSkxgHVwKRA3T2SMTlQ7aQr12a7yGUEW64'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'praem-auth-token',
  },
  // Every request (including token refresh) gives up after 6 s instead of hanging.
  global: { fetch: (input, init) => fetchWithTimeout(input, init) },
})

setSessionRefresher(() => supabase.auth.refreshSession())
