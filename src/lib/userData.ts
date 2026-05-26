import { supabase } from '@/lib/supabase'

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
  unlocked_titles: string[]
  total_maze_steps: number
  total_maze_time: number
  first_launch_at: string
}

const DEFAULTS: Omit<UserRow, 'id'> = {
  level: 1,
  credits: 50,
  steps_remaining: 100,
  title: '',
  aura_color: null,
  username: null,
  entity_answer: null,
  levelup_pending: false,
  levelup_newlevel: null,
  maze_completed_level: 0,
  registration_number: 0,
  unlocked_titles: [],
  total_maze_steps: 0,
  total_maze_time: 0,
  first_launch_at: new Date().toISOString(),
}

export async function fetchOrCreateUser(userId: string): Promise<UserRow> {
  console.log('[fetchOrCreateUser] playerId:', userId)

  const { data: existing, error: selectError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (selectError) {
    console.error('[fetchOrCreateUser] select error:', selectError)
    throw selectError
  }

  if (existing) {
    console.log('[fetchOrCreateUser] existing row:', existing)
    return existing as UserRow
  }

  const { data: inserted, error: insertError } = await supabase
    .from('users')
    .insert({ id: userId })
    .select()
    .single()

  if (insertError) {
    console.error('[fetchOrCreateUser] insert error:', insertError)
    throw insertError
  }

  console.log('[fetchOrCreateUser] inserted row:', inserted)
  return inserted as UserRow
}

export async function updateUser(
  userId: string,
  patch: Partial<Omit<UserRow, 'id'>>,
): Promise<void> {
  console.log('[updateUser] called with userId:', userId, 'patch:', patch)
  const { data, error } = await supabase.from('users').update(patch).eq('id', userId).select()
  console.log('[updateUser] result data:', data, 'error:', error)
  if (error) {
    console.error('updateUser failed', error, patch)
  }
}

export { DEFAULTS as USER_DEFAULTS }
