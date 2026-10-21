import type { StyleKey } from '@/lib/theme/svgSources';
import { NPC_BODY_SCALE, avatarPx, npcBodyPx } from '@/lib/orbSizes';

export const ROOM_ZOOM = 1.5;
export const ROOM_AVATAR_SIZE = avatarPx('room');
// The player orb body fills its avatar canvas and NpcOrb size is body width,
// so an NPC body is simply the avatar size times the shared NPC scale.
export function roomNpcBodySize(avatarSize = ROOM_AVATAR_SIZE) {
  return Math.round(avatarSize * NPC_BODY_SCALE);
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
