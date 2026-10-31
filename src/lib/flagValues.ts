// Pure flag comparisons, kept free of the database client so callers and mocks stay simple.
const numeric = (value: string) => value.trim() !== '' && Number.isFinite(Number(value));

/** Reads a flag as a number; missing, empty or non-numeric values count as 0. */
export function flagNumber(flags: Readonly<Record<string, string | null | undefined>> | null | undefined, key: string): number {
  const raw = flags?.[key];
  if (raw == null || !numeric(String(raw))) return 0;
  return Number(raw);
}

/**
 * One flag comparison. A missing (or empty) flag counts as "0".
 * atLeast: numeric expectations compare as numbers (actual >= expected); otherwise exact text match.
 */
export function compareFlag(actual: string | null | undefined, expected: unknown, atLeast = false): boolean {
  const want = String(expected ?? '');
  const have = actual == null || actual.trim() === '' ? '0' : actual;
  if (atLeast && numeric(want)) return numeric(have) && Number(have) >= Number(want);
  if (numeric(want) && numeric(have)) return Number(have) === Number(want);
  return have === want;
}
