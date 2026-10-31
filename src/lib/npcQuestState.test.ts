import { describe, expect, it } from 'vitest';
import { getNpcQuestState, npcBookConditionsMet, npcConditionsMet, npcStageMet, type QuestContext, type QuestEntry } from './npcQuestState';
const base: QuestContext = { level: 1, flags: {}, drops: new Set() };
const entry = (overrides: Partial<QuestEntry>): QuestEntry => ({ bucket_key: 'temper_root', option_a_target: null, option_b_target: null, option_a_action_key: null, option_b_action_key: null, ...overrides });
const stages = [
  { stage_key: 'stage_0', condition: { stage: 0 }, on_show_action_key: 'advance_to_1', button_action_key: null },
  { stage_key: 'stage_4', condition: { stage: 4 }, on_show_action_key: null, button_action_key: 'grant_wanderer_title' },
  { stage_key: 'stage_5_offer', condition: { stage: 5, requires_flags: { alexandra_quest: 'active' }, flags_equal: false }, on_show_action_key: null, button_action_key: 'accept_alexandra_quest' },
];
describe('NPC quest rules shared with dialogue', () => {
  it('has_drop stage requires a carried whistle before the dialogue can show', () => {
    const condition = { stage: 0, has_drop: 'curio_tin_whistle' };
    expect(npcStageMet(0, condition, base)).toBe(false);
    expect(npcStageMet(0, condition, { ...base, drops: new Set(['curio_tin_whistle']) })).toBe(true);
  });
  it('book numeric minimums differ from unchanged stage flag conditions', () => {
    const book = { requires_flags: { sam_stage: '4' }, flags_equal: false };
    expect(npcBookConditionsMet(book, { ...base, flags: { sam_stage: '3' } })).toBe(false);
    expect(npcBookConditionsMet(book, { ...base, flags: { sam_stage: '4' } })).toBe(true);
    expect(npcBookConditionsMet(book, { ...base, flags: { sam_stage: '8' } })).toBe(true);
  });
  it('never shows the retired village quest marker on Sam', () => {
    for (const stage of ['0', '1', '3', '4', '5', '6']) expect(getNpcQuestState('bernard', { ...base, stages, flags: { bernard_stage: stage, alexandra_quest: 'active' } })).toBe('none');
  });
  it('still offers Alexandra to other configured NPCs before acceptance', () => {
    expect(getNpcQuestState('priest', { ...base, stages: [{ stage_key: 'stage_0', condition: { stage: 0 }, on_show_action_key: null, button_action_key: 'accept_alexandra_quest' }] })).toBe('available');
  });
  it('uses configured Chef level, social, flags and carried-drop gates, never banked fragments', () => {
    const entries = [entry({ option_a_action_key: 'complete_chef_recipe', min_level: 2, min_social: 2, requires_flags: { recipe_started: 'true' }, requires_drops: ['herb', 'root', 'spice'] })];
    const context = { ...base, entries, level: 2, social: 2, flags: { recipe_started: 'true' }, drops: new Set(['herb', 'root']) };
    expect(getNpcQuestState('chef', context)).toBe('none');
    expect(getNpcQuestState('chef', { ...context, drops: new Set(['herb', 'root', 'spice']) })).toBe('ready');
    expect(getNpcQuestState('chef', { ...context, level: 1, drops: new Set(['herb', 'root', 'spice']) })).toBe('none');
    expect(getNpcQuestState('chef', { ...context, social: 1, drops: new Set(['herb', 'root', 'spice']) })).toBe('none');
  });
  it('does not show Chef hand-in after completion', () => {
    expect(getNpcQuestState('chef', { ...base, entries: [entry({ option_a_action_key: 'complete_chef_recipe' })], flags: { chef_recipe_complete: 'true' } })).toBe('none');
  });
  it('does not label merchant purchases or banker trade as quests', () => {
    expect(getNpcQuestState('merchant', { ...base, entries: [entry({ option_a_action_key: 'buy_chef_spice' })] })).toBe('none');
    expect(getNpcQuestState('banker', { ...base, entries: [entry({ bucket_key: 'bnk_root_menu', option_a_action_key: 'open_marketplace_browse' })] })).toBe('none');
  });
  it('only follows eligible dialogue choices from an existing entry root', () => {
    const entries = [entry({}), entry({ bucket_key: 'unreachable', option_a_action_key: 'complete_chef_recipe' })];
    expect(getNpcQuestState('chef', { ...base, entries })).toBe('none');
    expect(getNpcQuestState('chef', { ...base, entries: [entry({ option_a_target: 'unreachable' }), entries[1]] })).toBe('ready');
  });
  it('matches dialogue inequality: not all flags must match', () => {
    const condition = { requires_flags: { a: 'true', b: 'true' }, flags_equal: false };
    expect(npcConditionsMet(condition, { ...base, flags: { a: 'true' } })).toBe(true);
    expect(npcConditionsMet(condition, { ...base, flags: { a: 'true', b: 'true' } })).toBe(false);
    expect(npcStageMet(1, null, base)).toBe(false);
    expect(npcStageMet(1, { stage: 2 }, base)).toBe(false);
  });
  it('matches the Maze Alexandra/Claire contact gates', () => {
    expect(getNpcQuestState('alexandra', { ...base, rescue: { alexandraFound: false, claireFound: false, following: false } })).toBe('available');
    expect(getNpcQuestState('claire', { ...base, rescue: { alexandraFound: false, claireFound: false, following: false } })).toBe('none');
    expect(getNpcQuestState('claire', { ...base, rescue: { alexandraFound: true, claireFound: false, following: false } })).toBe('available');
    expect(getNpcQuestState('claire', { ...base, rescue: { alexandraFound: true, claireFound: true, following: true } })).toBe('active');
  });
});