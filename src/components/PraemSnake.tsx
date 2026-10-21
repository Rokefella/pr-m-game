import { memo } from 'react';

/** Ten segments, centre outward, tail ending at the bottom right. */
export const SNAKE_SEGMENTS = [[4, 4, 3, 1], [6, 4, 1, 3], [2, 6, 5, 1], [2, 2, 1, 5], [2, 2, 7, 1], [8, 2, 1, 7], [0, 8, 9, 1], [0, 0, 1, 9], [0, 0, 11, 1], [10, 0, 1, 11]] as const;
export const SNAKE_TAIL = [10, 10] as const;

type Props = { size?: number; animate?: boolean; glowTail?: boolean; loop?: boolean };

/** In-game PRÆM logo. Animation is CSS-only and disabled under reduced motion. */
const PraemSnake = memo(({ size = 72, animate = false, glowTail = true, loop = false }: Props) => {
  const mode = animate ? (loop ? ' snake-loop' : ' snake-draw') : '';
  const tailDelay = `${(SNAKE_SEGMENTS.length - 1) * 0.18 + 0.16}s`;
  return (
    <svg className={`praem-snake${mode}`} viewBox="-1 -1 13 13" width={size} height={size} shapeRendering="crispEdges" role="img" aria-label="PRÆM" style={{ overflow: 'visible' }}>
      {glowTail && <circle className="snake-glow" cx={SNAKE_TAIL[0] + 0.5} cy={SNAKE_TAIL[1] + 0.5} r={1.5} style={animate ? { animationDelay: tailDelay } : undefined} />}
      {SNAKE_SEGMENTS.map(([x, y, w, h], i) => (
        <rect key={i} className="snake-seg" x={x} y={y} width={w} height={h} style={animate ? { animationDelay: `${i * 0.18}s` } : undefined} />
      ))}
      <rect className="snake-centre" x={4} y={4} width={1} height={1} />
      <rect className="snake-tail" x={SNAKE_TAIL[0]} y={SNAKE_TAIL[1]} width={1} height={1} style={animate ? { animationDelay: `${(SNAKE_SEGMENTS.length - 1) * 0.18}s` } : undefined} />
    </svg>
  );
});
PraemSnake.displayName = 'PraemSnake';
export default PraemSnake;
