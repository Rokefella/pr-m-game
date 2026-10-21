/** The ONLY place orb, NPC, ghost, Echo and label sizes are defined. */

export const NPC_BODY_SCALE = 1.15;
export const GHOST_BODY_SCALE = 1;
export const ECHO_BODY_SCALE = 1;

export const LABEL_NAME_PX = 8;
export const LABEL_TITLE_PX = 8;

export const VILLAGE_AVATAR_SIZE = 25;
export const MAZE_AVATAR_SIZE = 30;
export const ROOM_AVATAR_SIZE = 25;
export const SHADOW_AVATAR_SIZE = 30;

export type OrbScreen = 'village' | 'maze' | 'room' | 'shadow';

/** The player orb body width in world pixels on a screen (the body fills the avatar canvas). */
export function avatarPx(screen: OrbScreen): number {
  switch (screen) {
    case 'village': return VILLAGE_AVATAR_SIZE;
    case 'maze': return MAZE_AVATAR_SIZE;
    case 'room': return ROOM_AVATAR_SIZE;
    case 'shadow': return SHADOW_AVATAR_SIZE;
  }
}

export function npcBodyPx(screen: OrbScreen): number {
  return Math.round(avatarPx(screen) * NPC_BODY_SCALE);
}

export function ghostBodyPx(screen: OrbScreen): number {
  return Math.round(avatarPx(screen) * GHOST_BODY_SCALE);
}

export function echoBodyPx(screen: OrbScreen): number {
  return Math.round(avatarPx(screen) * ECHO_BODY_SCALE);
}
