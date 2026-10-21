import { describe, expect, it } from 'vitest';
import { ROOM_AVATAR_SIZE, ROOM_NPC_BODY_SIZE, roomNpcBodySize } from './roomConfig';
import { AVATAR_BODY_RATIO, NPC_BODY_SCALE } from '@/lib/orbSizes';

describe('room NPC body sizing', () => {
  it('matches the player orb body in world pixels', () => {
    expect(ROOM_NPC_BODY_SIZE).toBe(Math.round(ROOM_AVATAR_SIZE * AVATAR_BODY_RATIO * NPC_BODY_SCALE));
    expect(ROOM_NPC_BODY_SIZE).toBe(14);
  });
  it('scales legacy dot rooms from their dot width', () => {
    expect(roomNpcBodySize(8, 'dot')).toBe(Math.round(8 * NPC_BODY_SCALE));
    expect(roomNpcBodySize(8, 'dot')).toBe(8);
  });
});
