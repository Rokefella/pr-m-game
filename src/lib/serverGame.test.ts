import { beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: api.rpc } }));
import { claimFragment, bankFragments, forfeitUnbankedFragments, spendGrowthPoint, renamePlayer, buyFolderSlot, setupProfile, spendCredits, mazeHelperReward, npcLegacyAction, setStoryFlag, createFragmentListing, cancelFragmentListing, devSetLevel, redeemCode, checkTrial, recordPurchase } from './serverGame';
beforeEach(() => api.rpc.mockReset().mockResolvedValue({ data: { ok: true }, error: null }));
describe('Step B server-owned save contracts', () => {
  it.each([
    ['claim_fragment', () => claimFragment(1, 23, 2, 3, 'image'), { p_level: 1, p_prime: 23, p_col: 2, p_row: 3, p_image: 'image' }],
    ['bank_fragments', bankFragments, {}],
    ['forfeit_unbanked_fragments', forfeitUnbankedFragments, {}],
    ['spend_growth_point', () => spendGrowthPoint('perception'), { p_stat: 'perception' }],
    ['rename_player', () => renamePlayer('Rob'), { p_username: 'Rob' }],
    ['buy_folder_slot', buyFolderSlot, {}],
    ['setup_profile', () => setupProfile('Rob', '#abcdef'), { p_username: 'Rob', p_aura_color: '#abcdef' }],
    ['spend_credits', () => spendCredits(20, 'visibility'), { p_amount: 20, p_reason: 'visibility' }],
    ['maze_helper_reward', () => mazeHelperReward(2), { p_level: 2 }],
    ['npc_legacy_action', () => npcLegacyAction('chef', 'buy_chef_spice'), { p_npc_key: 'chef', p_action: 'buy_chef_spice' }],
    ['set_story_flag', () => setStoryFlag('bernard_stage', '6'), { p_key: 'bernard_stage', p_value: '6' }],
    ['create_listing', () => createFragmentListing('fragment-id', 30), { p_fragment: 'fragment-id', p_price: 30 }],
    ['cancel_listing', () => cancelFragmentListing('listing-id'), { p_listing: 'listing-id' }],
    ['dev_set_level', () => devSetLevel(2), { p_level: 2 }],
    ['redeem_beta_code', () => redeemCode('code'), { p_code: 'code' }],
    ['check_trial', checkTrial, {}],
    ['record_purchase', () => recordPurchase('monthly'), { p_tier: 'monthly' }],
    ['record_purchase', () => recordPurchase(null), { p_tier: null }],
  ] as const)('%s sends only the documented arguments', async (name, save, args) => {
    expect(await save()).toEqual({ ok: true });
    expect(api.rpc).toHaveBeenCalledExactlyOnceWith(name, args);
  });
  it('returns authoritative balances unchanged', async () => {
    api.rpc.mockResolvedValue({ data: { ok: true, credits: 100, extra_drop_capacity: 4 }, error: null });
    expect(await buyFolderSlot()).toEqual({ ok: true, credits: 100, extra_drop_capacity: 4 });
  });
  it('passes a server refusal back without inventing success', async () => {
    api.rpc.mockResolvedValue({ data: { ok: false, reason: 'not_enough_credits' }, error: null });
    expect(await renamePlayer('Rob')).toEqual({ ok: false, reason: 'not_enough_credits' });
  });
  it('refuses non-story gameplay keys without a request', async () => {
    expect(await setStoryFlag('sam_stage', '8')).toEqual({ ok: false, reason: 'not_allowed' });
    expect(api.rpc).not.toHaveBeenCalled();
  });
});