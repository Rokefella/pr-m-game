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
  unlocked_titles: string[]
  total_maze_steps: number
  total_maze_time: number
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
  unlocked_titles: ['Wanderer'],
  total_maze_steps: 0,
  total_maze_time: 0,
}

export async function fetchOrCreateUser(userId: string): Promise<UserRow> {
  console.log('[fetchOrCreateUser] playerId:', userId)

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) console.error('[fetchOrCreateUser] select error', error)
  if (data) {
    console.log('[fetchOrCreateUser] existing row:', data)
    return data as UserRow
  }

  const { data: upserted, error: upsertErr } = await supabase
    .from('users')
    .upsert({ id: userId })
    .select('*')
    .maybeSingle()

  if (upsertErr) console.error('[fetchOrCreateUser] upsert error', upsertErr)
  if (upserted) {
    console.log('[fetchOrCreateUser] upserted row:', upserted)
    return upserted as UserRow
  }

  // Last-resort refetch
  const { data: refetch, error: refetchErr } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (refetchErr) console.error('[fetchOrCreateUser] refetch error', refetchErr)
  console.log('[fetchOrCreateUser] refetch result:', refetch)
  if (refetch) return refetch as UserRow
  throw upsertErr ?? new Error('Failed to create or fetch user row')
}

export async function updateUser(
  userId: string,
  patch: Partial<Omit<UserRow, 'id'>>,
): Promise<void> {
  const { error } = await supabase.from('users').update(patch).eq('id', userId)
  if (error) console.error('updateUser failed', error, patch)
}

export { DEFAULTS as USER_DEFAULTS }
