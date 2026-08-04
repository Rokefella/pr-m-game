import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getFlag, setFlag } from '@/lib/questFlags';
import { updateUser } from '@/lib/userData';

export type BernardOption = {
  label: string;
  leads_to?: string | null;
  action_key?: string | null;
};

export type BernardResolvedOption = {
  label: string;
  /** Tap handler — fires the action, walks to leads_to, or closes the dialogue. */
  onSelect: () => void;
  /** True when the option is a dead end and the dialogue should close. */
  closes: boolean;
};

export type BernardDialogueData = {
  text: string;
  buttonLabel: string | null;
  buttonAction?: () => void;
  onShow?: () => void;
  /** Branching book options (up to two) when the current node comes from the book graph. */
  options?: BernardResolvedOption[];
};

export type BernardStageRow = {
  stage_key: string;
  text: string;
  button_label: string | null;
  button_action_key: string | null;
  on_show_action_key: string | null;
  order_index: number;
  condition: {
    stage?: number;
    requires_flags?: Record<string, string>;
    flags_equal?: boolean;
    min_level?: number;
    min_social?: number;
  } | null;
};

export type BernardBookCondition = {
  requires_flags?: Record<string, string>;
  flags_equal?: boolean;
  min_level?: number;
  min_social?: number;
  min_perception?: number;
  min_trade?: number;
} | null;

export type BernardBookEntry = {
  id: string;
  node_key: string | null;
  bucket_key: string | null;
  topic: string | null;
  text: string;
  weight: number;
  min_level: number | null;
  min_social: number | null;
  min_perception: number | null;
  min_trade: number | null;
  requires_flags: Record<string, string> | null;
  flags_equal: boolean | null;
  option_a_label: string | null;
  option_a_target: string | null;
  option_a_action_key: string | null;
  option_b_label: string | null;
  option_b_target: string | null;
  option_b_action_key: string | null;
};


/** Entry-point buckets for casual conversation. */
export const BERNARD_QUEST_ROOT = 'quest_intro_root';
export const BERNARD_CHAR_ROOT = 'char_temper_root';

export type UseBernardDialogueOptions = {
  user: { id: string } | null;
  /** Player level — drives min_level gates and book page unlocks. */
  currentLevel?: number;
  /** Social affinity — drives min_social gates and book page unlocks. */
  socialStat?: number;
  /** Perception affinity — drives min_perception gates. */
  perceptionStat?: number;
  /** Trade affinity — drives min_trade gates. */
  tradeStat?: number;
  credits?: number;
  growthPoints?: number;
  onCreditsChange?: (next: number) => void;
  onGrowthPointsChange?: (next: number) => void;
  onTitleGranted?: (title: string, unlockedTitles: string[]) => void;
  onMessage?: (message: string) => void;
  /** Host decides whether the quest can be accepted (subscription gate / paywall). */
  onAcceptAlexandraQuest?: () => void;
  /** Called when a book option is a dead end — host should close the dialogue. */
  onCloseDialogue?: () => void;
  /** Host's open state; when it becomes true the hook resolves a single stable node. */
  isOpen?: boolean;
};


/**
 * Shared Bernard dialogue spine — data-driven stages (npc_dialogue_stages),
 * his book (npc_book_entries), condition matching and stage advancement.
 * Every surface that talks to Bernard must go through this hook so the
 * quest state never advances independently in one room.
 */
export function useBernardDialogue({
  user,
  currentLevel = 1,
  socialStat = 0,
  perceptionStat = 0,
  tradeStat = 0,
  credits = 0,
  growthPoints = 0,
  onCreditsChange,
  onGrowthPointsChange,
  onTitleGranted,
  onMessage,
  onAcceptAlexandraQuest,
  onCloseDialogue,
}: UseBernardDialogueOptions) {
  const [bernardStages, setBernardStages] = useState<BernardStageRow[]>([]);
  const [bernardBookEntries, setBernardBookEntries] = useState<BernardBookEntry[]>([]);
  // Forces re-render of Bernard dialogue when quest flags change.
  const [, setFlagsVersion] = useState(0);
  const bumpFlags = useCallback(() => setFlagsVersion((v) => v + 1), []);

  /** Entry point for casual conversation: quest root until the three buildings are done. */
  const defaultBucket = useCallback((): string => {
    const stage = getFlag('bernard_stage');
    if (stage === '1') return 'quest_check_status';
    const done =
      getFlag('touched_23') === 'true' &&
      getFlag('touched_47') === 'true' &&
      getFlag('touched_89') === 'true';
    return done ? BERNARD_CHAR_ROOT : BERNARD_QUEST_ROOT;
  }, []);

  // Where in the branching book graph this conversation currently sits.
  const [currentBucket, setCurrentBucket] = useState<string>(() => defaultBucket());

  /** Reset conversation position — call whenever the dialogue is (re)opened. */
  const resetBernardBucket = useCallback(() => {
    setCurrentBucket(defaultBucket());
  }, [defaultBucket]);

  const advanceBernardStage = useCallback(
    async (stage: number) => {
      if (!user) return;
      await setFlag(user.id, 'bernard_stage', String(stage));
      bumpFlags();
    },
    [user, bumpFlags],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: npcRow, error: npcErr } = await supabase
        .from('npcs')
        .select('id')
        .eq('npc_key', 'bernard')
        .maybeSingle();
      if (npcErr || !npcRow) {
        if (npcErr) console.error('[useBernardDialogue] bernard npc lookup failed', npcErr);
        return;
      }
      const { data, error } = await supabase
        .from('npc_book_entries')
        .select(
          'id, node_key, bucket_key, topic, text, weight, min_level, min_social, min_perception, min_trade, requires_flags, flags_equal, option_a_label, option_a_target, option_a_action_key, option_b_label, option_b_target, option_b_action_key',
        )
        .eq('npc_id', (npcRow as { id: string }).id);
      if (error) {
        console.error('[useBernardDialogue] bernard book entries fetch failed', error);
        return;
      }
      if (cancelled) return;
      const rows = (data as unknown as BernardBookEntry[]) || [];
      // Per-entry gating: flat stat thresholds + the dialogue flag-matching semantics.
      const eligible = rows.filter((r) => {
        if (typeof r.min_level === 'number' && currentLevel < r.min_level) return false;
        if (typeof r.min_social === 'number' && socialStat < r.min_social) return false;
        if (typeof r.min_perception === 'number' && perceptionStat < r.min_perception) return false;
        if (typeof r.min_trade === 'number' && tradeStat < r.min_trade) return false;
        const requires = r.requires_flags;
        if (!requires || Object.keys(requires).length === 0) return true;
        const allMatch = Object.keys(requires).every((k) => getFlag(k) === requires[k]);
        return r.flags_equal === false ? !allMatch : allMatch;
      });
      setBernardBookEntries(eligible);
    })();
    return () => { cancelled = true; };
  }, [currentLevel, socialStat, perceptionStat, tradeStat]);


  // Eligible entries indexed by bucket_key.
  const bucketIndex = useMemo(() => {
    const map: Record<string, BernardBookEntry[]> = {};
    for (const e of bernardBookEntries) {
      const key = e.bucket_key || '';
      if (!key) continue;
      (map[key] ||= []).push(e);
    }
    return map;
  }, [bernardBookEntries]);



  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: npcRow, error: npcErr } = await supabase
        .from('npcs')
        .select('id')
        .eq('npc_key', 'bernard')
        .maybeSingle();
      if (npcErr || !npcRow) {
        if (npcErr) console.error('[useBernardDialogue] bernard npc lookup failed', npcErr);
        return;
      }
      const { data, error } = await supabase
        .from('npc_dialogue_stages')
        .select('stage_key, text, button_label, button_action_key, on_show_action_key, order_index, condition')
        .eq('npc_id', (npcRow as { id: string }).id)
        .order('order_index', { ascending: true });
      if (error) {
        console.error('[useBernardDialogue] bernard dialogue stages fetch failed', error);
        return;
      }
      if (!cancelled) setBernardStages((data as BernardStageRow[]) || []);
    })();
    return () => { cancelled = true; };
  }, []);

  // Weighted-random pick within a pool of eligible entries.
  const pickWeighted = (pool: BernardBookEntry[]): BernardBookEntry | null => {
    if (!pool.length) return null;
    const total = pool.reduce((s, e) => s + Math.max(0, e.weight || 0), 0);
    if (total <= 0) return pool[Math.floor(Math.random() * pool.length)];
    let roll = Math.random() * total;
    for (const e of pool) {
      roll -= Math.max(0, e.weight || 0);
      if (roll <= 0) return e;
    }
    return pool[pool.length - 1];
  };

  const pickBookEntry = (): BernardBookEntry | null =>
    pickWeighted(bucketIndex[currentBucket] || []) ?? pickWeighted(bernardBookEntries);


  // Evaluates a dialogue row's condition against the current stage + quest flags.
  const conditionsMet = (
    stage: number,
    condition: BernardStageRow['condition'],
    flags: (key: string) => string | null,
  ): boolean => {
    if (!condition) return false;
    if (condition.stage !== stage) return false;
    // Numeric-threshold gates — independent of the flag checks below.
    if (typeof condition.min_level === 'number' && currentLevel < condition.min_level) return false;
    if (typeof condition.min_social === 'number' && socialStat < condition.min_social) return false;
    const requires = condition.requires_flags;
    if (!requires) return true;
    const keys = Object.keys(requires);
    const allMatch = keys.every((k) => flags(k) === requires[k]);
    return condition.flags_equal === false ? !allMatch : allMatch;
  };

  // Maps action keys from the database to concrete handlers.
  const bernardActions: Record<string, () => void> = {
    advance_to_1: () => { advanceBernardStage(1); },
    grant_credits_30_advance_2: () => {
      if (!user) return;
      const next = credits + 30;
      onCreditsChange?.(next);
      updateUser(user.id, { credits: next });
      advanceBernardStage(2);
    },
    grant_growth_point_1: () => {
      if (!user) return;
      const nextGp = growthPoints + 1;
      onGrowthPointsChange?.(nextGp);
      updateUser(user.id, { growth_points: nextGp } as never);
      advanceBernardStage(3);
    },
    grant_wanderer_title: async () => {
      if (!user) return;
      const credNum = credits + 100;
      onCreditsChange?.(credNum);
      await updateUser(user.id, {
        credits: credNum,
        title: 'Wanderer',
        unlocked_titles: ['Wanderer'],
      });
      onTitleGranted?.('Wanderer', ['Wanderer']);
      await advanceBernardStage(5);
      onMessage?.('You are a Wanderer.');
    },
    accept_alexandra_quest: () => { onAcceptAlexandraQuest?.(); },
  };

  const getBernardDialogue = (flagOverride?: (k: string) => string | null): BernardDialogueData => {
    if (typeof window === 'undefined' || !user) {
      return { text: '', buttonLabel: null };
    }
    const f = flagOverride ?? getFlag;
    const stage = parseInt(f('bernard_stage') || '0', 10);
    const match =
      bernardStages.find((row) => conditionsMet(stage, row.condition, f)) ??
      bernardStages.find((row) => row.stage_key === 'stage_6_followup');
    if (!match) return { text: '', buttonLabel: null };

    // A revisit = the matched stage neither advances the spine nor grants anything.
    const isRevisit = !match.button_action_key && !match.on_show_action_key;
    if (isRevisit) {
      const entry = pickBookEntry();
      // Empty book → fall through to the fixed stage text below.
      if (entry) {
        const raw: BernardOption[] = [
          entry.option_a_label
            ? { label: entry.option_a_label, leads_to: entry.option_a_target, action_key: entry.option_a_action_key }
            : null,
          entry.option_b_label
            ? { label: entry.option_b_label, leads_to: entry.option_b_target, action_key: entry.option_b_action_key }
            : null,
        ].filter(Boolean) as BernardOption[];
        const options: BernardResolvedOption[] = raw.map((o) => ({
          label: o.label,
          closes: !o.leads_to && !o.action_key,

          onSelect: () => {
            if (o.action_key) bernardActions[o.action_key]?.();
            if (o.leads_to) {
              // Walk deeper into the graph without closing the dialogue.
              setCurrentBucket(o.leads_to);
              return;
            }
            if (!o.action_key) onCloseDialogue?.();
          },
        }));
        return { text: entry.text, buttonLabel: match.button_label, options };
      }
    }

    return {
      text: match.text,
      buttonLabel: match.button_label,
      buttonAction: match.button_action_key ? bernardActions[match.button_action_key] : undefined,
      onShow: match.on_show_action_key ? bernardActions[match.on_show_action_key] : undefined,
    };
  };

  return {
    bernardStages,
    bernardBookEntries,
    bucketIndex,
    currentBucket,
    setCurrentBucket,
    resetBernardBucket,
    conditionsMet,
    bernardActions,
    advanceBernardStage,
    getBernardDialogue,
    bumpFlags,
  };

}

export default useBernardDialogue;
