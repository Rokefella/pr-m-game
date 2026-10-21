import { memo, useEffect, useRef, useState } from 'react';

const APPEAR_MS = 150;
const SEGMENTS = [[6, 6, 3, 1], [8, 4, 1, 3], [4, 4, 5, 1], [4, 4, 1, 5], [4, 8, 7, 1], [10, 2, 1, 7], [2, 2, 9, 1], [2, 2, 1, 9], [2, 10, 11, 1], [12, 0, 1, 11]];

/** Hold only loads that survived the screen's initial appearance delay. */
export function useMinLoading(isLoading: boolean, minVisibleMs = 500): boolean {
  const [held, setHeld] = useState(isLoading);
  const startedAt = useRef<number | null>(isLoading ? Date.now() : null);
  useEffect(() => {
    if (isLoading) {
      if (startedAt.current === null) startedAt.current = Date.now();
      setHeld(true);
      return;
    }
    const start = startedAt.current;
    if (start === null) return;
    const elapsed = Date.now() - start;
    const remaining = elapsed < APPEAR_MS ? 0 : Math.max(0, APPEAR_MS + minVisibleMs - elapsed);
    if (remaining === 0) {
      startedAt.current = null;
      setHeld(false);
      return;
    }
    const timer = window.setTimeout(() => {
      startedAt.current = null;
      setHeld(false);
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [isLoading, minVisibleMs]);
  return isLoading || held;
}

const LoadingScreen = memo(({ label }: { label?: string }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), APPEAR_MS);
    return () => window.clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return (
    <div className="loading-screen" data-game-ui="open" role="status" aria-label={label ?? 'Loading PRÆM'}>
      <div className="loading-stack">
        <div className="loading-sigil">
          <div className="loading-glow" aria-hidden="true" />
          <svg viewBox="2 0 11 11" width="132" height="132" shapeRendering="crispEdges" aria-hidden="true">
            {SEGMENTS.map(([x, y, width, height], index) => (
              <rect key={index} x={x} y={y} width={width} height={height} className="loading-segment" style={{ animationDelay: `${index * 0.18}s` }} />
            ))}
            <rect x="6" y="6" width="1" height="1" className="loading-centre" />
          </svg>
        </div>
        <span className="font-cinzel loading-wordmark">PRÆM</span>
        {label && <span className="font-mono loading-label">{label}</span>}
      </div>
    </div>
  );
});
LoadingScreen.displayName = 'LoadingScreen';
export default LoadingScreen;