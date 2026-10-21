import { describe, expect, it } from 'vitest';
import { ROOM_AVATAR_SIZE, ROOM_NPC_BODY_SIZE, roomNpcBodySize } from './roomConfig';
import { NPC_BODY_SCALE } from '@/lib/orbSizes';

describe('room NPC body sizing', () => {
  it('is the room avatar size times the shared NPC scale, in world pixels', () => {
    expect(ROOM_NPC_BODY_SIZE).toBe(Math.round(ROOM_AVATAR_SIZE * NPC_BODY_SCALE));
    expect(ROOM_NPC_BODY_SIZE).toBe(29);
  });
  it('scales legacy dot rooms from their dot width', () => {
    expect(roomNpcBodySize(8)).toBe(Math.round(8 * NPC_BODY_SCALE));
    expect(roomNpcBodySize(8)).toBe(9);
  });
});
