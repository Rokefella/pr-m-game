import { useEffect, useRef, useState } from 'react';

export type CharacterEyeSize = 'small' | 'medium' | 'large';

const SIZES: Record<CharacterEyeSize, { rx: number; ry: number; pupilR: number; maxOffset: number }> = {
  small: { rx: 16, ry: 10, pupilR: 4, maxOffset: 6 },
  medium: { rx: 24, ry: 14, pupilR: 6, maxOffset: 10 },
  large: { rx: 100, ry: 60, pupilR: 18, maxOffset: 40 },
};

interface Props {
  cx: number;
  cy: number;
  color: string;
  size: CharacterEyeSize;
  playerPosition: { x: number; y: number };
  isFixed?: boolean;
  onProximity?: (near: boolean) => void;
  proximityRadius?: number;
  zIndex?: number;
}

const CharacterEye = ({
  cx,
  cy,
  color,
  size,
  playerPosition,
  isFixed = false,
  onProximity,
  proximityRadius = 80,
  zIndex = 4,
}: Props) => {
  const dims = SIZES[size];
  const playerRef = useRef(playerPosition);
  playerRef.current = playerPosition;
  const onProxRef = useRef(onProximity);
  onProxRef.current = onProximity;

  const pupilRef = useRef({ x: 0, y: 0 });
  const [pupil, setPupil] = useState({ x: 0, y: 0 });
  const [near, setNear] = useState(false);
  const nearRef = useRef(false);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = playerRef.current;
      const dx = p.x - cx;
      const dy = p.y - cy;
      const dist = Math.hypot(dx, dy);
      let tx: number, ty: number;
      if (dist > 400) {
        // Idle circular drift: radius 3px, period 6s
        const t = Date.now() / 1000;
        const ang = (t / 6) * Math.PI * 2;
        tx = Math.cos(ang) * 3;
        ty = Math.sin(ang) * 3;
      } else if (dist < 0.001) {
        tx = 0;
        ty = 0;
      } else {
        const mag = Math.min(dist / 50, 1) * dims.maxOffset;
        tx = (dx / dist) * mag;
        ty = (dy / dist) * mag;
      }
      const cur = pupilRef.current;
      const nx = cur.x + (tx - cur.x) * 0.06;
      const ny = cur.y + (ty - cur.y) * 0.06;
      if (Math.abs(nx - cur.x) > 0.01 || Math.abs(ny - cur.y) > 0.01) {
        pupilRef.current = { x: nx, y: ny };
        setPupil({ x: nx, y: ny });
      }

      const isNear = dist <= proximityRadius;
      if (isNear !== nearRef.current) {
        nearRef.current = isNear;
        setNear(isNear);
        onProxRef.current?.(isNear);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cx, cy, dims.maxOffset, proximityRadius]);

  const w = dims.rx * 2 + 24;
  const h = dims.ry * 2 + 24;
  const ry = near ? dims.ry * 1.5 : dims.ry;
  const animName = `characterEyeGlow_${size}`;

  return (
    <>
      <style>{`
        @keyframes ${animName} {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
      `}</style>
      <svg
        width={w}
        height={h}
        style={{
          position: isFixed ? 'fixed' : 'absolute',
          left: cx - w / 2,
          top: cy - h / 2,
          pointerEvents: 'none',
          overflow: 'visible',
          zIndex,
        }}
      >
        <ellipse
          cx={w / 2}
          cy={h / 2}
          rx={dims.rx}
          ry={ry}
          stroke={color}
          strokeWidth={0.5}
          fill="none"
          style={{
            transition: 'ry 400ms ease-out',
            animation: `${animName} 3s ease-in-out infinite`,
          }}
        />
        <circle
          cx={w / 2 + pupil.x}
          cy={h / 2 + pupil.y}
          r={dims.pupilR}
          fill={color}
        />
      </svg>
    </>
  );
};

export default CharacterEye;
