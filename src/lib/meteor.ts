/** The meteor fall: a once-per-player presentation. The server owns `meteor`; the client only remembers it must play. */
export const METEOR_PLAY = 'praem:meteor-play';
export const WORLD_RELOAD = 'praem:world-reload';
export const METEOR_LINE = 'Something fell out of the sky.';
export const METEOR_MS = 6000;
export const METEOR_REDUCED_MS = 2000;

const pendingKey = (userId: string) => `praem.meteorPending.${userId}`;
export function markMeteorPending(userId: string) { try { localStorage.setItem(pendingKey(userId), '1'); } catch { /* storage unavailable */ } }
export function clearMeteorPending(userId: string) { try { localStorage.removeItem(pendingKey(userId)); } catch { /* storage unavailable */ } }
export function meteorPending(userId: string) { try { return localStorage.getItem(pendingKey(userId)) === '1'; } catch { return false; } }

/** Play when complete_maze just reported the fall, or the server says it fell but this player never saw it. */
export function shouldPlayMeteor(flags: Record<string, string | undefined>, pending: boolean): boolean {
  if (pending) return true;
  return flags.meteor === 'fallen' && flags.ui_meteor_seen !== '1';
}
