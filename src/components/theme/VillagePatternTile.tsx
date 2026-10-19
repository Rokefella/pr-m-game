import { memo } from 'react';
import { patternUri } from '@/lib/theme/patterns';
import { VILLAGE_GLOW } from '@/lib/theme/tokens';

type Props = { x: number; y: number; w: number; h: number; kind: 'floor' | 'street' | 'tree'; styleKey: string };
export default memo(function VillagePatternTile({ x, y, w, h, kind, styleKey }: Props) {
  return <div aria-hidden="true" style={{ position: 'absolute', left: x, top: y, width: w, height: h, backgroundImage: patternUri(kind, styleKey, VILLAGE_GLOW), backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', imageRendering: 'pixelated', pointerEvents: 'none', zIndex: kind === 'tree' ? 3 : 2 }} />;
});