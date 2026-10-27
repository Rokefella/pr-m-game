import LegacyOrb, { type AvatarPalette } from '@/components/LegacyOrb';

const PALETTES: AvatarPalette[] = ['purple', 'red', 'amber', 'teal'];
const SIZES = [24, 30, 48, 96];

export default function AvatarPreview() {
  return <main className="avatar-preview text-foreground">
    <header className="px-4 py-6"><h1 className="font-cinzel text-xl">Player avatars</h1></header>
    {(['dark', 'ground'] as const).map(surface => <section key={surface} className={`avatar-preview-section avatar-preview-${surface}`} aria-label={surface === 'dark' ? 'Dark background' : 'Village ground'}>
      <div className="mx-auto max-w-5xl">
        <h2 className="font-mono text-sm mb-6">{surface === 'dark' ? 'DARK' : 'VILLAGE GROUND'}</h2>
        {PALETTES.map(palette => <div key={palette} className="mb-8" data-palette={palette}>
          <h3 className="font-cinzel text-base capitalize mb-3">{palette}</h3>
          {[false, true].map(walking => <div key={String(walking)} className="mb-5" data-walking={walking}>
            <p className="font-mono text-xs mb-2">{walking ? 'WALKING' : 'IDLE'}</p>
            <div className="avatar-preview-sizes">
              {SIZES.map(size => <figure key={size} className="m-0 text-center min-w-0" data-size={size}>
                <div className="avatar-preview-sprite"><LegacyOrb palette={palette} walking={walking} size={size} /></div>
                <figcaption className="font-mono text-xs mt-2">{size}px</figcaption>
              </figure>)}
            </div>
          </div>)}
        </div>)}
      </div>
    </section>)}
  </main>;
}
