import type { StyleKey } from '@/lib/theme/svgSources';

export const ROOM_ZOOM = 1.5;
export const ROOM_AVATAR_SIZE = 25;
// PlayerAvatar's 92-unit canvas contains a 52-unit orb; NpcOrb size is
// body width, not canvas width. World zoom applies to both exactly once.
export function roomNpcBodySize(avatarSize = ROOM_AVATAR_SIZE, kind: 'avatar' | 'dot' = 'avatar') {
  return Math.round(avatarSize * (kind === 'dot' ? 1 : 52 / 92) * 1.15);
}
export const ROOM_NPC_BODY_SIZE = roomNpcBodySize();
export const ROOM_WALL_STYLE: StyleKey = 'gold';
export const ROOM_BG = '#0b0e1f';
export const ROOM_CELL = 20;

/** Camera offset (screen px) for one axis: follow + clamp when the zoomed map is larger, otherwise centre it. */
export function roomCamAxis(mapAxis: number, playerPos: number, viewSize: number, zoom = ROOM_ZOOM): number {
  const m = mapAxis * zoom;
  if (m > viewSize) return Math.min(0, Math.max(viewSize - m, viewSize / 2 - playerPos * zoom));
  return (viewSize - m) / 2;
}
