import { useEffect, useRef, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import WallTile from '@/components/theme/WallTile';
import FloorLayer from '@/components/theme/FloorLayer';
import PrimeGlowLayer from '@/components/theme/PrimeGlowLayer';
import { type StyleKey } from '@/lib/theme/svgSources';
import { type Dimension } from '@/lib/theme/tokens';
import { getThemeForLevel, THEME_PRESETS } from '@/lib/theme/themes';

const STYLES: StyleKey[] = ['plated', 'chevron', 'hex', 'lightstrip', 'gold', 'ulam'];

export default function TilePreview() {
  const [dimension, setDimension] = useState<Dimension>('purple');
  const [primeGlow, setPrimeGlow] = useState(true);
  const [preset, setPreset] = useState('instrument');
  const sampleRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const theme = getThemeForLevel(1, preset);

  useEffect(() => {
    const node = sampleRef.current;
    if (!node) return;
    const resize = () => setScale(node.getBoundingClientRect().width / 448);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground px-5 py-8 sm:px-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-cinzel text-2xl text-gold mb-7">Instrument</h1>
        <div className="flex flex-wrap items-end gap-5 mb-8 font-mono text-sm">
          <div className="w-40">
            <label htmlFor="tile-dimension" className="block mb-2">Dimension</label>
            <Select value={dimension} onValueChange={value => { if (value === 'purple' || value === 'amber' || value === 'teal') setDimension(value); }}>
              <SelectTrigger id="tile-dimension" aria-label="Dimension"><SelectValue /></SelectTrigger>
              <SelectContent>{(['purple', 'amber', 'teal'] as const).map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-3 min-h-10" htmlFor="prime-glow">
            <Checkbox id="prime-glow" checked={primeGlow} onCheckedChange={value => setPrimeGlow(value === true)} />
            Prime glow
          </label>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-8 mb-10">
          {STYLES.map(styleKey => (
            <figure key={styleKey} className="min-w-0" data-style={styleKey}>
              <div className="grid grid-cols-2 w-24" data-wall={styleKey}>
                {Array.from({ length: 4 }, (_, index) => <WallTile key={index} size={48} styleKey={styleKey} dimension={dimension} />)}
              </div>
              <div className="mt-3" data-floor={styleKey}><FloorLayer cols={2} rows={2} size={48} styleKey={styleKey} dimension={dimension} /></div>
              <figcaption className="font-mono text-sm mt-3">{styleKey}</figcaption>
            </figure>
          ))}
        </div>

        <section className="border-t border-border pt-7">
          <div className="w-48 mb-5 font-mono text-sm">
            <label htmlFor="tile-preset" className="block mb-2">Preset</label>
            <Select value={preset} onValueChange={setPreset}>
              <SelectTrigger id="tile-preset" aria-label="Preset"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.keys(THEME_PRESETS).map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div ref={sampleRef} data-testid="prime-sample" className="relative w-full max-w-[448px] aspect-[14/10]">
            <div className="absolute left-0 top-0 origin-top-left" style={{ width: 448, height: 320, transform: `scale(${scale})` }}>
              <FloorLayer cols={14} rows={10} size={32} styleKey={theme.floor} dimension={dimension} />
              {primeGlow && theme.primeGlow && <PrimeGlowLayer cols={14} rows={10} size={32} dimension={dimension} />}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}