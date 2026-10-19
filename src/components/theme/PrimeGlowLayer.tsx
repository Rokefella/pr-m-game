import { memo, useMemo } from 'react';
import { DIMENSION_GLOW, type Dimension } from '@/lib/theme/tokens';
import { isPrime, ulamIndex } from '@/lib/theme/ulam';

type Props = { cols: number; rows: number; size: number; dimension: Dimension; isFloor?: (col: number, row: number) => boolean };

export default memo(function PrimeGlowLayer({ cols, rows, size, dimension, isFloor }: Props) {
  const cells = useMemo(() => {
    const primes: { col: number; row: number }[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if ((!isFloor || isFloor(col, row)) && isPrime(ulamIndex(col, row, Math.max(cols, rows)))) primes.push({ col, row });
      }
    }
    return primes;
  }, [cols, rows, isFloor]);
  const glow = DIMENSION_GLOW[dimension];
  return (
    <svg aria-hidden="true" width={cols * size} height={rows * size} viewBox={`0 0 ${cols * size} ${rows * size}`} shapeRendering="crispEdges" className="absolute left-0 top-0 pointer-events-none" style={{ imageRendering: 'pixelated' }}>
      {cells.map(({ col, row }) => (
        <g key={`${col},${row}`}>
          <rect x={col * size + 3} y={row * size + 3} width={Math.max(0, size - 6)} height={Math.max(0, size - 6)} fill={glow} fillOpacity={0.08} stroke={glow} strokeWidth={1} strokeOpacity={0.22} />
          <circle cx={(col + 0.5) * size} cy={(row + 0.5) * size} r={size * 0.04} fill={glow} opacity={0.7} />
        </g>
      ))}
    </svg>
  );
});