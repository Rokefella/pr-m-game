import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type RingProgress = { ring: number; name: string; found: number; total: number };
/** Per-ring find counts, reloaded every time the map opens (mount). */
export default function FindsProgress() {
  const [rings, setRings] = useState<RingProgress[]>([]);
  useEffect(() => {
    let live = true;
    void (supabase.rpc as unknown as (fn: string) => Promise<{ data: RingProgress[] | null; error: unknown }>)('finds_progress').then(({ data, error }) => {
      if (live && !error && Array.isArray(data)) setRings([...data].sort((a, b) => Number(a.ring) - Number(b.ring)));
    }).catch(() => {});
    return () => { live = false; };
  }, []);
  const shown = rings.filter(r => Number(r.total) > 0);
  if (!shown.length) return null;
  return <ul className="font-mono flex flex-wrap gap-x-4 gap-y-1 px-4 py-2 text-xs text-muted-foreground" aria-label="Finds per ring">
    {shown.map(r => <li key={r.ring} data-complete={Number(r.found) >= Number(r.total) || undefined} style={Number(r.found) >= Number(r.total) ? { color: 'hsl(var(--gold))' } : undefined}>{r.name} {r.found}/{r.total}</li>)}
  </ul>;
}
