import { LABEL_NAME_PX, LABEL_TITLE_PX } from './orbSizes';
export { LABEL_NAME_PX, LABEL_TITLE_PX };
export function truncateOrbText(value: string | null | undefined, limit: number): string {
  const text = value?.trim() ?? '';
  const chars = Array.from(text);
  return chars.length > limit ? chars.slice(0, limit).join('') + '…' : text;
}
/** Bounds already include world translation, zoom, viewport origin and ghost motion. */
export function labelPositions(bounds: { left: number; top: number; width: number; height: number }, kind: 'avatar' | 'npc' | 'dot') {
  const x = bounds.left + bounds.width / 2;
  const top = bounds.top + bounds.height * (kind === 'avatar' ? 20 / 100 : kind === 'npc' ? 26 / 80 : 0);
  const feet = bounds.top + bounds.height * (kind === 'avatar' ? 78 / 100 : kind === 'npc' ? 70 / 80 : 1);
  return { x, titleY: top - 3, nameY: feet + 2 };
}