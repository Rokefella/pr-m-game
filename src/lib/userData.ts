import { restInsert, restSelect, restUpdate } from './supabaseRest'

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
  first_launch_at: new Date().toISOString(),
}

export async function fetchOrCreateUser(userId: string): Promise<UserRow> {
  console.log('[fetchOrCreateUser] playerId:', userId)

  const existing = await restSelect('users', 'id', userId)
  if (Array.isArray(existing) && existing.length > 0) {
    console.log('[fetchOrCreateUser] existing row:', existing[0])
    return existing[0] as UserRow
  }

  const inserted = await restInsert('users', { id: userId })
  if (Array.isArray(inserted) && inserted.length > 0) {
    console.log('[fetchOrCreateUser] inserted row:', inserted[0])
    return inserted[0] as UserRow
  }

  const refetch = await restSelect('users', 'id', userId)
  if (Array.isArray(refetch) && refetch.length > 0) return refetch[0] as UserRow

  throw new Error('Failed to create or fetch user row')
}

export async function updateUser(
  userId: string,
  patch: Partial<Omit<UserRow, 'id'>>,
): Promise<void> {
  const result = await restUpdate('users', patch, 'id', userId)
  if (result && (result as { error?: unknown }).error) {
    console.error('updateUser failed', result, patch)
  }
}

export { DEFAULTS as USER_DEFAULTS }
