import { useMemo, useState } from 'react';
import GardenScene from '@/components/garden/GardenScene';
import GardenParticles from '@/components/garden/GardenParticles';
import { GARDEN_SIZE, type GardenConfig, type GardenSeason } from '@/lib/garden/gardenConfig';

const SEASONS: GardenSeason[] = ['spring', 'summer', 'autumn', 'winter'];

/** Public preview of the procedural garden, scaled to fit the viewport width. */
const GardenPreview = () => {
  const [season, setSeason] = useState<GardenSeason>('autumn');
  const [christmas, setChristmas] = useState(false);
  const [seed, setSeed] = useState(1010);

  const config: GardenConfig = useMemo(
    () => ({ season, seed: Number.isFinite(seed) ? seed : 1010, size: GARDEN_SIZE, special: christmas ? 'christmas' : null }),
    [season, seed, christmas],
  );
  const scale = typeof window !== 'undefined' ? window.innerWidth / (GARDEN_SIZE * 20) : 0.3;

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0b0e1f', overflow: 'auto' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: 10, background: 'rgba(11,14,31,0.9)', fontFamily: 'monospace', fontSize: 12, color: '#c8c4ba' }}>
        {SEASONS.map((s) => (
          <button key={s} type="button" onClick={() => setSeason(s)} style={{ background: season === s ? 'rgba(200,150,58,0.25)' : 'transparent', border: '0.5px solid #c8963a', color: '#c8963a', padding: '6px 10px', cursor: 'pointer', letterSpacing: '0.1em' }}>
            {s.toUpperCase()}
          </button>
        ))}
        <label style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input type="checkbox" checked={christmas} onChange={(e) => setChristmas(e.target.checked)} /> CHRISTMAS
        </label>
        <label style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          SEED
          <input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} style={{ width: 80, background: '#141a30', border: '0.5px solid #5a5855', color: '#c8c4ba', padding: '4px 6px' }} />
        </label>
      </div>
      <div style={{ position: 'relative', width: GARDEN_SIZE * 20, height: GARDEN_SIZE * 20, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
        <GardenScene config={config} />
      </div>
      <GardenParticles config={config} />
    </div>
  );
};

export default GardenPreview;
