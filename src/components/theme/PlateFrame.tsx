import { memo, type CSSProperties, type ReactNode } from 'react';
import { DIMENSION_GLOW } from '@/lib/theme/tokens';

type Props = { children: ReactNode; glow?: string; width?: number | string; style?: CSSProperties; className?: string };

export const PlateCorners = memo(function PlateCorners() {
  return <span className="plate-inner" aria-hidden="true">{['tl', 'tr', 'bl', 'br'].map(corner => <i key={corner} className={`plate-corner plate-${corner}`} />)}</span>;
});

export default memo(function PlateFrame({ children, glow = DIMENSION_GLOW.teal, width = 'min(92vw, 340px)', style, className = '' }: Props) {
  return <div className={`plate-frame ${className}`} style={{ '--plate-glow': glow, width, ...style } as CSSProperties}>
    <PlateCorners />
    <span className="plate-strip plate-strip-left" aria-hidden="true" />
    <span className="plate-strip plate-strip-right" aria-hidden="true" />
    {children}
  </div>;
});