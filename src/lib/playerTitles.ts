export const TITLES_BY_LEVEL: Record<number, string> = {
  1: 'Wanderer',
  2: 'Fragment Seeker',
  3: 'The Initiated',
  4: 'Threshold Walker',
  5: 'One Who Returns',
  6: 'The Remembered',
  7: 'Junction Finder',
  8: 'The Spiral Knows',
  9: 'Almost There',
  10: 'First One Through',
};

export const titlesUnlocked = (flags: Record<string, string>) => Number(flags.sam_stage ?? 0) >= 3;

/** Only fill an empty title; preserve and deduplicate existing unlocks. */
export function firstTitlePatch(flags: Record<string, string>, player: { title?: string | null; level?: number | null; unlocked_titles?: string[] | null }) {
  if (!titlesUnlocked(flags) || player.title?.trim()) return null;
  const title = TITLES_BY_LEVEL[player.level ?? 1] ?? TITLES_BY_LEVEL[1];
  return { title, unlocked_titles: [...new Set([...(player.unlocked_titles ?? []), title])] };
}