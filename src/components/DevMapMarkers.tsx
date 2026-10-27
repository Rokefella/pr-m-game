import { useState } from 'react';
import { Button } from './ui/button';
import type { DevMapMarker } from '@/lib/devWorldMap';

export default function DevMapMarkers({ markers }: { markers: DevMapMarker[] }) {
  const [selected, setSelected] = useState<DevMapMarker | null>(null);
  return <>
    {markers.map(m => <Button key={m.id} variant="ghost" className={`world-map-dev-marker world-map-dev-${m.tone} font-mono`} style={{ left: `${m.at.x / 10}%`, top: `${m.at.y / 10}%` }} aria-label={`${m.name} at ${m.x},${m.y}`} onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setSelected(m); }}><span>{m.symbol}</span><small>{m.name}</small></Button>)}
    {selected && <div className="world-map-marker-detail font-mono" role="status"><strong>{selected.name}</strong><span>{selected.x},{selected.y}</span><Button variant="ghost" size="icon" aria-label="Close marker details" onClick={() => setSelected(null)}>×</Button></div>}
  </>;
}