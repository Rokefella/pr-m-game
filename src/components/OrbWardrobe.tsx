import { memo, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import PlayerAvatar, { orbLook, PRISM_DYE } from '@/components/PlayerAvatar';
import DropIcon from '@/components/DropIcon';
import { Button } from '@/components/ui/button';
import { dyeColor, rarityRank, type OrbChange } from '@/lib/orb';

type DyeType = { drop_key: string; name: string; rarity: string | null; effect: string | null };
type Rpc = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
const rpc = (fn: string, args: Record<string, unknown>) => (supabase.rpc as unknown as Rpc)(fn, args);
const from = (t: string) => (supabase.from as unknown as (t: string) => { select: (q: string) => { eq?: (c: string, v: string) => Promise<{ data: unknown }> } & Promise<{ data: unknown }> })(t);

interface WardrobeProps {
  auraColor: string | null;
  orbDye: string | null;
  registrationNumber: number | null;
  reloadKey: number;
  onChange: (c: OrbChange) => void;
}

/** ORB COLOUR wardrobe: DEFAULT plus every dye type; unlocked ones are selectable. */
export const OrbWardrobe = memo(function OrbWardrobe({ auraColor, orbDye, registrationNumber, reloadKey, onChange }: WardrobeProps) {
  const [dyes, setDyes] = useState<DyeType[]>([]);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [types, mine] = await Promise.all([
        from('drop_types').select('drop_key, name, rarity, effect').eq!('category', 'dye'),
        from('player_dyes').select('dye_key'),
      ]);
      if (cancelled) return;
      const list = ((types.data as DyeType[] | null) ?? []).slice()
        .sort((a, b) => rarityRank(a.rarity) - rarityRank(b.rarity) || a.name.localeCompare(b.name));
      setDyes(list);
      setOwned(new Set(((mine.data as { dye_key: string }[] | null) ?? []).map(r => r.dye_key)));
    })();
    return () => { cancelled = true; };
  }, [reloadKey]);

  const choose = async (key: string | null) => {
    if (busy) return;
    setBusy(true); setNote('');
    const { data, error } = await rpc('set_orb_dye', { p_dye_key: key });
    setBusy(false);
    const res = data as { ok?: boolean; color?: string | null; dye_key?: string | null } | null;
    if (error || !res?.ok) { setNote('The colour will not hold. Try again.'); return; }
    onChange({ aura_color: res.color ?? auraColor, orb_dye: res.dye_key ?? key });
  };

  return <div className="orb-wardrobe">
    <div className="profile-section-label font-mono"><span>ORB COLOUR</span></div>
    <div className="orb-swatch-grid">
      <button type="button" className={`orb-swatch ${!orbDye ? 'orb-swatch-active' : ''}`} aria-label="Default colour" aria-pressed={!orbDye} onClick={() => choose(null)}>
        <PlayerAvatar palette={orbLook(orbDye ? null : auraColor, null, registrationNumber)} walking={false} size={26} />
        <span className="orb-swatch-label font-mono">DEFAULT</span>
      </button>
      {dyes.map(d => {
        const color = dyeColor(d.effect);
        const unlocked = owned.has(d.drop_key);
        const look = color === 'prism' || d.drop_key === PRISM_DYE ? orbLook(null, PRISM_DYE) : orbLook(color ?? '#5a6382', 'dye');
        return <button key={d.drop_key} type="button" aria-label={unlocked ? d.name : `${d.name} (locked)`} aria-pressed={orbDye === d.drop_key}
          className={`orb-swatch ${orbDye === d.drop_key ? 'orb-swatch-active' : ''} ${unlocked ? '' : 'orb-swatch-locked'}`}
          onClick={() => unlocked ? choose(d.drop_key) : setNote(`${d.name} · ${(d.rarity ?? 'unknown').toUpperCase()}`)}>
          {unlocked ? <PlayerAvatar palette={look} walking={false} size={26} /> : <span className="orb-swatch-unknown font-mono">?</span>}
        </button>;
      })}
    </div>
    {note && <p className="font-fell italic orb-wardrobe-note">{note}</p>}
  </div>;
});

export type DetailDrop = { id: string; name: string; description: string | null; category: string | null; icon_svg: string | null; rarity?: string | null };

/** Drop detail sheet; dyes get a USE button that consumes them server-side. */
export function DropDetail({ drop, onClose, onUsed }: { drop: DetailDrop; onClose: () => void; onUsed: (msg: string, change?: OrbChange) => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const isDye = drop.category === 'dye';
  const use = async () => {
    if (busy) return;
    setBusy(true); setMsg('');
    const { data, error } = await rpc('use_dye', { p_drop_id: drop.id });
    setBusy(false);
    const res = data as { ok?: boolean; reason?: string; name?: string; color?: string; dye_key?: string } | null;
    if (!error && res?.ok) { onUsed(`${res.name ?? drop.name} unlocked. Your orb changes.`, { aura_color: res.color ?? null, orb_dye: res.dye_key ?? null }); return; }
    if (res?.reason === 'already_unlocked') setMsg('You already own this colour. Keep it to sell later.');
    else setMsg('No signal. Try again.');
  };
  return <div className="drop-detail" role="dialog" aria-label={drop.name}>
    <button type="button" className="drop-detail-close font-mono" aria-label="Close" onClick={onClose}>×</button>
    <DropIcon svg={drop.icon_svg} category={drop.category} size={64} />
    <div className="font-cinzel drop-detail-name">{drop.name}</div>
    {drop.rarity && <span className="drop-rarity-chip font-mono">{drop.rarity.toUpperCase()}</span>}
    <p className="font-fell italic drop-detail-desc">{drop.description ?? 'Its purpose is not yet clear.'}</p>
    {isDye
      ? <Button type="button" className="console-primary font-cinzel drop-detail-use" disabled={busy} onClick={use}>USE</Button>
      : <p className="font-fell italic drop-detail-msg">Not usable yet.</p>}
    {msg && <p className="font-fell italic drop-detail-msg">{msg}</p>}
  </div>;
}
