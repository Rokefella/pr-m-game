// A failed save is never silent: any caller can raise one short in-world message.
export const SAVE_FAILED_EVENT = 'praem:save-failed';
export const SAVE_FAILED_TEXT = "That didn't save. Try again.";
export function notifySaveFailed(where: string, error?: unknown): void {
  console.error(`[save] ${where} failed`, error);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(SAVE_FAILED_EVENT, { detail: { where } }));
}
/** Throws away nothing: reports a Supabase-style { error } or ok:false result and says whether it failed. */
export function reportIfFailed(where: string, result: { error?: unknown; data?: unknown } | null | undefined): boolean {
  const data = result?.data as { ok?: unknown } | null | undefined;
  const failed = Boolean(result?.error) || (data != null && typeof data === 'object' && data.ok === false);
  if (failed) notifySaveFailed(where, result?.error ?? data);
  return failed;
}
