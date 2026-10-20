export const EYE_MS = 800;
export const TYPE_MS_PER_CHAR = 35;
export const DECODE_MS_PER_DIGIT = 260;
export const REVEAL_FLASH_MS = 500;
export const REDUCED_REVEAL_MS = 300;
export const FOLDER_TOTAL = 20;

// Collection can persist before or after the overlay mounts. Excluding this
// prime among carried rows gives the same pre-collection count in both cases.
export function countBeforeFragment(rows: { prime_number: number; banked?: boolean | null }[], prime: number) {
  return Math.min(FOLDER_TOTAL, rows.filter(row => row.banked === false && row.prime_number !== prime).length);
}