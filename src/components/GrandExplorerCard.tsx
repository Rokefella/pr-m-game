import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { inventoryChanged } from '@/lib/inventoryEvents';
import { claimedDate, claimGrandExplorer, explorerClaimed, explorerComplete, explorerPercentLabel, explorerProgress, type ExplorerProgress } from '@/lib/grandExplorer';

type Props = { beforeProgress: () => Promise<void>; onClaimed: () => void | Promise<void> };

export default function GrandExplorerCard({ beforeProgress, onClaimed }: Props) {
  const [progress, setProgress] = useState<ExplorerProgress | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const flight = useRef(false);
  useEffect(() => {
    let off = false;
    void (async () => {
      await beforeProgress().catch(() => undefined);
      const next = await explorerProgress();
      if (!off) setProgress(next);
    })().catch(() => { if (!off) setFailed(true); });
    return () => { off = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const claim = async () => {
    if (flight.current) return;
    flight.current = true; setBusy(true); setNote('');
    try {
      const res = await claimGrandExplorer();
      if (!res.ok) { setNote(res.reason === 'already_claimed' ? '' : 'Not yet. A little of it is still unwalked.'); }
      else setTitle(res.title ?? 'Grand Explorer');
      setProgress(await explorerProgress().catch(() => progress));
      if (res.ok || res.reason === 'already_claimed') { inventoryChanged(); await onClaimed(); }
    } catch { setNote("That didn't save. Try again."); }
    finally { flight.current = false; setBusy(false); }
  };

  const done = progress && (explorerClaimed(progress) || title);
  const date = progress ? claimedDate(progress.claimed) ?? (title ? claimedDate(new Date().toISOString()) : null) : null;
  const width = progress ? Math.min(100, Number(explorerPercentLabel(progress))) : 0;
  return <>
    <h2 className="font-cinzel">Signpost</h2>
    {!progress && !failed && <p className="font-fell">…</p>}
    {failed && <p className="font-fell">The words on the post are hard to read today.</p>}
    {progress && (done ? <>
      <p className="font-fell">You have walked all of it.</p>
      {date && <p className="font-mono">{date}</p>}
      {title && <p className="font-fell">You are now known as {title}.</p>}
    </> : <>
      <p className="font-fell">You have walked {explorerPercentLabel(progress)}% of the land.</p>
      <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={width} style={{ height: 3, background: 'hsl(var(--muted))', margin: '4px 0 12px' }}>
        <div style={{ height: '100%', width: `${width}%`, background: 'hsl(var(--primary))' }} />
      </div>
      <p className="font-fell">Walk every stretch of it and the land will remember you.</p>
      {explorerComplete(progress) && <Button variant="outline" className="world-jump" disabled={busy} onClick={() => void claim()}>The land remembers</Button>}
    </>)}
    {note && <p className="font-fell">{note}</p>}
  </>;
}
