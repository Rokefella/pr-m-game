import { supabase } from './supabase';
import { resetDailySteps } from './dailySteps';
import { resetSkinCache } from './skins';
import { _resetQuestFlagCache } from './questFlags';
import { publishOrb } from './orb';
export const START_CONFIRMATION = 'Start over completely? Quests, maze progress, folder, fragments, drops, skins, finds and growth are wiped. Your number stays.';
/** Clear game-owned state only; auth and unrelated browser keys are never touched. */
export function clearPlayerLocal(userId: string, stores: Storage[] = [localStorage, sessionStorage]) {
  for (const store of stores) {
    for (const key of Object.keys(store)) {
      const game = /^(praem[._:]|dev_)/.test(key) || key === 'visited_shadow_this_run';
      const scoped = /^praem\.(worldDiscovery|heavyLegs)\./.test(key);
      if (game && (!scoped || key.endsWith(`.${userId}`))) store.removeItem(key);
    }
  }
  resetDailySteps(userId); resetSkinCache(); _resetQuestFlagCache();
  publishOrb({ avatar_body: 'visitor', aura_color: null, orb_dye: null });
}
export async function goBackToStart(userId: string, rpc = () => supabase.rpc('dev_go_back_to_start' as never)) {
  const { data, error } = await rpc();
  if (error || !(data as unknown as { ok?: boolean } | null)?.ok) throw error ?? new Error('Could not start over.');
  clearPlayerLocal(userId);
}