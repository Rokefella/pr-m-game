/**
 * Background save queue + movement debug state.
 * Movement never awaits anything here: saves are fire-and-forget, one in flight
 * per kind (latest payload wins), 6 s timeout, up to 3 retries with backoff,
 * one session refresh on 401/403. Failures are only logged.
 */
export const REQUEST_TIMEOUT_MS = 6000;
const MAX_RETRIES = 3;
const BACKOFF_MS = [500, 1500, 4000];

export type RequestFailure = { kind: string; status: number | string; time: number };
export type SaveResult = { error?: unknown; status?: number } | void;
type Job = (signal: AbortSignal) => PromiseLike<SaveResult>;

export const netDebug = {
  failures: [] as RequestFailure[],
  pending: {} as Record<string, number>,
};

export const movementDebug = {
  lastInputAt: 0,
  dir: '0,0',
  active: false,
  locks: {} as Record<string, boolean>,
  lastTickAt: 0,
  frameMs: 0,
  loopRestarts: 0,
};

export function recordFailure(kind: string, status: number | string) {
  netDebug.failures.push({ kind, status, time: Date.now() });
  if (netDebug.failures.length > 10) netDebug.failures.splice(0, netDebug.failures.length - 10);
}

/** fetch with an AbortController timeout; keeps any caller signal working. */
export function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, ms = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const outer = init.signal;
  if (outer) {
    if (outer.aborted) controller.abort();
    else outer.addEventListener('abort', () => controller.abort(), { once: true });
  }
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

let refresher: (() => Promise<unknown>) | null = null;
/** Registered by the client module to avoid an import cycle. */
export function setSessionRefresher(fn: () => Promise<unknown>) { refresher = fn; }

const latest = new Map<string, Job>();
const running = new Set<string>();
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const statusOf = (r: SaveResult, e?: unknown): number | string => {
  if (e) return e instanceof Error && e.name === 'AbortError' ? 'timeout' : 'network';
  const err = r && (r as { error?: { code?: string; status?: number } }).error;
  return (r && r.status) || err?.status || err?.code || 'error';
};

async function attempt(job: Job): Promise<{ ok: boolean; status: number | string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const r = await Promise.race([
      Promise.resolve(job(controller.signal)),
      new Promise<never>((_, rej) => controller.signal.addEventListener('abort', () => { const e = new Error('timeout'); e.name = 'AbortError'; rej(e); }, { once: true })),
    ]);
    if (r && r.error) return { ok: false, status: statusOf(r) };
    return { ok: true, status: 200 };
  } catch (e) {
    return { ok: false, status: statusOf(undefined, e) };
  } finally { clearTimeout(timer); }
}

async function drain(kind: string) {
  if (running.has(kind)) return;
  running.add(kind);
  try {
    while (latest.has(kind)) {
      const job = latest.get(kind)!;
      latest.delete(kind);
      let refreshed = false;
      for (let i = 0; i <= MAX_RETRIES; i++) {
        const { ok, status } = await attempt(job);
        if (ok) break;
        recordFailure(kind, status);
        console.warn(`[save:${kind}] failed`, status);
        if ((status === 401 || status === 403 || status === 'PGRST301') && !refreshed && refresher) {
          refreshed = true;
          try { await refresher(); } catch { /* logged by the failure ring */ }
          i--; continue;
        }
        if (latest.has(kind)) break; // a newer payload supersedes this one
        if (i === MAX_RETRIES) { if (!latest.has(kind)) parked.set(kind, job); break; }
        await sleep(BACKOFF_MS[i] ?? 4000);
      }
    }
  } finally {
    running.delete(kind);
    netDebug.pending[kind] = latest.has(kind) || parked.has(kind) ? 1 : 0;
  }
}

/** Jobs that exhausted retries; replayed when the browser reports it is online again. */
const parked = new Map<string, Job>();

export function enqueueSave(kind: string, job: Job) {
  parked.delete(kind);
  latest.set(kind, job);
  netDebug.pending[kind] = 1;
  void drain(kind);
}

if (typeof window !== 'undefined') {
  const replay = () => { for (const [k, j] of parked) { parked.delete(k); enqueueSave(k, j); } };
  window.addEventListener('online', replay);
  window.addEventListener('pageshow', replay);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') replay(); });
}

export function isMovementDebugOn() {
  try { return localStorage.getItem('praem_movement_debug') === '1'; } catch { return false; }
}
