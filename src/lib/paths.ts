import type { NpcQuestState } from '@/lib/npcQuestState';

/** Server-owned path rows from my_paths(); the client only displays them and records what was seen. */
export type PathColour = 'purple' | 'teal' | 'gold';
export type Path = {
  quest_key: string; name: string; colour: PathColour; type: 'main' | 'side'; giver: string;
  state: 'active' | 'done'; step_key: string; line: string | null;
  progress: { have: number; total: number } | null; seen: string | null;
};
export type PathBannerItem = { kind: 'start' | 'step'; path: Path };

export function parsePaths(data: unknown): Path[] {
  if (!Array.isArray(data)) return [];
  return data.filter((p): p is Path => !!p && typeof p === 'object' && typeof (p as Path).quest_key === 'string')
    .map(p => ({ ...p, colour: (['purple', 'teal', 'gold'] as const).includes(p.colour) ? p.colour : 'purple' }));
}

/** Banners to show (in order) and finished paths to silently mark seen. */
export function buildPathQueue(paths: Path[]): { banners: PathBannerItem[]; done: Path[] } {
  const banners: PathBannerItem[] = [];
  const done: Path[] = [];
  for (const path of paths) {
    if (path.state === 'active') {
      if (path.seen == null) banners.push({ kind: 'start', path });
      else if (path.seen !== path.step_key) banners.push({ kind: 'step', path });
    } else if (path.state === 'done' && path.seen !== 'done') done.push(path);
  }
  return { banners, done };
}

const giverKey = (key: string) => {
  const k = key.toLowerCase().replace(/^the\s+/, '').split(' ')[0];
  return k === 'sam' ? 'bernard' : k;
};
export const pathGivenBy = (path: Path, npc: string) => giverKey(path.giver) === giverKey(npc);

export type NpcArrow = { state: 'available' | 'active' | 'ready'; colour: PathColour } | null;
export function npcArrow(quest: NpcQuestState, npc: string, paths: Path[]): NpcArrow {
  const path = paths.find(p => p.state === 'active' && pathGivenBy(p, npc));
  const colour = path?.colour ?? 'purple';
  if (quest === 'available' || quest === 'active' || quest === 'ready') return { state: quest, colour };
  return path ? { state: 'active', colour } : null;
}

export const progressText = (p: Path['progress']) => p ? `${p.have} of ${p.total}` : '';

/** Hand-built entries for quests my_paths() doesn't return yet; shown below the server paths. */
export function pathLegacyEntries(paths: Path[], state: { alexandraActive: boolean }) {
  const out: { key: string; name: string; line: string }[] = [];
  if (state.alexandraActive && !paths.some(p => p.quest_key.includes('alexandra')))
    out.push({ key: 'alexandra', name: 'The One Who Was Here Before', line: 'Someone was here before. Follow it far enough and you will find them.' });
  return out;
}
