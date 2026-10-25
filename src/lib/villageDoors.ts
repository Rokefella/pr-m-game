export type VillageDoorKind = 'maze' | 'library' | 'exchange';
export type VillageDoorDef = { kind: VillageDoorKind; x: number; y: number };
type Point = { x: number; y: number };
type Footprint = Point & { w: number; h: number };

export const LIBRARY_MIN_LEVEL = 3;
export const EXCHANGE_MIN_LEVEL = 1;
export const DOOR_CELL = 20;
export const DOOR_MARGIN = 8;
export const DOOR_FLAGS: Record<VillageDoorKind, string> = { maze: 'touched_89', library: 'touched_23', exchange: 'touched_47' };
export const legacyDoorKind = (id: number): VillageDoorKind => id === 89 ? 'maze' : id === 23 ? 'library' : 'exchange';

export function villageDoors(explicit: VillageDoorDef[], buildings: (Footprint & { id: number })[]): VillageDoorDef[] {
  const kinds = new Set(explicit.map(d => d.kind));
  return [...explicit, ...buildings.filter(b => !kinds.has(legacyDoorKind(b.id))).map(b => ({
    kind: legacyDoorKind(b.id), x: b.x + b.w / 2 - DOOR_CELL / 2, y: b.y + b.h - DOOR_CELL,
  }))];
}

export function inDoorZone(p: Point, door: VillageDoorDef): boolean {
  return p.x >= door.x - DOOR_MARGIN && p.x <= door.x + DOOR_CELL + DOOR_MARGIN &&
    p.y >= door.y - DOOR_MARGIN && p.y <= door.y + DOOR_CELL + DOOR_MARGIN;
}

export function footprintHasDoor(b: Footprint, doors: VillageDoorDef[]): boolean {
  return doors.some(d => d.x < b.x + b.w && d.x + DOOR_CELL > b.x && d.y < b.y + b.h && d.y + DOOR_CELL > b.y);
}

export function doorRefusal(kind: VillageDoorKind, level: number, stage: number, libraryMin: number, exchangeMin: number): string | null {
  if (kind === 'maze' && stage < 2) return 'Not yet. Speak to Bernard first.';
  if (kind === 'library' && level < libraryMin) return 'The Library opens later.';
  if (kind === 'exchange' && level < exchangeMin) return 'The Exchange opens later.';
  return null;
}

export function nearestDoorReturn(origin: Point, obstacles: Footprint[], doors: VillageDoorDef[], width: number, height: number): Point | null {
  const free = (p: Point) => p.x >= 0 && p.y >= 0 && p.x <= width && p.y <= height &&
    !obstacles.some(o => p.x >= o.x - 2 && p.x <= o.x + o.w + 2 && p.y >= o.y - 2 && p.y <= o.y + o.h + 2) &&
    !doors.some(d => inDoorZone(p, d));
  if (free(origin)) return origin;
  // Search fine-grained square rings; choose the closest safe point on each ring.
  for (let ring = 1; ring <= Math.ceil(Math.max(width, height) / 4); ring++) {
    let best: Point | null = null;
    let distance = Infinity;
    const consider = (dx: number, dy: number) => {
      const p = { x: origin.x + dx * 4, y: origin.y + dy * 4 };
      const d = dx * dx + dy * dy;
      if (d < distance && free(p)) { best = p; distance = d; }
    };
    for (let i = -ring; i <= ring; i++) {
      consider(i, -ring); consider(i, ring); consider(-ring, i); consider(ring, i);
    }
    if (best) return best;
  }
  return null;
}