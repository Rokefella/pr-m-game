import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useNpcQuestStates, NPC_DIALOGUE_CLOSED, NPC_INVENTORY_CHANGED } from './useNpcQuestStates';
import { setFlag, _resetQuestFlagCache } from '@/lib/questFlags';
const fixture = vi.hoisted(() => ({ drops: [] as string[], channels: 0 }));
vi.mock('@/lib/supabase', () => ({ supabase: {
  channel: () => { fixture.channels++; const channel = { on: () => channel, subscribe: () => channel }; return channel; },
  removeChannel: vi.fn(),
  from: (table: string) => {
    const chain = {
      select: () => chain, eq: () => chain, order: () => chain, maybeSingle: () => chain, upsert: () => chain,
      then: (resolve: (r: unknown) => unknown) => Promise.resolve({ error: null, data:
        table === 'quest_flags' ? [] : table === 'npcs' ? [{ id: 'b', npc_key: 'bernard' }, { id: 'c', npc_key: 'chef' }] :
        table === 'npc_dialogue_stages' ? [{ npc_id: 'b', stage_key: 'stage_0', condition: { stage: 0 }, on_show_action_key: 'advance_to_1' }] :
        table === 'npc_book_entries' ? [{ npc_id: 'c', bucket_key: 'temper_root', requires_drops: ['herb'], option_a_action_key: 'complete_chef_recipe' }] :
        table === 'drops' ? fixture.drops.map(drop_key => ({ drop_types: { drop_key } })) : { level: 1 },
      }).then(resolve),
    }; return chain;
  },
} }));
afterEach(() => { cleanup(); _resetQuestFlagCache(); fixture.drops = []; });
describe('Event-driven NPC quest snapshot', () => {
  it('shares one subscription and updates immediately when acceptance changes flags', async () => {
    fixture.channels = 0;
    const a = renderHook(() => useNpcQuestStates('player'));
    const b = renderHook(() => useNpcQuestStates('player'));
    await waitFor(() => expect(a.result.current('bernard')).toBe('available'));
    expect(fixture.channels).toBe(1);
    await act(async () => { await setFlag('player', 'bernard_stage', '1'); });
    expect(a.result.current('bernard')).toBe('active');
    expect(b.result.current('bernard')).toBe('active');
  });
  it('refreshes carried drops on dialogue close and removes hand-in on completion', async () => {
    const hook = renderHook(() => useNpcQuestStates('player-2'));
    await waitFor(() => expect(hook.result.current('bernard')).toBe('available'));
    expect(hook.result.current('chef')).toBe('none');
    fixture.drops = ['herb'];
    act(() => { window.dispatchEvent(new Event(NPC_DIALOGUE_CLOSED)); });
    await waitFor(() => expect(hook.result.current('chef')).toBe('ready'));
    await act(async () => { await setFlag('player-2', 'chef_recipe_complete', 'true'); });
    expect(hook.result.current('chef')).toBe('none');
  });
  it('refreshes quest readiness after a carried-drop pickup', async () => {
    const hook = renderHook(() => useNpcQuestStates('player-3'));
    await waitFor(() => expect(hook.result.current('bernard')).toBe('available'));
    fixture.drops = ['herb'];
    act(() => { window.dispatchEvent(new Event(NPC_INVENTORY_CHANGED)); });
    await waitFor(() => expect(hook.result.current('chef')).toBe('ready'));
  });
});