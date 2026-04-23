import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jngofylkynipsnzyyzdq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuZ29meWxreW5pcHNuenl5emRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NjIzNDEsImV4cCI6MjA5MjUzODM0MX0.FWvc_DwabUSkxgHVwKRA3T2SMTlQ7aQr12a7yGUEW64'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
