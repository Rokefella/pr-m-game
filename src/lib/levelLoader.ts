import { supabase } from '@/lib/supabase';

export type Cell = { col: number; row: number };
export type FragmentDef = Cell & { prime: number };
export type DoorToRoom = Cell & { roomId: string; reentry: Cell };

export type EggDef = Cell & { line: string };

export type LoadedLevelConfig = {
  cols: number;
  rows: number;
  spawn: Cell;
  openSet: Set<string>;
  specialSet: Set<string>;
  fragments: FragmentDef[];
  door: Cell;
  creditDoors: Cell[];
  doorsToRoom: DoorToRoom[];
  veilSet: Set<string>;
  eggs: EggDef[];
  alexandra?: Cell;
  claire?: Cell;
  fragmentsRequired: number;
};

export type Dimension = 'purple' | 'amber' | 'teal';

const rotate = (cell: Cell | null | undefined, dim: Dimension, N: number): Cell => {
  if (!cell || typeof cell.col !== 'number' || typeof cell.row !== 'number') {
    return { col: 1, row: 1 };
  }
  if (dim === 'amber') return { col: cell.row, row: N - 1 - cell.col };
  if (dim === 'teal') return { col: N - 1 - cell.row, row: cell.col };
  return { col: cell.col, row: cell.row };
};

export async function loadLevelFromSupabase(
  levelNumber: number,
  dimension: Dimension = 'purple',
): Promise<LoadedLevelConfig | null> {
  const { data, error } = await supabase
    .from('levels' as never)
    .select('level_number, level_name, grid_size, data')
    .eq('level_number', levelNumber)
    .maybeSingle();

  if (error) {
    console.error('loadLevelFromSupabase error', error);
    return null;
  }
  if (!data) return null;

  const row = data as { grid_size: number; data: Record<string, unknown> };
  const d = row.data || {};
  const N: number = (d.gridSize as number) ?? row.grid_size;

  const storageMode = (d.storageMode as string) ?? 'corridors';
  const wallsArr = (d.walls as Cell[]) ?? [];
  const corridorsArr = (d.corridors as Cell[]) ?? [];
  const fragmentsArr = (d.fragments as FragmentDef[]) ?? [];
  const goldenDoor = (d.goldenDoor as Cell | null | undefined) ?? null;
  const blueDoor = (d.blueDoor as Cell | null | undefined) ?? null;
  const start = (d.start as Cell | null | undefined) ?? null;
  const requiredFragments = (d.requiredFragments as number) ?? 5;
  const doorsToRoomArr = ((d.doorsToRoom as DoorToRoom[]) ?? []);
  const veilsArr = (d.veils as Cell[]) ?? [];

  // Reconstruct base open set in Purple coordinates
  const baseOpen = new Set<string>();
  if (storageMode === 'walls') {
    const wallKeys = new Set(wallsArr.map((w) => `${w.col},${w.row}`));
    // Interior cells only (exclude border)
    for (let r = 1; r < N - 1; r++) {
      for (let c = 1; c < N - 1; c++) {
        const k = `${c},${r}`;
        if (!wallKeys.has(k)) baseOpen.add(k);
      }
    }
  } else {
    corridorsArr.forEach((c) => baseOpen.add(`${c.col},${c.row}`));
  }

  // Rotate all coordinates per dimension
  const rot = (c: Cell) => rotate(c, dimension, N);

  const openSet = new Set<string>();
  baseOpen.forEach((k) => {
    const [cc, rr] = k.split(',').map(Number);
    const p = rot({ col: cc, row: rr });
    openSet.add(`${p.col},${p.row}`);
  });

  const fragments: FragmentDef[] = fragmentsArr.map((f) => ({ ...rot(f), prime: f.prime }));
  const door: Cell = rot(goldenDoor);
  const creditDoors: Cell[] = blueDoor ? [rot(blueDoor)] : [];
  const spawn: Cell = rot(start);
  const doorsToRoom: DoorToRoom[] = doorsToRoomArr.map((dr) => ({
    ...rot({ col: dr.col, row: dr.row }),
    roomId: dr.roomId,
    reentry: rot(dr.reentry),
  }));
  const veils = veilsArr.map((v) => rot(v));

  // Build specialSet of all special cells and force into openSet
  const specialSet = new Set<string>();
  const addSpecial = (c: Cell) => {
    const k = `${c.col},${c.row}`;
    specialSet.add(k);
    openSet.add(k);
  };
  fragments.forEach((f) => addSpecial(f));
  addSpecial(door);
  creditDoors.forEach(addSpecial);
  doorsToRoom.forEach((dr) => addSpecial({ col: dr.col, row: dr.row }));
  veils.forEach((v) => openSet.add(`${v.col},${v.row}`));

  const veilSet = new Set(veils.map((v) => `${v.col},${v.row}`));

  return {
    cols: N,
    rows: N,
    spawn,
    openSet,
    specialSet,
    fragments: fragments ?? [],
    door,
    creditDoors: creditDoors ?? [],
    doorsToRoom: doorsToRoom ?? [],
    veilSet,
    eggs: [],
    fragmentsRequired: requiredFragments,
  };
}
