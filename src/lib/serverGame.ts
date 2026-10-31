import { supabase } from '@/integrations/supabase/client';

/** Typed wrappers for server-owned game state. The client never writes these values itself. */
type Rpc = (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc;

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
  await call<unknown>('set_ui_flag', { p_key: key, p_value: value });
}
export const devSetFlag = (key: string, value: string) => call<unknown>('dev_set_flag', { p_key: key, p_value: value });
