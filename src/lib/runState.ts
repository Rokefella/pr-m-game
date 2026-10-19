import { supabase } from '@/lib/supabase';

export const RUN_MAX_AGE_MS = 12 * 60 * 60 * 1000;
export const STRICT_FORFEIT = false;

type RunRecord = { userId: string; level: number; startedAt: number; completed?: boolean };
const RUN_KEY = 'praem_run';

export function startRun(userId: string, level: number): void {
  localStorage.setItem(RUN_KEY, JSON.stringify({ userId, level, startedAt: Date.now() }));
}

export function getActiveRun(userId: string, level: number): RunRecord | null {
  try {
    const value = localStorage.getItem(RUN_KEY);
    if (!value) return null;
    const run = JSON.parse(value) as Partial<RunRecord> | null;
    if (!run || run.userId !== userId || run.level !== level || typeof run.startedAt !== 'number') return null;
    const age = Date.now() - run.startedAt;
    if (!Number.isFinite(age) || age < 0 || age >= RUN_MAX_AGE_MS) return null;
    return { userId, level, startedAt: run.startedAt, completed: run.completed === true };
  } catch {
    return null;
  }
}

/** Marks the stored run as past the golden door (creates it when missing). */
export function markRunComplete(userId: string, level: number): void {
  let run: Partial<RunRecord> | null = null;
  try { run = JSON.parse(localStorage.getItem(RUN_KEY) ?? 'null'); } catch { run = null; }
  const base = run && run.userId === userId && run.level === level && typeof run.startedAt === 'number'
    ? run : { userId, level, startedAt: Date.now() };
  localStorage.setItem(RUN_KEY, JSON.stringify({ ...base, completed: true }));
}

export function endRun(): void {
  localStorage.removeItem(RUN_KEY);
}

export async function forfeitUnbanked(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('fragments').delete().eq('user_id', userId).eq('banked', false);
    if (error) {
      console.error('[Maze] fragment forfeiture failed', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[Maze] fragment forfeiture failed', error);
    return false;
  }
}