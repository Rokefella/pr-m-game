import { memo } from 'react';
import { patternUri, patternViewBox } from '@/lib/theme/patterns';
import { VILLAGE_GLOW } from '@/lib/theme/tokens';

type Props = { x: number; y: number; w: number; h: number; kind: 'floor' | 'street' | 'tree'; styleKey: string; tint?: string };
/** Large (96px) sources tile at twice the cell size, aligned to world coordinates so neighbouring cells form one plate. */
export default memo(function VillagePatternTile({ x, y, w, h, kind, styleKey, tint }: Props) {
  const large = patternViewBox(kind, styleKey) === 96;
  const span = w * 2;
  return <div aria-hidden="true" style={{ position: 'absolute', left: x, top: y, width: w, height: h, backgroundImage: patternUri(kind, styleKey, VILLAGE_GLOW, tint), backgroundSize: large ? `${span}px ${span}px` : '100% 100%', backgroundPosition: large ? `${-(((x % span) + span) % span)}px ${-(((y % span) + span) % span)}px` : undefined, backgroundRepeat: large ? 'repeat' : 'no-repeat', imageRendering: 'pixelated', pointerEvents: 'none', zIndex: kind === 'tree' ? 3 : 2 }} />;
});
