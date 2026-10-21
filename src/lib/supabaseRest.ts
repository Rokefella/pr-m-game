import { supabase } from '@/lib/supabase';
import { fetchWithTimeout, recordFailure } from '@/lib/netQueue';

const SUPABASE_URL = 'https://jngofylkynipsnzyyzdq.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuZ29meWxreW5pcHNuenl5emRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NjIzNDEsImV4cCI6MjA5MjUzODM0MX0.FWvc_DwabUSkxgHVwKRA3T2SMTlQ7aQr12a7yGUEW64';

/** Sends the signed-in user's token; on 401/403 refreshes the session once and retries once. */
const authedFetch = async (kind: string, url: string, init: RequestInit = {}) => {
  const send = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return fetchWithTimeout(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers ?? {}) },
    });
  };
  let response = await send();
  if (response.status === 401 || response.status === 403) {
    recordFailure(kind, response.status);
    await supabase.auth.refreshSession().catch(() => undefined);
    response = await send();
  }
  if (!response.ok) recordFailure(kind, response.status);
  return response;
};

export const restInsert = async (table: string, data: object) => {
  const response = await authedFetch(`insert:${table}`, `${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(data),
  });
  return response.json();
};

export const restUpdate = async (table: string, data: object, column: string, value: string) => {
  const response = await authedFetch(`update:${table}`, `${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${value}`, {
    method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(data),
  });
  return response.json();
};

export const restSelect = async (table: string, column: string, value: string, select = '*') => {
  const response = await authedFetch(`select:${table}`, `${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${value}&select=${select}`);
  return response.json();
};
