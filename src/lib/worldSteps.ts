export const WORLD_STEP_FLUSH_MS = 3000;
export const WORLD_STEP_FLUSH_MOVES = 20;
export const WORLD_STEP_BATCH = 2000;
export const HEAVY_LEGS = "Your legs are heavy. You'll walk slowly until the day gives you more.";
export function stepWalkDuration(duration: number, balance: number) { return duration * (balance > 0 ? 1 : 3); }
/** Pending includes in-flight spend until the server confirms it. */
export class WorldSteps {
  pending = 0;
  moves = 0;
  total = 0;
  revision = 0;
  private flight: Promise<void> | null = null;
  constructor(public saved: number, private spend: (amount: number) => Promise<number>, private changed: () => void) {}
  get balance() { return Math.max(0, Math.floor(this.saved - this.pending)); }
  async settled() { await this.flight; }
  discard() { this.pending = 0; this.moves = 0; }
  refresh(saved: number) { this.saved = Math.max(0, saved); this.changed(); }
  move(cost: number) {
    const charged = this.balance > 0 ? Math.max(0, cost) : 0;
    this.pending += charged; this.total += charged; this.moves++;
    this.changed();
    if (this.moves >= WORLD_STEP_FLUSH_MOVES) void this.flush().catch(() => undefined);
  }
  flush(): Promise<void> {
    if (this.flight) return this.flight;
    this.moves = 0;
    this.flight = Promise.resolve().then(async () => {
      while (Math.floor(this.pending) > 0) {
        const amount = Math.min(WORLD_STEP_BATCH, Math.floor(this.pending));
        const saved = await this.spend(amount);
        this.pending = Math.max(0, this.pending - amount);
        this.saved = Math.max(0, saved); this.revision++;
        this.changed();
      }
    }).finally(() => { this.flight = null; });
    return this.flight;
  }
}
export function bindWorldStepFlush(steps: WorldSteps) {
  const flush = () => { void steps.flush().catch(() => undefined); };
  const hidden = () => { if (document.visibilityState === 'hidden') flush(); };
  const timer = window.setInterval(flush, WORLD_STEP_FLUSH_MS);
  document.addEventListener('visibilitychange', hidden);
  window.addEventListener('pagehide', flush);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', hidden);
    window.removeEventListener('pagehide', flush);
    flush();
  };
}
