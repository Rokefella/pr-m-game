import { useEffect, useState } from 'react';
import { supabase } from './supabase';

/** Player skins: the Visitor and its rarer suits. Data lives in avatar_skins; all access is loose-typed. */

export type Facing = 'down' | 'up' | 'left' | 'right';
export type WalkPhase = 'stand' | 'a' | 'b';

export type SkinFrames = { down: string[]; up: string[]; right: string[] };

export type Skin = {
  skin_key: string;
  name: string;
  drop_key: string | null;
  rarity: 'start' | 'rare' | 'ultra' | string;
  source: 'start' | 'world' | 'maze' | string;
  where_note: string | null;
  blurb: string | null;
  sort_order: number;
  undyed_hex: string;
  palette: Record<string, string>;
  dye_chars: string;
  frames: SkinFrames;
  walk_rule: string;
  enabled: boolean;
  /** 'player' (or null) skins live in the wardrobe; 'npc' skins dress a named NPC. */
  kind?: string | null;
  npc_key?: string | null;
};

export const START_SKIN = 'visitor';

/** 'default', null and '' all mean the starting Visitor suit. */
export const normalizeSkinKey = (key: string | null | undefined) => !key || key === 'default' ? START_SKIN : key;

/** A skin drop's drop_key ('skin_scout') maps to the skin key ('scout'). */
export const skinForDrop = (dropKey: string | null | undefined) => dropKey && dropKey.startsWith('skin_') ? dropKey.slice(5) : null;

// ---------- loading (cached in memory) ----------

let cache: Skin[] | null = null;
let pending: Promise<Skin[]> | null = null;

export function loadSkins(): Promise<Skin[]> {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    try {
      const query = (supabase as unknown as { from: (t: string) => any }).from('avatar_skins')
        .select('*').eq('enabled', true).order('sort_order');
      if (!query || typeof query.then !== 'function') return Promise.resolve(cache ?? []);
      pending = query
        .then(({ data, error }: { data: unknown; error: unknown }) => {
          if (error || !Array.isArray(data)) { pending = null; return cache ?? []; }
          cache = data as Skin[];
          return cache;
        })
        .catch(() => { pending = null; return cache ?? []; });
    } catch { return Promise.resolve(cache ?? []); }
  }
  return pending;
}

/** Test hook: pretend the catalogue loaded. */
export function _primeSkins(skins: Skin[] | null) { cache = skins; pending = null; }

export function useSkins(): Skin[] {
  const [skins, setSkins] = useState<Skin[]>(cache ?? []);
  useEffect(() => {
    let off = false;
    void loadSkins().then(s => { if (!off) setSkins(s); });
    return () => { off = true; };
  }, []);
  return skins;
}

// ---------- equipped skin store (updated by orb events and page loads) ----------

let currentSkin: string | null = null;
export const setCurrentSkin = (key: string | null | undefined) => { currentSkin = normalizeSkinKey(key); };
export const getCurrentSkin = () => currentSkin;

// ---------- colours ----------

const HEX = /^#[0-9a-f]{6}$/i;

export function shade(hex: string, t: number): string {
  const n = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const to = t < 0 ? 0 : 255, a = Math.abs(t);
  return '#' + n.map(c => Math.round(c + (to - c) * a).toString(16).padStart(2, '0')).join('');
}

export type SkinTone = { auraColor?: string | null; orbDye?: string | null; registrationNumber?: number | null };

/** Dye base: an active dye colours the suit; registration 1 is red; otherwise the skin's own undyed colour. */
export function skinBaseColor(skin: Skin, tone: SkinTone): { base: string; dyed: boolean; prism: boolean } {
  if (tone.orbDye) {
    const base = tone.auraColor && HEX.test(tone.auraColor) ? tone.auraColor.toLowerCase() : skin.undyed_hex;
    return { base, dyed: true, prism: tone.orbDye === 'dye_prism' };
  }
  if (tone.registrationNumber === 1) return { base: '#d93a3a', dyed: false, prism: false };
  return { base: skin.undyed_hex, dyed: false, prism: false };
}

/** Dye-character ramp from a base colour: D dark, M base, L/H/S progressively lighter. */
export function dyeRamp(base: string): Record<string, string> {
  return { D: shade(base, -0.35), M: base, L: shade(base, 0.30), H: shade(base, 0.55), S: shade(base, 0.80) };
}

/** char → hex for every drawable character; dye chars come from the ramp, palette chars are fixed. */
export function resolveColors(skin: Skin, base: string): Record<string, string> {
  const colors: Record<string, string> = {};
  for (const [ch, hex] of Object.entries(skin.palette ?? {})) if (HEX.test(hex)) colors[ch] = hex.toLowerCase();
  const ramp = dyeRamp(base);
  for (const ch of skin.dye_chars ?? '') if (ramp[ch]) colors[ch] = ramp[ch];
  return colors;
}

// ---------- frame derivation (walk_rule 'lift_boot_v1') ----------

const setChar = (row: string, col: number, ch: string) => row.slice(0, col) + ch + row.slice(col + 1);

/** Down/up walk: within the given columns, row 12 takes row 13's non-'.' chars and row 13 is cleared there. */
export function liftBoot(rows: string[], from: number, to: number): string[] {
  const out = rows.slice();
  let r12 = out[12] ?? '', r13 = out[13] ?? '';
  for (let c = from; c <= to; c++) {
    const ch = r13[c] ?? '.';
    if (ch !== '.') r12 = setChar(r12, c, ch);
    r13 = setChar(r13, c, '.');
  }
  out[12] = r12; out[13] = r13;
  return out;
}

/** Side walk: rows 12–13 mirrored within the span of their non-'.' columns (other foot forward). */
export function mirrorLegs(rows: string[]): string[] {
  const r12 = rows[12] ?? '', r13 = rows[13] ?? '';
  let min = Infinity, max = -Infinity;
  for (let c = 0; c < 16; c++) {
    if ((r12[c] ?? '.') !== '.' || (r13[c] ?? '.') !== '.') { if (c < min) min = c; if (c > max) max = c; }
  }
  if (max < 0) return rows.slice();
  const out = rows.slice();
  let n12 = r12, n13 = r13;
  for (let c = min; c <= max; c++) {
    n12 = setChar(n12, c, r12[min + max - c] ?? '.');
    n13 = setChar(n13, c, r13[min + max - c] ?? '.');
  }
  out[12] = n12; out[13] = n13;
  return out;
}

/** Horizontal mirror of a whole frame (left = mirrored right). */
export const mirrorFrame = (rows: string[]) => rows.map(r => r.split('').reverse().join(''));

/** The 14-row frame for a facing and walk phase. Idle is the stand frame. */
export function frameFor(skin: Skin, facing: Facing, phase: WalkPhase): string[] {
  const base = skin.frames[facing === 'left' ? 'right' : facing] ?? skin.frames.down;
  let rows: string[];
  if (facing === 'down' || facing === 'up') {
    rows = phase === 'a' ? liftBoot(base, 0, 7) : phase === 'b' ? liftBoot(base, 8, 15) : base.slice();
  } else {
    rows = phase === 'a' ? mirrorLegs(base) : base.slice();
  }
  return facing === 'left' ? mirrorFrame(rows) : rows;
}

// ---------- SVG rendering ----------

export type SkinSvgOptions = { silhouette?: boolean; glow?: string | null };

/** One path per colour, merging same-colour runs per row; dye pixels are grouped for the prism hue cycle. */
export function skinSvg(rows: string[], colors: Record<string, string>, dyeChars: string, opts: SkinSvgOptions = {}): string {
  const fixed: Record<string, string[]> = {};
  const dye: Record<string, string[]> = {};
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y] ?? '';
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.') { x++; continue; }
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      const rect = `M${x},${y}h${end - x}v1h-${end - x}z`;
      const bucket = !opts.silhouette && dyeChars.includes(ch) ? dye : fixed;
      (bucket[ch] ??= []).push(rect);
      x = end;
    }
  }
  let body = '';
  for (const [ch, parts] of Object.entries(fixed)) body += `<path d="${parts.join('')}" fill="${opts.silhouette ? '#1a1e3a' : colors[ch] ?? '#1a1e3a'}"/>`;
  let dyeBody = '';
  for (const [ch, parts] of Object.entries(dye)) dyeBody += `<path d="${parts.join('')}" fill="${colors[ch] ?? '#1a1e3a'}"/>`;
  if (dyeBody) body += `<g class="skin-dye">${dyeBody}</g>`;
  const shadow = '<ellipse cx="8" cy="13.3" rx="5" ry="1" fill="#000" opacity=".35"/>';
  const glow = opts.glow ? `<circle cx="8" cy="7" r="9" fill="${opts.glow}" opacity=".14"/>` : '';
  return glow + shadow + body;
}

// ---------- NPC skins ----------

/** Wardrobe/found-card/grant lists only player skins; a null kind counts as player. */
export const isPlayerSkin = (skin: Skin) => skin.kind == null || skin.kind === 'player';

/** The enabled NPC skin for an npc_key, or null when the row is missing/disabled (callers keep the orb). */
export function npcSkin(npcKey: string | null | undefined): Skin | null {
  if (!npcKey || !cache) return null;
  return cache.find(s => s.kind === 'npc' && s.npc_key === npcKey && s.enabled !== false) ?? null;
}

/** NPCs never take dyes: fixed palette plus the ramp from their own undyed colour. */
export const npcColors = (skin: Skin) => resolveColors(skin, skin.undyed_hex);

/** Blink: only the 'p' eye pixels close (show skin colour 'a'). */
export const blinkFrame = (rows: string[]) => rows.map(r => r.replace(/p/g, 'a'));

/** NPCs face an adjacent player (Chebyshev ≤ 1) and look down otherwise. */
export function npcFacingToward(npc: { x: number; y: number }, player: { x: number; y: number }): Facing {
  const dx = player.x - npc.x, dy = player.y - npc.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) > 1 || (dx === 0 && dy === 0)) return 'down';
  return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
}

// ---------- wardrobe privacy ----------

/** Unfound skins never reveal their name or where_note. */
export function skinPublic(skin: Skin, owned: boolean): { name: string; rarity: string } {
  return owned ? { name: skin.name, rarity: skin.rarity } : { name: 'Not yet found', rarity: '' };
}
