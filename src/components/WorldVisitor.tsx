import { useEffect, useRef, useState } from 'react';
import SkinSprite from './SkinSprite';
import LegacyOrb, { orbLook } from './LegacyOrb';
import { resolveColors, skinBaseColor, useSkins, type WalkPhase } from '@/lib/skins';
import { playerAppearance, type WorldPlayer } from '@/lib/worldPlayers';
import { WORLD_TILE, type WorldPoint } from '@/lib/worldTest';
import WorldPlayerLabel from './WorldPlayerLabel';
export default function WorldVisitor({ player, at, camera, reduced }: { player: WorldPlayer; at: WorldPoint; camera: { current: WorldPoint }; reduced: boolean }) {
  const skins = useSkins(), el = useRef<HTMLDivElement>(null), previous = useRef(player);
  const [walking, setWalking] = useState(false), [phase, setPhase] = useState<WalkPhase>('stand');
  const appearance = playerAppearance(player, at), skin = skins.find(s => s.skin_key === appearance.skin && s.kind !== 'npc');
  useEffect(() => {
    const from = previous.current; previous.current = player;
    const moved = from.x !== player.x || from.y !== player.y;
    setWalking(moved);
    let frame = 0; const started = performance.now();
    const tick = (now: number) => {
      const t = reduced ? 1 : Math.min(1, (now - started) / 500);
      const x = from.x + (player.x - from.x) * t, y = from.y + (player.y - from.y) * t;
      if (el.current) { el.current.style.transform = `translate(${(x + .5) * WORLD_TILE - camera.current.x - 18}px, ${(y + 1) * WORLD_TILE - camera.current.y - 32}px)`; el.current.style.zIndex = String(Math.round((y + 1) * WORLD_TILE)); }
      if (moved && t < 1) setPhase(Math.floor(now / 180) % 2 ? 'a' : 'b'); else { setWalking(false); setPhase('stand'); }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  }, [player, camera, reduced]);
  const tone = skin ? skinBaseColor(skin, appearance) : null;
  return <div ref={el} className="world-avatar world-visitor" aria-label={player.username || 'Visitor'}>
    {appearance.near ? <>{skin && tone ? <SkinSprite skin={skin} facing={appearance.facing} phase={reduced ? 'stand' : phase} size={36} colors={resolveColors(skin, tone.base)} glow={tone.dyed ? tone.base : null} prism={tone.prism} /> : <LegacyOrb size={36} palette={orbLook(player.aura_color, player.orb_dye)} walking={walking} />}<WorldPlayerLabel username={player.username} title={player.title} /></> : <span className="world-visitor-dot">•</span>}
  </div>;
}