import { memo } from 'react';

export function orbName(name?: string | null) {
  const value = name?.trim() ?? '';
  const characters = Array.from(value);
  return characters.length > 14 ? characters.slice(0, 14).join('') + '…' : value;
}

export default memo(function OrbLabels({ title, name, size }: { title?: string | null; name?: string | null; size: number }) {
  const shownTitle = title?.trim();
  const shownName = orbName(name);
  return <>
    {shownTitle && <span className="orb-label orb-label-title font-fell italic" title={shownTitle} style={{ left: size / 2, top: size * 20 / 92 - 6 }}>{shownTitle}</span>}
    {shownName && <span className="orb-label orb-label-name font-cinzel" title={name?.trim()} style={{ left: size / 2, top: size * 78 / 92 + 4 }}>{shownName}</span>}
  </>;
});