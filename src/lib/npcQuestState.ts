import { entryVisible } from './worldSam';
export type NpcQuestState = 'available' | 'active' | 'ready' | 'none';
export type QuestContext = {
  level: number; social?: number; perception?: number; trade?: number;
  flags: Readonly<Record<string, string>>;
  drops: ReadonlySet<string>;
  stages?: readonly QuestStage[]; entries?: readonly QuestEntry[];
  rescue?: { alexandraFound: boolean; claireFound: boolean; following: boolean };
};
export type QuestCondition = {
  stage?: number; min_level?: number | null; min_social?: number | null;
  min_perception?: number | null; min_trade?: number | null;
  requires_flags?: Record<string, string> | null; flags_equal?: boolean | null;
  requires_drops?: string[] | null;
  has_drop?: string | null;
};
export type QuestStage = { stage_key: string; condition: QuestCondition | null; button_action_key: string | null; on_show_action_key: string | null };
export type QuestEntry = QuestCondition & { bucket_key: string | null; option_a_target: string | null; option_b_target: string | null; option_a_action_key: string | null; option_b_action_key: string | null };

/** Exactly the dialogue's all-match / not-all-match semantics, including stat and drop gates. */
export function npcConditionsMet(condition: QuestCondition, context: QuestContext): boolean {
  if (context.level < (condition.min_level ?? 0) || (context.social ?? 0) < (condition.min_social ?? 0) ||
      (context.perception ?? 0) < (condition.min_perception ?? 0) || (context.trade ?? 0) < (condition.min_trade ?? 0)) return false;
  const required = condition.requires_flags;
  if (required && Object.keys(required).length) {
    const all = Object.keys(required).every(k => context.flags[k] === required[k]);
    if (condition.flags_equal === false ? all : !all) return false;
  }
  if (condition.has_drop && !context.drops.has(condition.has_drop)) return false;
  return !condition.requires_drops?.length || condition.requires_drops.every(k => context.drops.has(k));
}

export function npcStageMet(stage: number, condition: QuestCondition | null, context: QuestContext): boolean {
  if (condition === null || condition.stage !== stage) return false;
  if (condition.has_drop && !context.drops.has(condition.has_drop)) return false;
  if (!npcConditionsMet({ min_level: condition.min_level, min_social: condition.min_social }, context)) return false;
  if (!condition.requires_flags) return true;
  const all = Object.keys(condition.requires_flags).every(k => context.flags[k] === condition.requires_flags?.[k]);
  return condition.flags_equal === false ? !all : all;
}

/** Book flags use minimum/exact matching; stage conditions retain their existing rules. */
export const npcBookConditionsMet = (entry: QuestCondition, context: QuestContext) =>
  npcConditionsMet({ ...entry, requires_flags: null }, context) && entryVisible(entry, context.flags);

/** The same entry buckets used by the dialogue; no inferred quests from character/trade prose. */
export function npcEntryBucket(key: string, _flags: QuestContext['flags']): string {
  if (key === 'banker') return 'bnk_root_menu';
  return 'temper_root';
}

export function getNpcQuestState(npcKey: string, context: QuestContext): NpcQuestState {
  const key = npcKey.toLowerCase().replace(/^the\s+/, '');
  // Sam's old village quest is retired; his world card shows its own marker.
  if (key === 'bernard' || key === 'sam') return 'none';
  const stage = Number(context.flags[`${key}_stage`] ?? 0);
  // Maze rescue is started on Alexandra contact; Claire is recruitable only after that contact.
  if (context.rescue && key === 'alexandra') return context.rescue.alexandraFound ? 'active' : 'available';
  if (context.rescue && key === 'claire') return !context.rescue.alexandraFound ? 'none' : context.rescue.claireFound ? 'active' : 'available';
  const stages = context.stages ?? [];
  const match = stages.find(row => npcStageMet(stage, row.condition, context)) ?? stages.find(row => row.stage_key === 'stage_6_followup');
  const actions = new Set<string>();
  if (match?.button_action_key || match?.on_show_action_key) {
    if (match.button_action_key) actions.add(match.button_action_key);
    if (match.on_show_action_key) actions.add(match.on_show_action_key);
  } else {
    const entries = (context.entries ?? []).filter(entry => npcBookConditionsMet(entry, context));
    const root = npcEntryBucket(key, context.flags);
    // Dialogue falls back to its full eligible pool only when the requested bucket is absent.
    const queue = entries.some(e => e.bucket_key === root) ? [root] : entries.map(e => e.bucket_key ?? '');
    const visited = new Set<string>();
    while (queue.length) {
      const bucket = queue.shift();
      if (bucket === undefined || visited.has(bucket)) continue;
      visited.add(bucket);
      for (const entry of entries.filter(e => e.bucket_key === bucket)) {
        if (entry.option_a_action_key) actions.add(entry.option_a_action_key);
        if (entry.option_b_action_key) actions.add(entry.option_b_action_key);
        if (entry.option_a_target) queue.push(entry.option_a_target);
        if (entry.option_b_target) queue.push(entry.option_b_target);
      }
    }
  }
  // Alexandra's offer is suppressed after acceptance/completion; its existing stage gates still apply.
  if (actions.has('accept_alexandra_quest') && !context.flags.alexandra_quest) return 'available';
  // Chef readiness comes solely from the configured completion option and its exact gates.
  if (key === 'chef' && context.flags.chef_recipe_complete !== 'true' && actions.has('complete_chef_recipe')) return 'ready';
  return 'none';
}