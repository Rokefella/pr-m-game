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
  return !condition.requires_drops?.length || condition.requires_drops.every(k => context.drops.has(k));
}

export function npcStageMet(stage: number, condition: QuestCondition | null, context: QuestContext): boolean {
  return condition !== null && condition.stage === stage && npcConditionsMet(condition, context);
}

/** The same entry buckets used by the dialogue; no inferred quests from character/trade prose. */
export function npcEntryBucket(key: string, flags: QuestContext['flags']): string {
  if (key === 'banker') return 'bnk_root_menu';
  if (key !== 'bernard') return 'temper_root';
  const stage = flags.bernard_stage;
  if (stage === '1') return 'quest_check_status';
  if (stage === '3') return 'quest_stage3_root';
  if (stage === '4') return 'quest_stage4_root';
  if (stage === '6') return 'quest_stage6_root';
  return ['touched_23', 'touched_47', 'touched_89'].every(k => flags[k] === 'true') ? 'char_temper_root' : 'quest_intro_root';
}

export function getNpcQuestState(npcKey: string, context: QuestContext): NpcQuestState {
  const key = npcKey.toLowerCase().replace(/^the\s+/, '');
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
    const entries = (context.entries ?? []).filter(entry => npcConditionsMet(entry, context));
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
  // Bernard arrival starts the building quest, while the building reward is its hand-in.
  if (key === 'bernard' && stage === 0 && actions.has('advance_to_1')) return 'available';
  if (key === 'bernard' && stage === 1 && actions.has('grant_credits_30_advance_2')) return 'ready';
  // Growth and Wanderer rewards are new interactions only before their stage advances.
  if (key === 'bernard' && stage === 2 && actions.has('grant_growth_point_1')) return 'available';
  if (key === 'bernard' && stage === 4 && actions.has('grant_wanderer_title')) return 'ready';
  // Alexandra's offer is suppressed after acceptance/completion; its existing stage gates still apply.
  if (actions.has('accept_alexandra_quest') && !context.flags.alexandra_quest) return 'available';
  // Chef readiness comes solely from the configured completion option and its exact gates.
  if (key === 'chef' && context.flags.chef_recipe_complete !== 'true' && actions.has('complete_chef_recipe')) return 'ready';
  // An explicit recipe start flag can show progress; never invent ingredient requirements or an accept action.
  if (key === 'chef' && context.flags.chef_recipe_complete !== 'true' && context.flags.chef_recipe_started === 'true') return 'active';
  // Bernard's underway stages have no hand-in action; traders and character-only NPCs are not quests.
  if (key === 'bernard' && ([1, 2, 3].includes(stage) || context.flags.alexandra_quest === 'active')) return 'active';
  return 'none';
}