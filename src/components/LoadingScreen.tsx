import { memo, useEffect, useRef, useState } from 'react';
import PraemSnake from './PraemSnake';

const APPEAR_MS = 150;

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
          <PraemSnake size={132} animate loop />
        </div>
        <span className="font-cinzel loading-wordmark">PRÆM</span>
        {label && <span className="font-mono loading-label">{label}</span>}
      </div>
    </div>
  );
});
LoadingScreen.displayName = 'LoadingScreen';
export default LoadingScreen;