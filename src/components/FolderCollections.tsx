import { useEffect, useRef, useState } from 'react';
import { myPraems, praemOwned, PRAEMS_CHANGED, ringClass, type Praem } from '@/lib/praems';
import DropIcon from './DropIcon';
import PixelSigil from './theme/intro/PixelSigil';
import type { OwnedDrop } from '@/lib/carriedDrops';

export function notebookEntries(drops: OwnedDrop[]) {
  return drops.filter(d => d.category === 'words').sort((a, b) => (a.acquired_at ?? '').localeCompare(b.acquired_at ?? ''));
}
export const NOTEBOOK_PAGE_SIZE = 4;
export function notebookPages<T>(entries: T[], size = NOTEBOOK_PAGE_SIZE): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < entries.length; i += size) pages.push(entries.slice(i, i + size));
  return pages;
}
function NotebookBook({ words }: { words: OwnedDrop[] }) {
  const pages = notebookPages(words);
  const last = Math.max(0, pages.length - 1);
  const [page, setPage] = useState(last);
  const [turn, setTurn] = useState<'next' | 'prev' | null>(null);
  const touch = useRef<number | null>(null);
  useEffect(() => { setPage(last); }, [last]);
  if (!words.length) return <div className="profile-notebook font-fell italic"><p>Nothing written down yet.</p></div>;
  const current = Math.min(page, last);
  const go = (d: number) => { const n = Math.max(0, Math.min(last, current + d)); if (n !== current) { setTurn(d > 0 ? 'next' : 'prev'); setPage(n); } };
  return <div className="profile-notebook-book" onTouchStart={e => { touch.current = e.touches[0]?.clientX ?? null; }} onTouchEnd={e => { const start = touch.current; touch.current = null; const end = e.changedTouches[0]?.clientX; if (start == null || end == null || Math.abs(end - start) < 40) return; go(end < start ? 1 : -1); }}>
    <div key={current} className={`profile-notebook font-fell italic${turn ? ` notebook-turn-${turn}` : ''}`}>
      {pages[current].map((d, i) => <article key={d.id}>{i > 0 && <p className="profile-notebook-flourish" aria-hidden="true">·</p>}<h3>{d.name}</h3><p>{d.description}</p></article>)}
    </div>
    <div className="profile-notebook-nav">
      <button type="button" aria-label="Previous page" disabled={current === 0} onClick={() => go(-1)}>‹</button>
      <small className="font-mono">page {current + 1} of {pages.length}</small>
      <button type="button" aria-label="Next page" disabled={current === last} onClick={() => go(1)}>›</button>
    </div>
  </div>;
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
      <NotebookBook words={words} />
    </section>
  </>;
}