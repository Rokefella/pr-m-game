import { describe, expect, it } from 'vitest';
import {
  AVATAR_BODY_RATIO, ECHO_BODY_SCALE, GHOST_BODY_SCALE, LABEL_NAME_PX, LABEL_TITLE_PX, NPC_BODY_SCALE,
  avatarPx, echoBodyPx, ghostBodyPx, npcBodyPx,
} from './orbSizes';

describe('orb size single source', () => {
  it('keeps the existing per-screen avatar sizes', () => {
    expect(avatarPx('village')).toBe(25);
    expect(avatarPx('maze')).toBe(30);
    expect(avatarPx('room')).toBe(25);
    expect(avatarPx('shadow')).toBe(30);
  });
  it('derives every NPC body from the player body on every screen', () => {
    for (const screen of ['village', 'maze', 'room', 'shadow'] as const) {
      expect(npcBodyPx(screen)).toBe(Math.round(avatarPx(screen) * AVATAR_BODY_RATIO * NPC_BODY_SCALE));
    }
    expect(npcBodyPx('village')).toBe(14);
    expect(npcBodyPx('maze')).toBe(17);
  });
  it('matches ghost and Echo bodies to the player orb', () => {
    for (const screen of ['village', 'maze', 'room', 'shadow'] as const) {
      expect(ghostBodyPx(screen)).toBe(Math.round(avatarPx(screen) * GHOST_BODY_SCALE));
      expect(echoBodyPx(screen)).toBe(Math.round(avatarPx(screen) * ECHO_BODY_SCALE));
    }
  });
  it('keeps name and title labels at eight screen pixels', () => {
    expect(LABEL_NAME_PX).toBe(8);
    expect(LABEL_TITLE_PX).toBe(8);
  });
});
