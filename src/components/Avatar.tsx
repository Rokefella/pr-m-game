// src/components/Avatar.tsx

// Single source of truth for rendering the player avatar everywhere.

// Pure presentational: it does NOT fetch data. The parent passes config as props.

// Two views: 'topdown' (village / maze / shadow) and 'front' (profile / fragment capture).

export type AvatarView = "topdown" | "front";

export interface AvatarProps {
  hat?: string;   // 'none' | 'classic' | 'cap' | 'crown' | 'hood' | 'halo'
  body?: string;  // 'default' | 'robe' | 'armour' | 'cloak' | 'coat' | 'suit'
  head?: string;  // 'default' | 'visor' | 'mask' | 'helm' | 'orb' | 'square'
  auraColor?: string; // any 6-digit hex, e.g. '#5b4fd4' — shades are derived
  view?: AvatarView;
  size?: number;  // px width; height derives to keep aspect ratio
}

function normHex(h: string): string {
  if (!h || h[0] !== "#" || h.length !== 7) return "#5b4fd4";
  return h;
}

function hxv(h: string): number[] {
  h = normHex(h).replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function mix(hex: string, t: number): string {
  const c = hxv(hex);
  const to = t < 0 ? 0 : 255;
  const a = Math.abs(t);
  return "rgb(" + Math.round(c[0] + (to - c[0]) * a) + "," + Math.round(c[1] + (to - c[1]) * a) + "," + Math.round(c[2] + (to - c[2]) * a) + ")";
}

const light = (h: string) => mix(h, 0.35);
const dark = (h: string) => mix(h, -0.4);
const deep = (h: string) => mix(h, -0.6);

function topSVG(a: string, hat: string, body: string, head: string): string {
  let s = "";
  let sw = 30, sh = 20;
  if (body === "robe") { sw = 33; sh = 23; }
  if (body === "cloak") s += '<ellipse cx="60" cy="82" rx="34" ry="16" fill="' + dark(a) + '" opacity="0.55"/>';
  if (body === "armour") s += '<rect x="30" y="64" width="14" height="14" rx="3" fill="' + light(a) + '" opacity="0.6"/><rect x="76" y="64" width="14" height="14" rx="3" fill="' + light(a) + '" opacity="0.6"/>';
  s += '<ellipse cx="60" cy="76" rx="' + sw + '" ry="' + sh + '" fill="' + a + '" opacity="0.5"/>';
  s += '<circle cx="60" cy="56" r="22" fill="' + a + '"/>';
  s += '<circle cx="60" cy="56" r="22" fill="none" stroke="' + deep(a) + '" stroke-width="1"/>';
  s += '<circle cx="52" cy="48" r="9" fill="#ffffff" opacity="0.12"/>';
  if (hat === "none") {
    if (head === "visor") s += '<rect x="46" y="52" width="28" height="5" rx="2" fill="' + deep(a) + '"/><rect x="48" y="54" width="24" height="1.6" fill="' + light(a) + '"/>';
    if (head === "orb") s += '<circle cx="60" cy="56" r="9" fill="' + light(a) + '" opacity="0.55"/><circle cx="60" cy="56" r="4" fill="#fff" opacity="0.3"/>';
    if (head === "square") s += '<rect x="44" y="40" width="32" height="32" rx="7" fill="' + a + '"/><rect x="44" y="40" width="32" height="32" rx="7" fill="none" stroke="' + deep(a) + '" stroke-width="1"/><circle cx="52" cy="48" r="6" fill="#fff" opacity="0.12"/>';
  }
  if (hat === "classic") s += '<circle cx="60" cy="54" r="24" fill="' + dark(a) + '" opacity="0.9"/><circle cx="60" cy="54" r="13" fill="' + deep(a) + '"/>';
  else if (hat === "cap") s += '<circle cx="60" cy="55" r="20" fill="' + dark(a) + '"/><path d="M42,44 Q60,24 78,44 Q60,42 42,44 z" fill="' + dark(a) + '"/>';
  else if (hat === "crown") {
    s += '<circle cx="60" cy="55" r="19" fill="' + a + '"/>';
    for (let i = 0; i < 8; i++) {
      const ang = (-90 + i * 45) * Math.PI / 180;
      const x2 = 60 + Math.cos(ang) * 30, y2 = 55 + Math.sin(ang) * 30;
      const px = 60 + Math.cos(ang - 0.18) * 19, py = 55 + Math.sin(ang - 0.18) * 19;
      const nx = 60 + Math.cos(ang + 0.18) * 19, ny = 55 + Math.sin(ang + 0.18) * 19;
      s += '<path d="M' + px + ',' + py + ' L' + x2 + ',' + y2 + ' L' + nx + ',' + ny + ' z" fill="' + light(a) + '"/>';
    }
    s += '<circle cx="60" cy="55" r="10" fill="' + light(a) + '" opacity="0.5"/>';
  }
  else if (hat === "hood") s += '<circle cx="60" cy="61" r="29" fill="#0a0a14" opacity="0.92"/><circle cx="60" cy="52" r="18" fill="' + a + '"/><circle cx="53" cy="46" r="7" fill="#fff" opacity="0.1"/>';
  else if (hat === "halo") s += '<circle cx="60" cy="50" r="27" fill="none" stroke="' + light(a) + '" stroke-width="6" opacity="0.25"/><circle cx="60" cy="50" r="27" fill="none" stroke="' + light(a) + '" stroke-width="2.5"/>';
  return s;
}

function frontSVG(a: string, hat: string, body: string, head: string): string {
  let s = "";
  s += '<ellipse cx="60" cy="158" rx="26" ry="6" fill="#000000" opacity="0.45"/>';
  if (body === "cloak") s += '<path d="M40,74 L80,74 L94,152 L26,152 Z" fill="' + dark(a) + '" opacity="0.9"/>';
  s += '<rect x="18" y="84" width="26" height="10" rx="5" fill="' + a + '"/><circle cx="20" cy="89" r="6" fill="' + a + '"/>';
  s += '<rect x="76" y="84" width="26" height="10" rx="5" fill="' + a + '"/><circle cx="100" cy="89" r="6" fill="' + a + '"/>';
  if (body === "robe") {
    s += '<path d="M44,76 L76,76 L86,150 L34,150 Z" fill="' + a + '"/><line x1="60" y1="78" x2="60" y2="150" stroke="' + dark(a) + '" stroke-width="1.5"/>';
  } else {
    s += '<rect x="49" y="120" width="10" height="28" rx="5" fill="' + dark(a) + '"/><rect x="61" y="120" width="10" height="28" rx="5" fill="' + dark(a) + '"/>';
    const th = body === "coat" ? 58 : 52;
    s += '<rect x="42" y="72" width="36" height="' + th + '" rx="16" fill="' + a + '"/>';
    if (body === "default") s += '<rect x="53" y="90" width="14" height="18" rx="5" fill="' + deep(a) + '" opacity="0.4"/>';
    if (body === "armour") s += '<circle cx="42" cy="78" r="9" fill="' + light(a) + '"/><circle cx="78" cy="78" r="9" fill="' + light(a) + '"/><line x1="44" y1="92" x2="76" y2="92" stroke="' + deep(a) + '" stroke-width="2"/><line x1="44" y1="104" x2="76" y2="104" stroke="' + deep(a) + '" stroke-width="2"/><rect x="52" y="84" width="16" height="20" rx="3" fill="' + light(a) + '" opacity="0.5"/>';
    if (body === "coat") s += '<line x1="60" y1="74" x2="60" y2="128" stroke="' + deep(a) + '" stroke-width="1.5"/><path d="M60,74 L50,84 L60,90 Z" fill="' + dark(a) + '"/><path d="M60,74 L70,84 L60,90 Z" fill="' + dark(a) + '"/>';
    if (body === "suit") s += '<path d="M60,74 L52,92 L60,100 L68,92 Z" fill="' + light(a) + '" opacity="0.4"/><rect x="58" y="92" width="4" height="26" fill="' + deep(a) + '"/>';
  }
  if (head === "square") s += '<rect x="40" y="32" width="40" height="40" rx="11" fill="' + a + '"/><rect x="40" y="32" width="40" height="40" rx="11" fill="none" stroke="' + deep(a) + '" stroke-width="0.8"/>';
  else if (head === "orb") s += '<circle cx="60" cy="52" r="21" fill="' + a + '"/><circle cx="60" cy="52" r="14" fill="' + light(a) + '" opacity="0.45"/><circle cx="60" cy="52" r="7" fill="#fff" opacity="0.3"/>';
  else s += '<circle cx="60" cy="52" r="21" fill="' + a + '"/>';
  s += '<circle cx="52" cy="44" r="8" fill="#fff" opacity="0.12"/>';
  const showEyes = head === "default" || head === "square";
  if (head === "visor") s += '<rect x="42" y="47" width="36" height="11" rx="4" fill="' + deep(a) + '"/><rect x="44" y="51" width="32" height="2.5" rx="1" fill="' + light(a) + '"/>';
  else if (head === "mask") s += '<rect x="44" y="44" width="32" height="26" rx="11" fill="' + dark(a) + '"/><line x1="60" y1="46" x2="60" y2="68" stroke="' + deep(a) + '" stroke-width="1"/>';
  else if (head === "helm") s += '<path d="M39,52 A21,21 0 0 1 81,52 L81,46 A21,24 0 0 0 39,46 Z" fill="' + light(a) + '"/><rect x="46" y="52" width="28" height="5" rx="2" fill="' + deep(a) + '"/>';
  if (showEyes) s += '<ellipse cx="53" cy="52" rx="3.2" ry="4.4" fill="#14142a"/><ellipse cx="67" cy="52" rx="3.2" ry="4.4" fill="#14142a"/><circle cx="54" cy="50" r="1.1" fill="#fff" opacity="0.85"/><circle cx="68" cy="50" r="1.1" fill="#fff" opacity="0.85"/>';
  if (hat === "classic") s += '<ellipse cx="60" cy="33" rx="22" ry="5" fill="' + deep(a) + '"/><rect x="47" y="12" width="26" height="21" fill="' + dark(a) + '"/><rect x="47" y="11" width="26" height="4" rx="2" fill="' + dark(a) + '"/><rect x="47" y="27" width="26" height="3.5" fill="#c8943a"/>';
  else if (hat === "cap") s += '<path d="M40,52 A21,21 0 0 1 80,52 Z" fill="' + dark(a) + '"/><ellipse cx="60" cy="52" rx="22" ry="4" fill="' + dark(a) + '"/>';
  else if (hat === "crown") s += '<path d="M42,34 L48,22 L54,32 L60,19 L66,32 L72,22 L78,34 Z" fill="' + light(a) + '"/>';
  else if (hat === "hood") s += '<path d="M36,56 Q36,20 60,20 Q84,20 84,56 Q84,40 60,40 Q36,40 36,56 Z" fill="' + deep(a) + '" opacity="0.92"/>';
  else if (hat === "halo") s += '<ellipse cx="60" cy="24" rx="15" ry="4.5" fill="none" stroke="' + light(a) + '" stroke-width="3"/>';
  return s;
}

export default function Avatar({
  hat = "none",
  body = "default",
  head = "default",
  auraColor = "#5b4fd4",
  view = "topdown",
  size = 120,
}: AvatarProps) {
  const a = normHex(auraColor);
  const isTop = view === "topdown";
  const viewBox = isTop ? "0 0 120 120" : "0 0 120 170";
  const height = isTop ? size : Math.round((size * 170) / 120);
  const inner = isTop ? topSVG(a, hat, body, head) : frontSVG(a, hat, body, head);
  return (
    <svg
      viewBox={viewBox}
      width={size}
      height={height}
      role="img"
      aria-label={`avatar ${hat} ${body} ${head}`}
      style={{ pointerEvents: "none" }}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}
