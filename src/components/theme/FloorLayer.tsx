import { memo } from 'react';
import { patternUri } from '@/lib/theme/patterns';
import type { StyleKey } from '@/lib/theme/svgSources';
import type { Dimension } from '@/lib/theme/tokens';

type Props = { cols: number; rows: number; size: number; styleKey: StyleKey; dimension: Dimension };

export default memo(function FloorLayer({ cols, rows, size, styleKey, dimension }: Props) {
  return <div aria-hidden="true" style={{ width: cols * size, height: rows * size, backgroundImage: patternUri('floor', styleKey, dimension), backgroundSize: `${size}px ${size}px`, backgroundRepeat: 'repeat', imageRendering: 'pixelated', pointerEvents: 'none' }} />;
});