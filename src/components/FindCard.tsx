import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { claimFind, findButton, findReceipt, type WorldFind } from '@/lib/worldFinds';
import { isPlayerSkin, skinForDrop, useSkins } from '@/lib/skins';
import { publishOrb } from '@/lib/orb';
import SkinCard from '@/components/SkinCard';
import type { WorldPoint } from '@/lib/worldTest';

type Props = {
  find: WorldFind; reading: boolean; at: () => WorldPoint;
  onClaimed: (id: string) => void; onRewarded?: () => void; onClose?: () => void;
  auraColor?: string | null; orbDye?: string | null; registrationNumber?: number | null;
};

/** Small find card; the server decides every grant. Skin finds open the wardrobe card instead. */
export default function FindCard({ find, reading, at, onClaimed, onRewarded, onClose, auraColor, orbDye, registrationNumber }: Props) {
  const skins = useSkins();
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState<string | null>(reading ? find.text ?? '' : null);
  const [receipt, setReceipt] = useState('');
  const [note, setNote] = useState('');
  const [skinFound, setSkinFound] = useState<{ description: string | null } | null>(null);
  const skinKey = skinForDrop(find.drop_key);
  const skin = skinKey ? skins.find(s => s.skin_key === skinKey) : undefined;

  const press = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await claimFind(find.id, at());
      if (r.granted) {
        onClaimed(find.id); onRewarded?.();
        if (skin) { setSkinFound({ description: r.text ?? find.text ?? null }); return; }
        setText(r.text ?? find.text ?? ''); setReceipt(findReceipt(r));
      }
      else if (r.reason === 'already') { setText(find.text ?? ''); onClaimed(find.id); }
      else if (r.reason === 'needs') setNote(r.needs === 'sam_coal' ? 'You have nothing to light it with.' : 'Not yet.');
      else if (r.reason === 'needs_flag') setNote('Not yet.');
      else if (r.reason === 'too_far') setNote('Too far.');
      else setNote('Nothing happens.');
    } finally { setBusy(false); }
  };

  if (skinFound && skin) {
    const wear = async () => {
      const { data, error } = await (supabase.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)('equip_skin', { p_skin: skin.skin_key });
      const res = data as { ok?: boolean; skin?: string } | null;
      if (error || !res?.ok) return;
      publishOrb({ aura_color: auraColor ?? null, orb_dye: orbDye ?? null, avatar_body: res.skin ?? skin.skin_key });
      onClose?.();
    };
    return <SkinCard skin={skin} description={skinFound.description} auraColor={auraColor} orbDye={orbDye} registrationNumber={registrationNumber} onWear={wear} onClose={() => onClose?.()} />;
  }

  return <>
    <h2 className="font-cinzel">{find.title}</h2>
    {text != null ? <p className="font-fell world-find-text">{text}</p> : <>
      {note && <p className="font-fell">{note}</p>}
      <Button className="world-jump" disabled={busy} onClick={() => void press()}>{busy ? '…' : findButton(find.kind)}</Button>
    </>}
    {receipt && <p className="font-mono world-receipt">{receipt}</p>}
  </>;
}
