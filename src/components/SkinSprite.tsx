import { memo, useEffect, useId, useState } from 'react';
import { blinkFrame, frameFor, glowRows, skinSvg, type Facing, type Skin, type WalkPhase } from '@/lib/skins';

const CSS = `
@keyframes skinPrism { from { filter: hue-rotate(0deg); } to { filter: hue-rotate(360deg); } }
.skin-prism .skin-dye { animation: skinPrism 6s linear infinite; }
@keyframes skinGlow { 0%, 100% { opacity: .45; } 50% { opacity: .75; } }
.skin-glow { animation: skinGlow 3s ease-in-out infinite; }
[data-night="true"] .skin-glow { mix-blend-mode: screen; filter: brightness(1.5); }
@media (prefers-reduced-motion: reduce) { .skin-prism .skin-dye, .skin-glow { animation: none !important; } }
`;

type Props = {
  skin: Skin;
  facing?: Facing;
  phase?: WalkPhase;
  size?: number;
  /** Resolved dye ramp base colour. */
  base?: string;
  /** Dye-character colours keyed by char (from resolveColors). */
  colors: Record<string, string>;
  prism?: boolean;
  /** Faint glow in the dye colour; pass null for undyed. */
  glow?: string | null;
  silhouette?: boolean;
  /** Eyes closed this frame (down-facing 'p' pixels show skin colour 'a'). */
  blink?: boolean;
};

/** Pixel-crisp skin sprite: one SVG path per colour, 16×14 viewBox. */
function SkinSprite({ skin, facing = 'down', phase = 'stand', size = 48, colors, prism = false, glow = null, silhouette = false, blink = false }: Props) {
  const base = frameFor(skin, facing, phase);
  const rows = blink && facing === 'down' ? blinkFrame(base) : base;
  const inner = skinSvg(rows, colors, skin.dye_chars ?? '', { silhouette, glow });
  const filterId = `skin-glow-${useId().replace(/:/g, '')}`;
  const luminous = !silhouette && skin.glow_chars ? skinSvg(glowRows(rows, skin.glow_chars), colors, skin.dye_chars ?? '').replace(/<ellipse[^>]*\/>/, '') : '';
  return (
    <svg viewBox="0 0 16 14" width={size} height={Math.round(size * 14 / 16)} shapeRendering="crispEdges"
      className={prism && !silhouette ? 'skin-prism' : undefined}
      style={{ display: 'block', overflow: 'visible', pointerEvents: 'none', imageRendering: 'pixelated' }} aria-hidden="true">
      <style>{CSS}</style>
      {luminous && <><defs><filter id={filterId} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="1.2" /><feComponentTransfer><feFuncA type="linear" slope={Math.max(0, skin.glow_strength ?? 1)} /></feComponentTransfer></filter></defs><g className="skin-glow" filter={`url(#${filterId})`} dangerouslySetInnerHTML={{ __html: luminous }} /></>}
      <g dangerouslySetInnerHTML={{ __html: inner }} />
    </svg>
  );
}

export default memo(SkinSprite);

/** Slowly turns through the four facings; static with reduced motion. */
export function TurningSkinSprite({ skin, colors, size = 96, glow = null, prism = false }: { skin: Skin; colors: Record<string, string>; size?: number; glow?: string | null; prism?: boolean }) {
  const [turn, setTurn] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => setTurn(t => t + 1), 900);
    return () => clearInterval(timer);
  }, []);
  const facings: Facing[] = ['down', 'right', 'up', 'left'];
  return <SkinSprite skin={skin} facing={facings[turn % 4]} size={size} colors={colors} glow={glow} prism={prism} />;
}

/** NPC idle life: a blink every 3–6 s (random per mount) and now and then a 1 px bob. Static with reduced motion. */
export function NpcSkinSprite({ skin, facing = 'down', phase = 'stand', size = 48, colors }: { skin: Skin; facing?: Facing; phase?: WalkPhase; size?: number; colors: Record<string, string> }) {
  const [blink, setBlink] = useState(false);
  const [bob, setBob] = useState(false);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let off = false, t1 = 0, t2 = 0;
    const cycle = () => {
      t1 = window.setTimeout(() => {
        if (off) return;
        setBlink(true);
        if (Math.random() < 0.35) setBob(true);
        t2 = window.setTimeout(() => { if (!off) { setBlink(false); setBob(false); } cycle(); }, 150);
      }, 3000 + Math.random() * 3000);
    };
    cycle();
    return () => { off = true; window.clearTimeout(t1); window.clearTimeout(t2); };
  }, []);
  return (
    <span style={{ display: 'inline-block', transform: bob ? 'translateY(-1px)' : undefined }}>
      <SkinSprite skin={skin} facing={facing} phase={phase} size={size} colors={colors} blink={blink && phase === 'stand'} />
    </span>
  );
}
