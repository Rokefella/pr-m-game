import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import DropIcon from '@/components/DropIcon';
import { Button } from '@/components/ui/button';
import { type OrbChange } from '@/lib/orb';
import { useAuth } from '@/context/AuthContext';
import { isStepMechanic, mechanicBlocked, mechanicWhisper, MECHANIC_USED, type MazeUseContext, type MechanicResult } from '@/lib/mechanics';

type Rpc = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
const rpc = (fn: string, args: Record<string, unknown>) => (supabase.rpc as unknown as Rpc)(fn, args);

export type DetailDrop = { id: string; name: string; description: string | null; category: string | null; icon_svg: string | null; rarity?: string | null; drop_key?: string };

/** Drop detail sheet; dyes get a USE button that consumes them server-side. */
export function DropDetail({ drop, onClose, onUsed, maze, steps, onRefresh }: { drop: DetailDrop; onClose: () => void; onUsed: (msg: string, change?: OrbChange) => void; maze?: MazeUseContext; steps?: number; onRefresh?: () => void }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const isDye = drop.category === 'dye';
  const isMechanic = drop.category === 'mechanic';
  const stepDrop = isStepMechanic(drop);
  const blocked = isMechanic ? mechanicBlocked(stepDrop, steps, maze) : '';
  const useMechanic = async () => {
    if (busy || blocked) return;
    setBusy(true); setMsg('');
    let called = false;
    try {
      await maze?.beforeUse?.();
      const position = maze?.position();
      called = true;
      const { data, error } = await rpc('use_mechanic', { p_drop_id: drop.id, p_level: stepDrop ? null : maze?.level ?? null, p_col: stepDrop ? null : position?.col ?? null, p_row: stepDrop ? null : position?.row ?? null });
      const result = data as MechanicResult | null;
      if (error || !result?.ok) {
        setMsg(result?.reason === 'already_active' ? 'Already active in this run.' : result?.reason === 'needs_maze_run' || result?.reason === 'needs_position' ? 'Use it inside a maze.' : 'No signal. Try again.');
        return;
      }
      window.dispatchEvent(new CustomEvent(MECHANIC_USED, { detail: { ...result, userId: user?.id, level: maze?.level } }));
      onUsed(mechanicWhisper(result));
    } catch { setMsg('No signal. Try again.'); }
    finally { if (called) { onRefresh?.(); window.dispatchEvent(new CustomEvent(MECHANIC_USED, { detail: { userId: user?.id, level: maze?.level } })); } setBusy(false); }
  };
  const use = async () => {
    if (busy) return;
    setBusy(true); setMsg('');
    try {
      const { data, error } = await rpc('use_dye', { p_drop_id: drop.id });
      const res = data as { ok?: boolean; name?: string; color?: string; dye_key?: string } | null;
      if (error || !res?.ok) { setMsg('No signal. Try again.'); return; }
      let change: OrbChange = { aura_color: res.color ?? null, orb_dye: res.dye_key ?? null };
      // Consumption has already persisted. A failed refresh must not offer USE again.
      if (user) {
        try {
          const { data: row, error: readError } = await supabase.from('users').select('aura_color, orb_dye').eq('id', user.id).maybeSingle();
          if (!readError && row) change = row as OrbChange;
        } catch { /* The authoritative RPC response remains usable. */ }
      }
      onUsed(`Your orb turns ${res.name ?? drop.name}.`, change);
    } catch { setMsg('No signal. Try again.'); }
    finally { setBusy(false); }
  };
  return <div className="drop-detail" role="dialog" aria-label={drop.name}>
    <Button type="button" variant="ghost" className="drop-detail-close font-mono" aria-label="Close" onClick={onClose}>×</Button>
    <DropIcon svg={drop.icon_svg} category={drop.category} size={64} />
    <div className="font-cinzel drop-detail-name">{drop.name}</div>
    {drop.rarity && <span className="drop-rarity-chip font-mono">{drop.rarity.toUpperCase()}</span>}
    <p className="font-fell italic drop-detail-desc">{drop.description ?? 'Its purpose is not yet clear.'}</p>
    {isDye || isMechanic
      ? <><Button type="button" className="font-cinzel drop-detail-use" disabled={busy || Boolean(blocked)} onClick={isDye ? use : useMechanic}>USE</Button>{blocked && <p className="font-fell italic drop-detail-msg">{blocked}</p>}</>
      : <p className="font-fell italic drop-detail-msg">Not usable yet.</p>}
    {msg && <p className="font-fell italic drop-detail-msg">{msg}</p>}
  </div>;
}
