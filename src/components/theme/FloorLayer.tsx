import { memo } from 'react';
import { patternUri, patternViewBox } from '@/lib/theme/patterns';
import type { FloorStyleKey } from '@/lib/theme/svgSources';
import type { Dimension } from '@/lib/theme/tokens';

type Props = { cols: number; rows: number; size: number; styleKey: FloorStyleKey; dimension?: Dimension; glow?: string };

export default memo(function FloorLayer({ cols, rows, size, styleKey, dimension = 'amber', glow }: Props) {
  return <div aria-hidden="true" style={{ width: cols * size, height: rows * size, backgroundImage: patternUri('floor', styleKey, glow ?? dimension), backgroundSize: `${size * patternViewBox('floor', styleKey) / 48}px`, backgroundRepeat: 'repeat', imageRendering: 'pixelated', pointerEvents: 'none' }} />;
});