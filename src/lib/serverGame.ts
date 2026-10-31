import { supabase } from '@/lib/supabase';

/** Typed wrappers for server-owned game state. The client never writes these values itself. */
type Rpc = (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
const rpc: Rpc = (fn, args) => (supabase.rpc as unknown as Rpc)(fn, args);

async function call<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await rpc(fn, args);
  if (error) throw new Error(error.message);
  return (data ?? { ok: false }) as T;
}

export type NpcStageResult = { ok: boolean; given?: unknown; taken?: unknown; steps_remaining?: number; credits?: number; reason?: string };
export const runNpcStage2 = (stageId: string) => call<NpcStageResult>('run_npc_stage2', { p_stage: stageId });

export type CompleteMazeResult = { ok: boolean; replay?: boolean; maze_completed_level?: number; levelup_newlevel?: number | null; reason?: string };
export const completeMaze = (level: number, steps: number, seconds: number) =>
  call<CompleteMazeResult>('complete_maze', { p_level: level, p_steps: Math.max(0, Math.round(steps)), p_seconds: Math.max(0, Math.round(seconds)) });

export type LevelupResult = { ok: boolean; level?: number; title?: string | null; social?: number; reason?: string };
export const applyLevelup = (title: string | null) => call<LevelupResult>('apply_levelup', { p_title: title });

export type TitleResult = { ok: boolean; title?: string | null; reason?: string };
export const setTitle = (title: string) => call<TitleResult>('set_title', { p_title: title });

export const UI_FLAG = /^ui_[a-z0-9_]+$/;
export async function setUiFlag(key: string, value: string) {
  if (!UI_FLAG.test(key)) throw new Error(`Not a UI flag: ${key}`);
  return call<SaveResult>('set_ui_flag', { p_key: key, p_value: value });
}
export const devSetFlag = (key: string, value: string) => call<unknown>('dev_set_flag', { p_key: key, p_value: value });

export type SaveResult = { ok: boolean; reason?: string };
export type BalanceResult = SaveResult & { credits: number };
export const claimFragment = (level: number, prime: number, col: number, row: number, image: string) =>
  call<SaveResult & { id: string; already: boolean }>('claim_fragment', { p_level: level, p_prime: prime, p_col: col, p_row: row, p_image: image });
export const bankFragments = () => call<SaveResult & { banked: number; primes: number[]; library_count: number }>('bank_fragments', {});
export const forfeitUnbankedFragments = () => call<SaveResult>('forfeit_unbanked_fragments', {});
export const spendGrowthPoint = (stat: 'social' | 'perception' | 'trade') =>
  call<SaveResult & { growth_points: number; social: number; perception: number; trade: number }>('spend_growth_point', { p_stat: stat });
export const renamePlayer = (username: string) => call<BalanceResult & { username: string }>('rename_player', { p_username: username });
export const buyFolderSlot = () => call<BalanceResult & { extra_drop_capacity: number }>('buy_folder_slot', {});
export const setupProfile = (username: string, auraColor: string) => call<SaveResult>('setup_profile', { p_username: username, p_aura_color: auraColor });
export const spendCredits = (amount: number, reason: string) => call<BalanceResult>('spend_credits', { p_amount: amount, p_reason: reason });
export const mazeHelperReward = (level: number) => call<BalanceResult>('maze_helper_reward', { p_level: level });
export const npcLegacyAction = (npcKey: string, action: string) =>
  call<BalanceResult & { growth_points?: number; title?: string; unlocked_titles?: string[]; stage?: number }>('npc_legacy_action', { p_npc_key: npcKey, p_action: action });
export const STORY_FLAGS = new Set(['shadow_visited', 'bernard_stage', 'alexandra_quest', 'quest_alexandra_pending']);
export const setStoryFlag = (key: string, value: string) => call<SaveResult>('set_story_flag', { p_key: key, p_value: value });
export const createFragmentListing = (fragment: string, price: number) => call<SaveResult & { id: string }>('create_listing', { p_fragment: fragment, p_price: price });
export const cancelFragmentListing = (listing: string) => call<SaveResult>('cancel_listing', { p_listing: listing });
export const devSetLevel = (level: number) => call<SaveResult>('dev_set_level', { p_level: level });
export const redeemCode = (code: string) => call<SaveResult>('redeem_beta_code', { p_code: code });
export const checkTrial = () => call<SaveResult & { status: string }>('check_trial', {});
export const recordPurchase = (tier: string | null) => call<SaveResult>('record_purchase', { p_tier: tier });
