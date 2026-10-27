import { supabase } from './supabase';
export const DISCOVERY_BLOCKS = 10000;
export const DISCOVERY_SAVE_MS = 15000;
const normalise = (bits: string | null | undefined) => Array.from({ length: 2500 }, (_, i) => /^[0-9a-f]$/i.test(bits?.[i] ?? '') ? bits?.[i].toLowerCase() : '0').join('');
export const mergeDiscovery = (a?: string | null, b?: string | null) => {
  const left = normalise(a), right = normalise(b);
  return Array.from(left, (c, i) => (parseInt(c, 16) | parseInt(right[i], 16)).toString(16)).join('');
};
export const discoveredBlock = (bits: string, x: number, y: number) => {
  if (x < 0 || y < 0 || x >= 100 || y >= 100) return false;
  const i = y * 100 + x;
  return Boolean((parseInt(bits[Math.floor(i / 4)] ?? '0', 16) || 0) & (8 >> (i % 4)));
};
export const discoveryCount = (bits: string) => Array.from(normalise(bits)).reduce((sum, c) => sum + [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4][parseInt(c, 16)], 0);
export function discoverAround(bits: string, x: number, y: number, layer: number) {
  if (layer !== 0) return bits;
  const chars = Array.from(normalise(bits)), bx = Math.floor(x / 10), by = Math.floor(y / 10);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const nx = bx + dx, ny = by + dy; if (nx < 0 || ny < 0 || nx >= 100 || ny >= 100) continue;
    const i = ny * 100 + nx, digit = Math.floor(i / 4);
    chars[digit] = (parseInt(chars[digit], 16) | (8 >> (i % 4))).toString(16);
  }
  return chars.join('');
}
/** Existing bits represent ten-cell blocks; reveal every block containing a cell in the circle. */
export function discoverRadius(bits: string, x: number, y: number, radius: number) {
  const chars = Array.from(normalise(bits));
  for (let by = Math.max(0, Math.floor((y - radius) / 10)); by <= Math.min(99, Math.floor((y + radius) / 10)); by++) {
    for (let bx = Math.max(0, Math.floor((x - radius) / 10)); bx <= Math.min(99, Math.floor((x + radius) / 10)); bx++) {
      const cx = Math.max(bx * 10, Math.min(x, bx * 10 + 9)), cy = Math.max(by * 10, Math.min(y, by * 10 + 9));
      if (Math.hypot(cx - x, cy - y) > radius) continue;
      const i = by * 100 + bx, digit = Math.floor(i / 4);
      chars[digit] = (parseInt(chars[digit], 16) | (8 >> (i % 4))).toString(16);
    }
  }
  return chars.join('');
}
export class WorldDiscovery {
  bits: string;
  private dirty = false;
  private loading = true;
  private loaded = false;
  private disposed = false;
  private inFlight: Promise<void> | null = null;
  private lastAttempt = Date.now();
  private timer: ReturnType<typeof setInterval>;
  private listeners = new Set<() => void>();
  private key: string;
  constructor(private userId: string) {
    this.key = `praem.worldDiscovery.${userId}`;
    let local = ''; try { local = localStorage.getItem(this.key) ?? ''; } catch { /* unavailable */ }
    this.bits = mergeDiscovery(local);
    this.timer = setInterval(() => { if (!this.loaded && !this.loading && Date.now() - this.lastAttempt >= DISCOVERY_SAVE_MS) void this.load(); else void this.flush(); }, 1000);
    void this.load();
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish() { try { localStorage.setItem(this.key, this.bits); } catch { /* unavailable */ } this.listeners.forEach(f => f()); }
  private async load() {
    this.loading = true; this.lastAttempt = Date.now();
    try {
      const { data, error } = await supabase.from('world_discovery' as never).select('bits').eq('user_id', this.userId).maybeSingle();
      if (error) return;
      const server = (data as unknown as { bits?: string } | null)?.bits;
      this.bits = mergeDiscovery(this.bits, server); this.dirty = this.bits !== mergeDiscovery(server); this.loaded = true; this.publish();
    } catch { /* retain local */ } finally { this.loading = false; if (this.disposed) void this.flush(true); }
  }
  walk(x: number, y: number, layer: number) {
    const next = discoverAround(this.bits, x, y, layer);
    if (next === this.bits) return;
    this.bits = next; this.dirty = true; this.publish();
  }
  reveal(x: number, y: number, radius: number) {
    const next = discoverRadius(this.bits, x, y, radius);
    if (next === this.bits) return;
    this.bits = next; this.dirty = true; this.publish();
    void this.flush();
  }
  flush(force = false): Promise<void> {
    if (this.inFlight) return force ? this.inFlight.then(() => this.flush(true)) : this.inFlight;
    if (this.loading || !this.loaded || !this.dirty || (!force && Date.now() - this.lastAttempt < DISCOVERY_SAVE_MS)) return Promise.resolve();
    this.lastAttempt = Date.now(); const snapshot = this.bits;
    this.inFlight = (async () => {
      try {
        const { error } = await supabase.from('world_discovery' as never).upsert({ user_id: this.userId, bits: snapshot, blocks: discoveryCount(snapshot), updated_at: new Date().toISOString() } as never, { onConflict: 'user_id' });
        if (!error && this.bits === snapshot) this.dirty = false;
      } catch { /* retry from local copy */ } finally { this.inFlight = null; }
    })();
    return this.inFlight;
  }
  dispose() { this.disposed = true; clearInterval(this.timer); void this.flush(true); }
  abandon() { this.disposed = true; this.dirty = false; this.loaded = false; clearInterval(this.timer); }
}