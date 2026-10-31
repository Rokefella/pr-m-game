import { memo, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { mazeObjectSprite, type LevelSkin, type MazeObjectKind } from '@/lib/mazeSkins';

/** Fixed-orientation, transparent art from the shared decoded terrain cache. */
export default memo(function MazeEraObject({ skin, kind, size, blue = false, children }: { skin: LevelSkin | null; kind: MazeObjectKind; size: number; blue?: boolean; children: ReactNode }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const sprite = mazeObjectSprite(skin, kind);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !sprite) return;
    ctx.clearRect(0, 0, 16, 16);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, 0, 0, 16, 16);
    if (blue) {
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--maze-era-blue').trim();
      ctx.fillRect(0, 0, 16, 16);
      ctx.globalCompositeOperation = 'source-over';
    }
  }, [sprite, blue]);
  if (!sprite) return <>{children}</>;
  return <span className={`maze-era-object maze-era-${kind}${blue ? ' maze-era-blue' : ''}`} data-era-sprite={`${kind}_${skin?.skin.era_order}`} aria-hidden="true" style={{ width: size, height: size, '--maze-object-accent': skin?.skin.accent?.trim() || 'var(--instrument-beacon)' } as CSSProperties}>
    {kind !== 'veil' && <i className="maze-era-object-glow" />}
    <canvas ref={canvas} width={16} height={16} />
  </span>;
});