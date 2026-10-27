export type WorldDoorKind = 'maze' | 'library' | 'exchange';
export const effectiveWorldLevel = (level: number | null | undefined, completed: number | null | undefined) => Math.max(Number(level) || 1, (Number(completed) || 0) + 1);
/** Library and exchange doors are open from the start; only the maze waits for Sam. */
export function worldDoorRefusal(kind: WorldDoorKind, _level: number, samStage: string | null | undefined): string | null {
  if (kind === 'maze') return (parseInt(samStage ?? '0', 10) || 0) >= 2 ? null : 'Not yet. Sam is waiting for you by the fire.';
  return null;
}
