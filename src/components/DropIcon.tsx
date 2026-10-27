import { memo } from 'react';
import SkinSprite from '@/components/SkinSprite';
import { resolveColors, skinForDrop, useSkins } from '@/lib/skins';

export function isSafeIconSvg(svg?: string | null): svg is string {
  if (!svg) return false;
  const s = svg.trim();
  if (!s.toLowerCase().startsWith('<svg')) return false;
  const lower = s.toLowerCase();
  if (lower.includes('<script') || lower.includes('<foreignobject') || lower.includes('javascript:')) return false;
  if (/[\s/"']on[a-z]+\s*=/i.test(s)) return false;
  return true;
}

function GenericKey({ size }: { size: number }) {
  return <svg aria-hidden="true" viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges"><path fill="currentColor" fillRule="evenodd" d="M1 4h6v6H1V4Zm2 2v2h2V6H3Zm4 0h8v2h-2v3h-2V8H7V6Z" /></svg>;
}
function GenericCrate({ size }: { size: number }) {
  return <svg aria-hidden="true" viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges">
    <rect x="2" y="3" width="12" height="11" fill="#4a3a26" stroke="#8e99d0" strokeWidth="1" />
    <path d="M2 7h12v1H2zM7 3h2v11H7z" fill="#2f2418" />
  </svg>;
}

/** Skin drops draw their suit sprite (undyed) instead of an icon. */
function SkinDropIcon({ dropKey, size }: { dropKey: string; size: number }) {
  const skins = useSkins();
  const key = skinForDrop(dropKey);
  const skin = key ? skins.find(s => s.skin_key === key) : undefined;
  if (!skin) return <GenericCrate size={size} />;
  return <SkinSprite skin={skin} size={size} colors={resolveColors(skin, skin.undyed_hex)} />;
}

type Props = { svg?: string | null; category?: string | null; size: number; drop_key?: string };
export default memo(function DropIcon({ svg, category, size, drop_key }: Props) {
  if (category === 'skin' && drop_key) return <SkinDropIcon dropKey={drop_key} size={size} />;
  if (isSafeIconSvg(svg)) {
    return <img src={'data:image/svg+xml;utf8,' + encodeURIComponent(svg.trim())} width={size} height={size} style={{ imageRendering: 'pixelated' }} alt="" />;
  }
  return category === 'key' ? <GenericKey size={size} /> : <GenericCrate size={size} />;
});
