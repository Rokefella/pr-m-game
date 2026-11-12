import { useEffect, useState } from 'react';
import { myPraems, praemOwned, PRAEMS_CHANGED, ringClass, type Praem } from '@/lib/praems';
import DropIcon from './DropIcon';
import PixelSigil from './theme/intro/PixelSigil';
import type { OwnedDrop } from '@/lib/carriedDrops';

export function notebookEntries(drops: OwnedDrop[]) {
  return drops.filter(d => d.category === 'words').sort((a, b) => (a.acquired_at ?? '').localeCompare(b.acquired_at ?? ''));
}
export default function FolderCollections({ drops, revision }: { drops: OwnedDrop[]; revision: string }) {
  const [praems, setPraems] = useState<Praem[]>([]);
  useEffect(() => {
    let off = false; setPraems([]);
    const load = () => { void myPraems().then(data => { if (!off) setPraems(data); }).catch(() => undefined); };
    load(); window.addEventListener(PRAEMS_CHANGED, load);
    return () => { off = true; window.removeEventListener(PRAEMS_CHANGED, load); };
  }, [revision]);
  const slots = Array.from({ length: 30 }, (_, i) => praems.find(p => p.maze === i + 1 && praemOwned(p)));
  const words = notebookEntries(drops);
  return <>
    <section className="mt-10" aria-label="Præms">
      <div className="profile-section-label font-mono"><span>PRÆMS</span><span>{slots.filter(Boolean).length} / 30</span></div>
      <div className="profile-inventory-grid">{slots.map((p, i) => <div key={i} className={`profile-inventory-tile profile-praem-tile ${p ? `${ringClass(p.ring)} praem-${p.state}` : 'profile-tile-empty'}`} aria-label={p ? p.name : `Empty Præm slot ${i + 1}`}>
        {p ? <><DropIcon svg={p.state === 'set' ? p.icon_lit || p.icon_svg : p.icon_svg} size={36} /><span className="font-fell italic">{p.name}</span>{p.state === 'asleep' && <small className="font-fell italic">asleep</small>}</> : <span className="profile-praem-spiral"><PixelSigil id="praem" size={28} /></span>}
      </div>)}</div>
      <p className="profile-carry-note font-fell italic">One for every way in. Each one takes you back.</p>
    </section>
    <section className="mt-8" aria-label="Notebook"><div className="profile-section-label font-mono"><span>NOTEBOOK</span></div>
      <div className="profile-notebook font-fell italic">{words.length ? words.map((d, i) => <article key={d.id}>{i > 0 && <p className="profile-notebook-flourish" aria-hidden="true">·</p>}<h3>{d.name}</h3><p>{d.description}</p></article>) : <p>Nothing written down yet.</p>}</div>
    </section>
  </>;
}