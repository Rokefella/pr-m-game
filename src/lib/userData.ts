import { supabase } from './supabase'

export type UserRow = {
  id: string
  level: number
  credits: number
  steps_remaining: number
  title: string
  aura_color: string | null
  username: string | null
  entity_answer: string | null
  levelup_pending: boolean
  levelup_newlevel: number | null
  maze_completed_level: number
  registration_number: number
}

const DEFAULTS: Omit<UserRow, 'id'> = {
  level: 1,
  credits: 50,
  steps_remaining: 100,
  title: 'Wanderer',
  aura_color: null,
  username: null,
  entity_answer: null,
  levelup_pending: false,
  levelup_newlevel: null,
  maze_completed_level: 0,
  registration_number: 0,
}

export async function fetchOrCreateUser(userId: string): Promise<UserRow> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  if (data) return data as UserRow

  const { data: inserted, error: insertErr } = await supabase
    .from('users')
    .insert({ id: userId })
    .select('*')
    .single()

  if (insertErr) {
    // Row may have been created concurrently by trigger — refetch.
    const { data: refetch } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (refetch) return refetch as UserRow
    throw insertErr
  }
  return inserted as UserRow
}

export async function updateUser(
  userId: string,
  patch: Partial<Omit<UserRow, 'id'>>,
): Promise<void> {
  const { error } = await supabase.from('users').update(patch).eq('id', userId)
  if (error) console.error('updateUser failed', error, patch)
}

export { DEFAULTS as USER_DEFAULTS }
