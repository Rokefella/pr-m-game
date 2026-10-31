import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { fireRestFailure, restAtFire } from '@/lib/worldFinds';

export default function FireRestCard({ findKey, beforeRest, onSteps }: { findKey: string; beforeRest: () => Promise<void>; onSteps: (steps: number) => void }) {
  const [busy, setBusy] = useState(false);
  const flight = useRef(false);
  const [message, setMessage] = useState('');
  const rest = async () => {
    if (flight.current) return;
    flight.current = true; setBusy(true);
    try {
      await beforeRest();
      const result = await restAtFire(findKey);
      if (result.ok && typeof result.steps_remaining === 'number') { onSteps(result.steps_remaining); setMessage('+50 steps'); }
      else setMessage(fireRestFailure(result.reason));
    } catch { setMessage(fireRestFailure()); }
    finally { flight.current = false; setBusy(false); }
  };
  return <><h2 className="font-cinzel">Rest by the fire</h2><Button className="world-jump" disabled={busy} onClick={() => void rest()}>{busy ? '…' : 'Rest by the fire'}</Button>{message && <p role="status" className="font-fell">{message}</p>}</>;
}