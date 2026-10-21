import { act, renderHook, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useNpcDialogue } from './useNpcDialogue';
import { _resetQuestFlagCache, getFlag, reconcileBernardAfterShadow, setFlag } from '@/lib/questFlags';

const state = vi.hoisted(() => ({ flags: {} as Record<string, string>, savedTitles: [] as string[] }));
vi.mock('@/lib/userData', () => ({ updateUser: async (_user: string, row: { title?: string }) => { if (row.title) state.savedTitles.push(row.title); } }));
vi.mock('@/lib/supabase', () => ({ supabase: { from: (table: string) => {
  let write: { flag_key: string; flag_value: string } | undefined;
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'order', 'maybeSingle', 'limit', 'upsert']) chain[method] = (...args: unknown[]) => {
    if (method === 'upsert') write = args[0] as typeof write;
    return chain;
  };
  chain.then = (resolve: (value: unknown) => void) => {
    if (write) state.flags[write.flag_key] = write.flag_value;
    const data = table === 'quest_flags' ? Object.entries(state.flags).map(([flag_key, flag_value]) => ({ flag_key, flag_value })) :
      table === 'npcs' ? { id: 'bernard' } : table === 'npc_dialogue_stages' ? [
        { stage_key: 'stage_0', condition: { stage: 0 }, on_show_action_key: 'advance_to_1' },
        { stage_key: 'stage_2', condition: { stage: 2 } },
        { stage_key: 'stage_3', condition: { stage: 3 } },
        { stage_key: 'stage_4', condition: { stage: 4 }, button_action_key: 'grant_wanderer_title' },
        { stage_key: 'stage_5_offer', condition: { stage: 5, requires_flags: { alexandra_quest: 'active' }, flags_equal: false }, button_action_key: 'accept_alexandra_quest' },
        { stage_key: 'stage_6_followup', condition: { stage: 6 } },
      ] : table === 'npc_book_entries' ? [
        { bucket_key: 'quest_check_status', weight: 1, requires_flags: { touched_23: 'true', touched_47: 'true', touched_89: 'true' }, option_a_label: 'Accept', option_a_action_key: 'grant_credits_30_advance_2', option_a_target: 'quest_after_credits' },
        { bucket_key: 'quest_after_credits', weight: 1, option_a_label: 'Continue', option_a_target: 'quest_growth_offer' },
        { bucket_key: 'quest_growth_offer', weight: 1, option_a_label: 'Accept', option_a_action_key: 'grant_growth_point_1' },
      ] : [];
    return Promise.resolve({ data, error: null }).then(resolve);
  };
  return chain;
} } }));
beforeEach(() => { state.flags = {}; state.savedTitles = []; _resetQuestFlagCache(); });
afterEach(cleanup);

it('follows the published action spine from cleared progress through stage 6 with a level-2 return', async () => {
  const { result, rerender } = renderHook(({ level }) => useNpcDialogue('bernard', {
    user: { id: 'player' }, currentLevel: level,
    onAcceptAlexandraQuest: async () => { await setFlag('player', 'alexandra_quest', 'active'); await setFlag('player', 'bernard_stage', '6'); },
  }), { initialProps: { level: 1 } });
  await waitFor(() => expect(result.current.isReady).toBe(true));
  await act(async () => { result.current.getBernardDialogue().onShow?.(); });
  expect(getFlag('bernard_stage')).toBe('1');
  await act(async () => {
    for (const prime of [23, 47, 89]) await setFlag('player', `touched_${prime}`, 'true');
    result.current.resetBernardBucket();
  });
  await waitFor(() => expect(result.current.bucketIndex.quest_check_status).toHaveLength(1));
  await act(async () => { result.current.getBernardDialogue().options?.[0].onSelect(); });
  expect(getFlag('bernard_stage')).toBe('2');
  await act(async () => { result.current.getBernardDialogue().options?.[0].onSelect(); });
  await act(async () => { result.current.getBernardDialogue().options?.[0].onSelect(); });
  expect(getFlag('bernard_stage')).toBe('3');
  await act(async () => { await setFlag('player', 'shadow_visited', 'true'); await reconcileBernardAfterShadow('player', true); });
  rerender({ level: 2 });
  expect(getFlag('bernard_stage')).toBe('4');
  await act(async () => { result.current.getBernardDialogue().buttonAction?.(); });
  expect(state.savedTitles).toEqual(['Wanderer']);
  expect(getFlag('bernard_stage')).toBe('5');
  await act(async () => { result.current.getBernardDialogue().buttonAction?.(); });
  expect(getFlag('bernard_stage')).toBe('6');
  expect(getFlag('alexandra_quest')).toBe('active');
});