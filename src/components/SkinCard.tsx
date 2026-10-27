import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TurningSkinSprite } from '@/components/SkinSprite';
import { resolveColors, skinBaseColor, type Skin } from '@/lib/skins';

type Props = {
  skin: Skin;
  description?: string | null;
  /** Carried maze drops cannot be worn until banked. */
  carried?: boolean;
  auraColor?: string | null;
  orbDye?: string | null;
  registrationNumber?: number | null;
  onWear?: () => Promise<void>;
  onClose: () => void;
};

/** The card shown when a skin is found: large turning sprite, name, description, WEAR IT / LATER. */
export default function SkinCard({ skin, description, carried = false, auraColor, orbDye, registrationNumber, onWear, onClose }: Props) {
  const [busy, setBusy] = useState(false);
  const tone = skinBaseColor(skin, { auraColor, orbDye, registrationNumber });
  const wear = async () => {
    if (busy || !onWear) return;
    setBusy(true);
    try { await onWear(); } finally { setBusy(false); }
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
      <TurningSkinSprite skin={skin} colors={resolveColors(skin, tone.base)} size={96} glow={tone.dyed ? tone.base : null} prism={tone.prism} />
      <h2 className="font-cinzel" style={{ margin: 0 }}>{skin.name}</h2>
      {skin.rarity && skin.rarity !== 'start' && <span className="drop-rarity-chip font-mono">{skin.rarity.toUpperCase()}</span>}
      {description && <p className="font-fell italic" style={{ whiteSpace: 'pre-line', margin: 0 }}>{description}</p>}
      {carried
        ? <p className="font-fell italic" style={{ margin: 0, color: 'var(--plate-label)' }}>Carry it out to keep it.</p>
        : onWear && <Button className="world-jump" disabled={busy} onClick={() => void wear()}>{busy ? '…' : 'WEAR IT'}</Button>}
      <Button variant="outline" className="world-jump" onClick={onClose}>LATER</Button>
    </div>
  );
}
