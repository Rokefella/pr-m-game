import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { claimFind, findButton, findReceipt, type WorldFind } from '@/lib/worldFinds';
import type { WorldPoint } from '@/lib/worldTest';

type Props = { find: WorldFind; reading: boolean; at: () => WorldPoint; onClaimed: (id: string) => void };
/** Small find card; the server decides every grant. */
export default function FindCard({ find, reading, at, onClaimed }: Props) {
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState<string | null>(reading ? find.text ?? '' : null);
  const [receipt, setReceipt] = useState('');
  const [note, setNote] = useState('');
  const press = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await claimFind(find.id, at());
      if (r.granted) { setText(r.text ?? find.text ?? ''); setReceipt(findReceipt(r)); onClaimed(find.id); }
      else if (r.reason === 'already') { setText(find.text ?? ''); onClaimed(find.id); }
      else if (r.reason === 'needs') setNote(r.needs === 'sam_coal' ? 'You have nothing to light it with.' : 'Not yet.');
      else if (r.reason === 'needs_flag') setNote('Not yet.');
      else if (r.reason === 'too_far') setNote('Too far.');
      else setNote('Nothing happens.');
    } finally { setBusy(false); }
  };
  return <>
    <h2 className="font-cinzel">{find.title}</h2>
    {text != null ? <p className="font-fell world-find-text">{text}</p> : <>
      {note && <p className="font-fell">{note}</p>}
      <Button className="world-jump" disabled={busy} onClick={() => void press()}>{busy ? '…' : findButton(find.kind)}</Button>
    </>}
    {receipt && <p className="font-mono world-receipt">{receipt}</p>}
  </>;
}
