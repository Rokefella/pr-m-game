import { useEffect } from 'react';
import { setCurrentSkin } from './skins';

/** Broadcast when the player's dye or skin changes so every mounted avatar updates immediately. */
export const ORB_EVENT = 'praem:orb-changed';
export type OrbChange = { aura_color: string | null; orb_dye: string | null; avatar_body?: string | null };

export function publishOrb(change: OrbChange) {
  if ('avatar_body' in change) setCurrentSkin(change.avatar_body);
  window.dispatchEvent(new CustomEvent<OrbChange>(ORB_EVENT, { detail: change }));
}

export function useOrbSync(setAura: (c: string) => void, setDye: (d: string | null) => void, setBody?: (b: string | null) => void) {
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<OrbChange>).detail;
      if (d.aura_color) setAura(d.aura_color);
      setDye(d.orb_dye);
      if (setBody && 'avatar_body' in d) setBody(d.avatar_body ?? null);
    };
    window.addEventListener(ORB_EVENT, on);
    return () => window.removeEventListener(ORB_EVENT, on);
  }, [setAura, setDye, setBody]);
}

export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'ultra', 'legendary'];
export const rarityRank = (r: string | null | undefined) => { const i = RARITY_ORDER.indexOf((r ?? '').toLowerCase()); return i < 0 ? 99 : i; };

/** 'color:#rrggbb' → hex; 'color:prism'/'color:rainbow' → 'prism'; else null. */
export function dyeColor(effect: string | null | undefined): string | null {
  const m = /^color:(.+)$/i.exec(effect ?? '');
  if (!m) return null;
  const v = m[1].trim().toLowerCase();
  if (v === 'prism' || v === 'rainbow') return 'prism';
  return /^#[0-9a-f]{6}$/.test(v) ? v : null;
}
