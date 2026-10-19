import { describe, expect, it } from 'vitest';
import { DOOR_FLAGS, doorRefusal, footprintHasDoor, inDoorZone, nearestDoorReturn, villageDoors } from './villageDoors';

describe('Village entrance rules', () => {
  const door = { kind: 'maze' as const, x: 100, y: 100 };
  it.each([{ x: 110, y: 92 }, { x: 110, y: 128 }, { x: 92, y: 110 }, { x: 128, y: 110 }])('includes the eight-pixel margin from every direction: %o', point => {
    expect(inDoorZone(point, door)).toBe(true);
  });
  it('releases outside the expanded cell', () => expect(inDoorZone({ x: 110, y: 129 }, door)).toBe(false));
  it('preserves legacy bottom-centre entrances when no tiles exist', () => {
    expect(villageDoors([], [{ id: 89, x: 100, y: 100, w: 90, h: 70 }])).toEqual([{ kind: 'maze', x: 135, y: 150 }]);
  });
  it('supersedes only the matching legacy kind', () => {
    expect(villageDoors([door], [{ id: 89, x: 0, y: 0, w: 90, h: 70 }, { id: 23, x: 20, y: 20, w: 70, h: 50 }])).toEqual([door, { kind: 'library', x: 45, y: 50 }]);
  });
  it('requires Bernard stage two for maze entry', () => {
    expect(doorRefusal('maze', 1, 1, 3, 1)).toBe('Not yet. Speak to Bernard first.');
    expect(doorRefusal('maze', 1, 2, 3, 1)).toBeNull();
  });
  it('requires library level three', () => {
    expect(doorRefusal('library', 2, 2, 3, 1)).toBe('The Library opens later.');
    expect(doorRefusal('library', 3, 2, 3, 1)).toBeNull();
  });
  it('requires exchange level one', () => {
    expect(doorRefusal('exchange', 0, 2, 3, 1)).toBe('The Exchange opens later.');
    expect(doorRefusal('exchange', 1, 2, 3, 1)).toBeNull();
  });
  it('keeps the existing touched flags', () => expect(DOOR_FLAGS).toEqual({ maze: 'touched_89', library: 'touched_23', exchange: 'touched_47' }));
  it('returns to the closest safe ring outside buildings and door zones', () => {
    const building = { x: 80, y: 60, w: 60, h: 60 };
    const result = nearestDoorReturn({ x: 110, y: 110 }, [building], [door], 300, 300);
    expect(result).toEqual({ x: 110, y: 130 });
    expect(result && inDoorZone(result, door)).toBe(false);
  });
  it('avoids every entrance when returning', () => {
    const result = nearestDoorReturn({ x: 110, y: 110 }, [], [door, { kind: 'library', x: 100, y: 120 }], 300, 300);
    expect(result).toEqual({ x: 110, y: 90 });
  });
  it('suppresses decorative doorways on footprints containing a tile', () => {
    expect(footprintHasDoor({ x: 80, y: 80, w: 40, h: 40 }, [door])).toBe(true);
    expect(footprintHasDoor({ x: 0, y: 0, w: 20, h: 20 }, [door])).toBe(false);
  });
});