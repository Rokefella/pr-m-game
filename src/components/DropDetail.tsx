import { useState , useRef } from 'react';
import { inventoryChanged } from '@/lib/inventoryEvents';
import { Minus, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import DropIcon from '@/components/DropIcon';
import { canLetGo, clampCount, discardDrops, discardFailure, letGoQuestion } from '@/lib/letGo';
import { Button } from '@/components/ui/button';
import { type OrbChange } from '@/lib/orb';
import { useAuth } from '@/context/AuthContext';
import { isStepMechanic, isCreditMechanic, mechanicBlocked, mechanicWhisper, MECHANIC_USED, USER_STEPS_REFRESHED, USER_CREDITS_REFRESHED, type MazeUseContext, type MechanicResult, type WorldUseContext, WORLD_REVEALED, isWorldMapScrap, stackReceipt } from '@/lib/mechanics';

type Rpc = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
const rpc = (fn: string, args: Record<string, unknown>) => (supabase.rpc as unknown as Rpc)(fn, args);

export type DetailDrop = { id: string; name: string; description: string | null; category: string | null; icon_svg: string | null; rarity?: string | null; drop_key?: string; effect?: string | null; count?: number };

/** Drop detail sheet; dyes get a USE button that consumes them server-side. */
export function DropDetail({ drop, onClose, onUsed, maze, steps, onRefresh, beforeUse, world }: { drop: DetailDrop; onClose: () => void; onUsed: (msg: string, change?: OrbChange) => void; maze?: MazeUseContext; steps?: number; onRefresh?: () => void; beforeUse?: () => Promise<void>; world?: WorldUseContext }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const flight = useRef(false);
  const [msg, setMsg] = useState('');
  const [choosing, setChoosing] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const count = Math.max(1, drop.count ?? 1);
  const [letting, setLetting] = useState(false);
  const [letCount, setLetCount] = useState(1);
  const [asking, setAsking] = useState(false);
  const letGo = async () => {
    if (flight.current || !drop.drop_key) return;
    flight.current = true; setBusy(true); setMsg('');
    try {
      const res = await discardDrops(user?.id, drop.drop_key, letCount, false);
      if (!res.ok) { setMsg(discardFailure(res.reason)); return; }
      onRefresh?.();
      onUsed(`Left behind: ${res.removed ?? letCount} × ${drop.name}.`);
    } catch { setMsg('No signal. Try again.'); }
    finally { flight.current = false; setBusy(false); setAsking(false); }
  };
  const isDye = drop.category === 'dye';
  const isMechanic = drop.category === 'mechanic';
  const stepDrop = isStepMechanic(drop);
  const creditDrop = isCreditMechanic(drop), resourceDrop = stepDrop || creditDrop;
  const mapScrap = isWorldMapScrap(drop);
  const stackUse = resourceDrop && Boolean(drop.drop_key);
  const blocked = mapScrap ? maze ? 'This belongs to the open world.' : !world || world.layer !== 0 ? 'Use it in the open world.' : '' : isMechanic ? mechanicBlocked(stepDrop, steps, maze, creditDrop) : '';
  const useMechanic = async () => {
    if (flight.current || blocked) return;
    flight.current = true; setBusy(true); setMsg('');
    let called = false;
    try {
      if (beforeUse) await beforeUse();
      await maze?.beforeUse?.();
      const position = maze?.position();
      called = true;
      const at = world?.position();
      const { data, error } = stackUse
        ? await rpc('use_drops', { p_drop_key: drop.drop_key, p_count: quantity, p_x: at?.x ?? null, p_y: at?.y ?? null })
        : await rpc('use_mechanic', { p_drop_id: drop.id, p_level: resourceDrop || mapScrap ? null : maze?.level ?? null, p_col: mapScrap ? at?.x ?? null : resourceDrop ? null : position?.col ?? null, p_row: mapScrap ? at?.y ?? null : resourceDrop ? null : position?.row ?? null });
      const result = data as MechanicResult | null;
      if (error || !result?.ok) {
        setMsg(result?.reason === 'already_active' ? 'Already active in this run.' : result?.reason === 'needs_maze_run' || result?.reason === 'needs_position' ? 'Use it inside a maze.' : 'No signal. Try again.');
        return;
      }
      window.dispatchEvent(new CustomEvent(MECHANIC_USED, { detail: { ...result, userId: user?.id, level: maze?.level } }));
      if (Number.isFinite(result.steps_remaining)) window.dispatchEvent(new CustomEvent(USER_STEPS_REFRESHED, { detail: { userId: user?.id, steps: result.steps_remaining } }));
      if (Number.isFinite(result.credits)) window.dispatchEvent(new CustomEvent(USER_CREDITS_REFRESHED, { detail: { userId: user?.id, credits: result.credits } }));
      inventoryChanged();
      if (result.effect === 'world_reveal') window.dispatchEvent(new CustomEvent(WORLD_REVEALED, { detail: { ...result, userId: user?.id } }));
      onUsed(stackUse ? stackReceipt(result, drop.effect, result.used ?? quantity) : mechanicWhisper(result));
    } catch { setMsg('No signal. Try again.'); }
    finally { if (called) { onRefresh?.(); window.dispatchEvent(new CustomEvent(MECHANIC_USED, { detail: { userId: user?.id, level: maze?.level } })); } flight.current = false; setBusy(false); }
  };
  const use = async () => {
    if (flight.current) return;
    flight.current = true; setBusy(true); setMsg('');
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
      inventoryChanged();
      onUsed(`Your orb turns ${res.name ?? drop.name}.`, change);
    } catch { setMsg('No signal. Try again.'); }
    finally { flight.current = false; setBusy(false); }
  };
  return <div className="drop-detail" role="dialog" aria-label={drop.name}>
    <Button type="button" variant="ghost" className="drop-detail-close font-mono" aria-label="Close" onClick={onClose}>×</Button>
    <DropIcon svg={drop.icon_svg} category={drop.category} size={64} drop_key={drop.drop_key} />
    <div className="font-cinzel drop-detail-name">{drop.name}</div>
    {drop.rarity && <span className="drop-rarity-chip font-mono">{drop.rarity.toUpperCase()}</span>}
    <p className="font-fell italic drop-detail-desc">{drop.description ?? 'Its purpose is not yet clear.'}</p>
    {isDye || isMechanic
      ? <><Button type="button" className="font-cinzel drop-detail-use" disabled={busy || Boolean(blocked)} onClick={isDye ? use : () => { if (stackUse && !choosing) setChoosing(true); else void useMechanic(); }}>USE</Button>{choosing && <div className="flex items-center justify-center gap-2 py-2"><span className="font-fell">How many?</span><Button variant="ghost" size="icon" aria-label="Decrease quantity" disabled={busy || quantity <= 1} onClick={() => setQuantity(n => Math.max(1, n - 1))}><Minus size={16} /></Button><output className="font-mono" aria-label="Quantity">{quantity}</output><Button variant="ghost" size="icon" aria-label="Increase quantity" disabled={busy || quantity >= count} onClick={() => setQuantity(n => Math.min(count, n + 1))}><Plus size={16} /></Button><Button variant="outline" disabled={busy} onClick={() => setQuantity(count)}>MAX</Button></div>}{blocked && <p className="font-fell italic drop-detail-msg">{blocked}</p>}</>
      : drop.category === 'tool' ? null : <p className="font-fell italic drop-detail-msg">Not usable yet.</p>}
    {canLetGo(drop) && drop.drop_key && (!letting
      ? <Button type="button" variant="outline" className="font-cinzel" disabled={busy} onClick={() => { setLetting(true); setLetCount(1); }}>LET GO</Button>
      : asking
        ? <div role="alertdialog" aria-label="Let go" className="py-2"><p className="font-fell">{letGoQuestion(letCount, drop.name)}</p><div className="flex justify-center gap-2 mt-2"><Button variant="outline" disabled={busy} onClick={() => void letGo()}>{busy ? '…' : 'LEAVE IT'}</Button><Button variant="ghost" disabled={busy} onClick={() => setAsking(false)}>KEEP</Button></div></div>
        : <div className="flex items-center justify-center gap-2 py-2"><span className="font-fell">How many?</span><Button variant="ghost" size="icon" aria-label="Fewer to let go" disabled={letCount <= 1} onClick={() => setLetCount(n => clampCount(n - 1, count))}><Minus size={16} /></Button><output className="font-mono" aria-label="Let go quantity">{letCount}</output><Button variant="ghost" size="icon" aria-label="More to let go" disabled={letCount >= count} onClick={() => setLetCount(n => clampCount(n + 1, count))}><Plus size={16} /></Button><Button variant="outline" onClick={() => setAsking(true)}>LET GO</Button><Button variant="ghost" onClick={() => setLetting(false)}>CANCEL</Button></div>)}
    {msg && <p className="font-fell italic drop-detail-msg">{msg}</p>}
  </div>;
}
