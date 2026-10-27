import { memo, useEffect, useState } from 'react';
import LegacyOrb, { orbLook, paletteFromColor, paletteFromHex, PRISM_DYE, type AvatarPalette, type OrbLook } from './LegacyOrb';
import SkinSprite from './SkinSprite';
import { getCurrentSkin, normalizeSkinKey, resolveColors, skinBaseColor, useSkins, type Facing, type WalkPhase } from '@/lib/skins';
import { ORB_EVENT, type OrbChange } from '@/lib/orb';

export { orbLook, paletteFromColor, paletteFromHex, PRISM_DYE };
export type { AvatarPalette, OrbLook };

interface Props {
  palette: OrbLook;
  walking: boolean;
  size?: number;
  /** Equipped skin key; undefined falls back to the module store, null/'default' mean the Visitor. */
  skin?: string | null;
  facing?: Facing;
  registrationNumber?: number | null;
  auraColor?: string | null;
  orbDye?: string | null;
}

/** The player: a suited figure from the skin catalogue, falling back to the legacy orb without one. */
function PlayerAvatar({ palette, walking, size = 30, skin, facing = 'down', registrationNumber, auraColor, orbDye }: Props) {
  const skins = useSkins();
  const [body, setBody] = useState<string | null>(normalizeSkinKey(skin ?? getCurrentSkin()));
  useEffect(() => { if (skin !== undefined) setBody(normalizeSkinKey(skin)); }, [skin]);
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<OrbChange>).detail;
      if (d && 'avatar_body' in d) setBody(normalizeSkinKey(d.avatar_body));
    };
    window.addEventListener(ORB_EVENT, on);
    return () => window.removeEventListener(ORB_EVENT, on);
  }, []);

  const [phase, setPhase] = useState<WalkPhase>('stand');
  useEffect(() => {
    if (!walking || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setPhase('stand'); return; }
    setPhase('a');
    const timer = setInterval(() => setPhase(p => (p === 'a' ? 'b' : 'a')), 180);
    return () => clearInterval(timer);
  }, [walking]);

  const row = skins.find(s => s.skin_key === normalizeSkinKey(body));
  if (!row) return <LegacyOrb palette={palette} walking={walking} size={size} />;

  // Explicit tone props win; otherwise derive the dye from the palette prop.
  const tone = auraColor !== undefined || orbDye !== undefined || registrationNumber !== undefined
    ? { auraColor, orbDye, registrationNumber }
    : typeof palette === 'string'
      ? { registrationNumber: palette === 'red' ? 1 : null }
      : { auraColor: palette.hex, orbDye: palette.prism ? PRISM_DYE : 'dye' };
  const { base, dyed, prism } = skinBaseColor(row, tone);
  return <SkinSprite skin={row} facing={facing} phase={phase} size={size} colors={resolveColors(row, base)} prism={prism} glow={dyed ? base : null} />;
}

export default memo(PlayerAvatar);
