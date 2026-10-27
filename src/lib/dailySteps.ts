// In-memory only: remounts share a claim, but a new app session starts fresh.
const sessionClaims = new Map<string, Promise<number>>();
const announcedClaims = new Set<string>();
export function resetDailySteps(userId: string) { sessionClaims.delete(userId); announcedClaims.delete(userId); }

export function claimDailyStepsOnce(userId: string, claim: () => Promise<number>): Promise<number> {
  const existing = sessionClaims.get(userId);
  if (existing) return existing;
  const pending = Promise.resolve().then(claim);
  sessionClaims.set(userId, pending);
  return pending;
}

export async function waitForDailySteps(userId: string): Promise<void> {
  await sessionClaims.get(userId)?.catch(() => undefined);
}

export function takeDailyStepsAnnouncement(userId: string, granted: number): boolean {
  if (granted <= 0 || announcedClaims.has(userId)) return false;
  announcedClaims.add(userId);
  return true;
}