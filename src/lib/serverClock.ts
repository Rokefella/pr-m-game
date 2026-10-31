import { supabase } from '@/lib/supabase';

/**
 * Server time without a new database function: a fresh session token's `iat`
 * is stamped by the auth server's clock. We refresh once, remember the offset
 * from the device clock, and derive UTC dates from it. Fails closed (null).
 */
let offsetMs: number | null = null;
let pending: Promise<number | null> | null = null;

export const tokenIssuedAt = (accessToken: string | undefined | null): number | null => {
  try {
    const payload = JSON.parse(atob((accessToken ?? '').split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.iat === 'number' ? payload.iat * 1000 : null;
  } catch { return null; }
};

async function measure(): Promise<number | null> {
  const before = Date.now();
  const { data, error } = await supabase.auth.refreshSession();
  if (error) return null;
  const iat = tokenIssuedAt(data.session?.access_token);
  if (iat === null) return null;
  // iat is whole seconds; compare against the request midpoint.
  return iat + 500 - (before + Date.now()) / 2;
}

/** The server's current time, or null when it cannot be read. */
export async function serverNow(): Promise<Date | null> {
  if (offsetMs === null) {
    pending ??= measure().finally(() => { pending = null; });
    offsetMs = await pending;
    if (offsetMs === null) return null;
  }
  return new Date(Date.now() + offsetMs);
}

export const _resetServerClock = () => { offsetMs = null; pending = null; };
