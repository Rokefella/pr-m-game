import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import DropIcon from './DropIcon';
import PixelSigil from './theme/intro/PixelSigil';
import { praemSockets, ringClass, travelPraem, praemFailure, unlockPraemAudio, type Praem } from '@/lib/praems';

export default function PraemWall({ items, justSet = [], userId, onClose, onTravel }: { items: Praem[]; justSet?: number[]; userId: string; onClose: () => void; onTravel: () => void }) {
  const [selected, setSelected] = useState<number | null>(null), [note, setNote] = useState(''), [busy, setBusy] = useState(false), [leaving, setLeaving] = useState(false);
  const flight = useRef(false), timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const sockets = praemSockets(items), current = sockets.find(p => p.maze === selected);
  const travel = async (maze: number) => {
    if (flight.current) return; flight.current = true; setBusy(true); setNote(''); unlockPraemAudio();
    try {
      const result = await travelPraem(maze, userId);
      if (!result.ok) { setNote(praemFailure(result.reason)); return; }
      setLeaving(true); timer.current = setTimeout(onTravel, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 100 : 650);
    } catch { setNote(praemFailure()); }
    finally { flight.current = false; setBusy(false); }
  };
  return <div className="praem-modal" data-game-ui="open" data-no-thumbstick><section className="praem-panel" role="dialog" aria-label="The Wall">
    <Button variant="ghost" size="icon" className="praem-close" aria-label="Close Wall" disabled={busy || leaving} onClick={onClose}><X size={18} /></Button>
    <h2 className="font-cinzel">The Wall</h2>
    <div className="praem-wall-grid">{sockets.map(p => <Button variant="outline" key={p.maze} className={`praem-socket ${ringClass(p.ring)} praem-${p.state} ${justSet.includes(p.maze) ? 'praem-just-set' : ''}`} aria-label={p.state === 'none' ? `Empty socket ${p.maze}` : `${p.name}, ${p.state}`} onClick={() => setSelected(p.maze)}>
      {p.state === 'none' || p.state === 'sold' ? <span className="profile-praem-spiral"><PixelSigil id="praem" size={24} /></span> : <DropIcon svg={p.state === 'set' ? p.icon_lit || p.icon_svg : p.icon_svg} size={36} />}
      {p.state !== 'none' && <span className="font-fell">{p.name}</span>}
    </Button>)}</div>
    {current && current.state !== 'none' && <div className="praem-details"><h3 className="font-cinzel">{current.name}</h3><p className="font-fell">{current.description}</p>
      {current.state === 'asleep' && <p className="font-fell italic">Bank it to set it.</p>}
      {current.state === 'sold' && <p className="font-fell italic">Sold to the Banker</p>}
      {current.state === 'set' && <Button disabled={busy || leaving || current.can_travel === false} onClick={() => void travel(current.maze)}>Step through</Button>}
    </div>}
    {note && <p role="status" className="font-fell italic">{note}</p>}
    {leaving && <div className="praem-rift-out" aria-hidden="true" />}
  </section></div>;
}