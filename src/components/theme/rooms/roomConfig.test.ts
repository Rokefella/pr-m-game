import { describe, expect, it } from 'vitest';
import { ROOM_AVATAR_SIZE, ROOM_NPC_BODY_SIZE, ROOM_ZOOM, roomNpcBodySize } from './roomConfig';

describe('room NPC body sizing', () => {
  it('matches 1.15 times the visible player orb, rounded in world pixels', () => {
    const visiblePlayerBody = ROOM_AVATAR_SIZE * 52 / 92;
    expect(ROOM_NPC_BODY_SIZE).toBe(Math.round(visiblePlayerBody * 1.15));
    expect(ROOM_NPC_BODY_SIZE).toBe(16);
    expect(Math.abs(ROOM_NPC_BODY_SIZE * ROOM_ZOOM - visiblePlayerBody * 1.15 * ROOM_ZOOM)).toBeLessThanOrEqual(0.5 * ROOM_ZOOM);
  });
  it('uses actual dot width for legacy Bernard rooms, without canvas conversion', () => {
    expect(roomNpcBodySize(8, 'dot')).toBe(Math.round(8 * 1.15));
    expect(roomNpcBodySize(8, 'dot')).toBe(9);
  });
});