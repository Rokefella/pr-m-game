import { memo, useMemo } from 'react';
import { mulberry32 } from '@/lib/garden/generateGarden';
import { seasonPalette, type GardenConfig } from '@/lib/garden/gardenConfig';
import { useReducedMotion } from '@/components/theme/useReducedMotion';

const CSS = `
@keyframes gpFall { from { transform: translate3d(0, -6vh, 0) rotate(0deg); } to { transform: translate3d(var(--sway), 106vh, 0) rotate(340deg); } }
@keyframes gpFallSway { from { transform: translate3d(calc(var(--sway) * -0.5), -6vh, 0) rotate(0deg); } to { transform: translate3d(var(--sway), 106vh, 0) rotate(-300deg); } }
@keyframes gpFirefly { 0% { transform: translate3d(0, 0, 0); opacity: 0; } 20% { opacity: 1; } 60% { opacity: .3; } 100% { transform: translate3d(12px, -40px, 0); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .gp { animation: none !important; display: none; } }
`;

type Particle = { left: number; top: number; delay: number; duration: number; sway: number; color: string; w: number; h: number; anim: string };

/** Screen-fixed seasonal particle drift (petals, fireflies, leaves, snow). */
const GardenParticles = memo(function GardenParticles({ config }: { config: GardenConfig }) {
  const reduced = useReducedMotion();
  const season = seasonPalette(config);

  const particles = useMemo<Particle[]>(() => {
    const rand = mulberry32(config.seed * 7 + 13);
    const kind = season.particle;
    const out: Particle[] = [];
    for (let i = 0; i < 36; i++) {
      const left = rand() * 100;
      const top = rand() * 100;
      const delay = -rand() * 16;
      if (kind === 'petals') {
        out.push({ left, top, delay, duration: 9 + rand() * 5, sway: (rand() - 0.3) * 40, color: '#ffb6d9', w: 4, h: 4, anim: 'gpFall' });
      } else if (kind === 'fireflies') {
        out.push({ left, top, delay, duration: 2 + rand() * 2, sway: 0, color: '#fff3a0', w: 3, h: 3, anim: 'gpFirefly' });
      } else if (kind === 'leaves') {
        const colors = ['#c8602a', '#e0993a', '#f0c040'];
        out.push({ left, top, delay, duration: 8 + rand() * 5, sway: (rand() - 0.3) * 50, color: colors[Math.floor(rand() * 3)], w: 5, h: 4, anim: 'gpFallSway' });
      } else {
        out.push({ left, top, delay, duration: 10 + rand() * 6, sway: (rand() - 0.5) * 20, color: '#ffffff', w: 3, h: 3, anim: 'gpFall' });
      }
    }
    return out;
  }, [config.seed, season.particle]);

  if (reduced) return null;

  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 8, overflow: 'hidden' }}>
      <style>{CSS}</style>
      {particles.map((p, i) => (
        <div
          key={i}
          className="gp"
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: p.anim === 'gpFirefly' ? `${p.top}%` : 0,
            width: p.w,
            height: p.h,
            background: p.color,
            ['--sway' as string]: `${p.sway}px`,
            animation: `${p.anim} ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
});

export default GardenParticles;
