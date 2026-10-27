import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui/button';
import type { DevMapMarker } from '@/lib/devWorldMap';

export default function DevMapMarkers({ markers }: { markers: DevMapMarker[] }) {
  const [selected, setSelected] = useState<DevMapMarker | null>(null);
  const groups = new Map<string, DevMapMarker[]>();
  for (const marker of markers) {
    const key = `${marker.at.x},${marker.at.y}`;
    groups.set(key, [...(groups.get(key) ?? []), marker]);
  }
  return <>
    {markers.map(m => {
      const group = groups.get(`${m.at.x},${m.at.y}`) ?? [m];
      const offset = (group.indexOf(m) - (group.length - 1) / 2) * 28;
      return <Button key={m.id} variant="ghost" className={`world-map-dev-marker world-map-dev-${m.tone} font-mono`} style={{ left: `calc(${m.at.x / 10}% + ${offset}px)`, top: `${m.at.y / 10}%` }} aria-label={`${m.name} at ${m.x},${m.y}`} onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setSelected(m); }}><span>{m.symbol}</span><small>{m.name}</small></Button>;
    })}
    {selected && createPortal(<div className="world-map-marker-detail font-mono" role="status"><strong>{selected.name}</strong><span>{selected.x},{selected.y}</span><Button variant="ghost" size="icon" aria-label="Close marker details" onClick={() => setSelected(null)}>×</Button></div>, document.body)}
  </>;
}