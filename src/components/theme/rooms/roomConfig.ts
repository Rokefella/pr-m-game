import type { StyleKey } from '@/lib/theme/svgSources';
import { AVATAR_BODY_RATIO, NPC_BODY_SCALE, avatarPx, npcBodyPx } from '@/lib/orbSizes';

export const ROOM_ZOOM = 1.5;
export const ROOM_AVATAR_SIZE = avatarPx('room');
// NpcOrb size is body width. Avatar-kind rooms match the player's rendered body
// (the body fills 52/92 of the avatar canvas); legacy dot rooms use the dot width.
export function roomNpcBodySize(avatarSize = ROOM_AVATAR_SIZE, kind: 'avatar' | 'dot' = 'avatar') {
  return Math.round(avatarSize * (kind === 'dot' ? 1 : AVATAR_BODY_RATIO) * NPC_BODY_SCALE);
}
export const ROOM_NPC_BODY_SIZE = npcBodyPx('room');
export const ROOM_WALL_STYLE: StyleKey = 'gold';
export const ROOM_BG = '#0b0e1f';
export const ROOM_CELL = 20;

/** Camera offset (screen px) for one axis: follow + clamp when the zoomed map is larger, otherwise centre it. */
export function roomCamAxis(mapAxis: number, playerPos: number, viewSize: number, zoom = ROOM_ZOOM): number {
  const m = mapAxis * zoom;
  if (m > viewSize) return Math.min(0, Math.max(viewSize - m, viewSize / 2 - playerPos * zoom));
  return (viewSize - m) / 2;
}
