import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aeltdzjbyvmfmrlppxza.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlbHRkempieXZtZm1ybHBweHphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTAwODAsImV4cCI6MjA5MjUyNjA4MH0.PkAVLCZTQqEuVljJRL_3r0ATPcWA6SHvPGgrRw_GQcI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
