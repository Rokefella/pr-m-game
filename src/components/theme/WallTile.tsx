import { memo } from 'react';
import { patternUri } from '@/lib/theme/patterns';
import type { StyleKey } from '@/lib/theme/svgSources';
import type { Dimension } from '@/lib/theme/tokens';

type Props = { styleKey: StyleKey; dimension: Dimension; size: number };

export default memo(function WallTile({ styleKey, dimension, size }: Props) {
  return <div aria-hidden="true" style={{ width: size, height: size, backgroundImage: patternUri('wall', styleKey, dimension), backgroundSize: `${size}px ${size}px`, imageRendering: 'pixelated', pointerEvents: 'none' }} />;
});