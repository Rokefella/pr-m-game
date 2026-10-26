import { doorRefusal, EXCHANGE_MIN_LEVEL, LIBRARY_MIN_LEVEL, type VillageDoorKind } from './villageDoors';
export const effectiveWorldLevel = (level: number | null | undefined, completed: number | null | undefined) => Math.max(Number(level) || 1, (Number(completed) || 0) + 1);
export function worldDoorRefusal(kind: VillageDoorKind, level: number, samStage: string | null | undefined): string | null {
  if (kind === 'maze') return (parseInt(samStage ?? '0', 10) || 0) >= 2 ? null : 'Not yet. Sam is waiting for you by the fire.';
  return doorRefusal(kind, level, 0, LIBRARY_MIN_LEVEL, EXCHANGE_MIN_LEVEL);
}