import { useEffect, useRef, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { useReducedMotion } from './theme/useReducedMotion';
import { discoveredBlock, discoveryCount } from '@/lib/worldDiscovery';
import { readWorldOverview } from '@/lib/worldOverview';
import { eraPointFor, type Place, type Terrain, type WorldPoint } from '@/lib/worldTest';
import './world-map.css';
type Props = { bits: string; player: WorldPoint; layer: 0 | 1; aura: string | null; dev: boolean; types: Terrain[]; places: Place[]; onClose: () => void };
export default function WorldMap({ bits, player, layer, aura, dev, types, places, onClose }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null), viewport = useRef<HTMLDivElement>(null);
  const [art, setArt] = useState<HTMLCanvasElement | null>(null), [error, setError] = useState(false), [reveal, setReveal] = useState(false);
  const [size] = useState(() => Math.max(600, Math.min(innerWidth, innerHeight)));
  const reduced = useReducedMotion(), point = eraPointFor(player, layer);
  useEffect(() => { let active = true; void readWorldOverview(types).then(c => { if (active) setArt(c); }).catch(() => { if (active) setError(true); }); return () => { active = false; }; }, [types]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close);
  }, [onClose]);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d'); if (!ctx || !art) return;
    const styles = getComputedStyle(document.documentElement), fog = styles.getPropertyValue('--world-map-fog').trim(), noise = styles.getPropertyValue('--auth-text').trim();
    ctx.imageSmoothingEnabled = false; ctx.drawImage(art, 0, 0);
    if (reveal) return;
    for (let y = 0; y < 100; y++) for (let x = 0; x < 100; x++) {
      const known = discoveredBlock(bits, x, y);
      const edge = known && [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dx, dy]) => x + dx >= 0 && x + dx < 100 && y + dy >= 0 && y + dy < 100 && !discoveredBlock(bits, x + dx, y + dy));
      if (known && !edge) continue;
      ctx.globalAlpha = known ? .5 : 1; ctx.fillStyle = fog; ctx.fillRect(x * 2.5, y * 2.5, 2.5, 2.5);
      ctx.globalAlpha = known ? .02 : .04; ctx.fillStyle = noise; ctx.fillRect(x * 2.5 + ((x * 7 + y * 3) % 2), y * 2.5 + ((x + y * 5) % 2), .5, .5);
    }
    ctx.globalAlpha = 1;
  }, [art, bits, reveal]);
  const visible = places.filter(p => (Number(p.layer) || 0) === 0 && (reveal || discoveredBlock(bits, Math.floor(p.x / 10), Math.floor(p.y / 10))) && (p.kind === 'town' || p.kind === 'maze_entrance' || p.kind === 'npc_home' || p.action === 'door_library' || p.action === 'merchant'));
  return <section className="world-map" role="dialog" aria-modal="true" aria-label="World map" data-game-ui="open">
    <header className="world-map-header"><div><h2 className="font-cinzel">MAP</h2><p className="font-mono">Discovered {(discoveryCount(bits) / 100).toFixed(1)}%</p></div><Button variant="ghost" size="icon" aria-label="Close map" onClick={onClose}><X size={20} /></Button></header>
    <div className="world-map-viewport" ref={viewport}>
      <TransformWrapper initialScale={1} minScale={1} maxScale={4} limitToBounds={false} initialPositionX={innerWidth / 2 - point.x / 1000 * size} initialPositionY={(innerHeight - 90) / 2 - point.y / 1000 * size} centerZoomedOut={false}>
        {({ setTransform, instance }) => <><TransformComponent wrapperClass="world-map-pan" contentClass="world-map-content"><div className="world-map-picture" style={{ width: size, height: size }}>
          <canvas ref={canvas} width={250} height={250} aria-label="Discovered world terrain" />
          {visible.map((p, i) => <span key={i} className="world-map-place font-fell" style={{ left: `${p.x / 10}%`, top: `${p.y / 10}%` }}><span>{p.kind === 'maze_entrance' ? '◇' : p.kind === 'npc_home' ? '○' : p.action === 'merchant' ? '¤' : p.action === 'door_library' ? '▥' : '⌂'}</span>{p.kind === 'maze_entrance' ? `${p.maze_level} ${p.name}` : p.name}</span>)}
          <span className={`world-map-player ${reduced ? 'is-static' : ''}`} style={{ left: `${point.x / 10}%`, top: `${point.y / 10}%`, color: aura ?? 'var(--instrument-beacon)' }} aria-label="Your position">●{layer === 1 && <span className="font-fell">underground</span>}</span>
        </div></TransformComponent><footer className="world-map-tools">{[1, 2, 4].map(z => <Button key={z} variant="outline" onClick={() => { const s = instance.state, rect = viewport.current?.getBoundingClientRect(); if (!rect) return; const k = z / s.scale; setTransform(rect.width / 2 - (rect.width / 2 - s.positionX) * k, rect.height / 2 - (rect.height / 2 - s.positionY) * k, z, reduced ? 0 : 200); }}>{z}×</Button>)}{dev && <label className="world-map-reveal font-mono"><Switch checked={reveal} onCheckedChange={setReveal} aria-label="Reveal all" />Reveal all</label>}</footer></>}
      </TransformWrapper>
      {!art && <p className="world-map-loading font-fell">{error ? 'The map could not be loaded.' : 'Loading…'}</p>}
    </div>
  </section>;
}