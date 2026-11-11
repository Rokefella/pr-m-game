import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { inventoryChanged } from '@/lib/inventoryEvents';
import { USER_CREDITS_REFRESHED } from '@/lib/mechanics';

export type SetItem = { drop_key: string; name: string; icon_svg: string | null; need: number; have: number };
export type CollectorSet = { set_key: string; name: string; pays: number; complete: boolean; sold_before?: boolean; items: SetItem[] };
const rpc = supabase.rpc as unknown as (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
const iconSrc = (svg: string | null) => svg ? `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` : '';

export default function NellSets({ userId }: { userId: string }) {
  const [sets, setSets] = useState<CollectorSet[]>([]);
  const [note, setNote] = useState(''), [busy, setBusy] = useState(false);
  const flight = useRef(false);
  const load = useCallback(async () => {
    const { data, error } = await rpc('my_sets');
    if (!error && Array.isArray(data)) setSets(data as CollectorSet[]);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const sell = async (key: string) => {
    if (flight.current) return;
    flight.current = true; setBusy(true); setNote('');
    try {
      const { data, error } = await rpc('sell_set', { p_set: key });
      const r = data as { ok?: boolean; earned?: number; credits?: number } | null;
      if (error || !r?.ok) { setNote("That didn't work."); return; }
      setNote(`+${r.earned ?? 0} credits`);
      if (Number.isFinite(r.credits)) window.dispatchEvent(new CustomEvent(USER_CREDITS_REFRESHED, { detail: { userId, credits: r.credits } }));
      inventoryChanged(); await load();
    } finally { flight.current = false; setBusy(false); }
  };
  if (!sets.length && !note) return null;
  return <section aria-label="Sets" className="mt-3 border-t border-border pt-2">
    <h3 className="font-mono world-topics-title">Sets</h3>
    {sets.map(s => <div key={s.set_key} className="py-1" data-set={s.set_key}>
      <p className="font-fell">{s.name}</p>
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
        {s.items.map(i => <span key={i.drop_key} title={i.name} className="flex items-center gap-1" style={{ opacity: i.have >= i.need ? 1 : .4 }}>
          {i.icon_svg ? <img src={iconSrc(i.icon_svg)} alt={i.name} width={16} height={16} style={{ imageRendering: 'pixelated' }} /> : <span>{i.name}</span>}{Math.min(i.have, i.need)}/{i.need}
        </span>)}
        <span className="text-muted-foreground">{s.pays} credits</span>
      </div>
      {s.complete && <Button className="world-jump mt-1" disabled={busy} onClick={() => void sell(s.set_key)}>{busy ? '…' : 'Hand them over'}</Button>}
    </div>)}
    {note && <p className="font-mono world-receipt">{note}</p>}
  </section>;
}
