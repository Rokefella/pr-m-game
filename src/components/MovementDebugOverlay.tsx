import { useEffect, useState } from 'react';
import { isMovementDebugOn, movementDebug, netDebug } from '@/lib/netQueue';

export const MOVEMENT_DEBUG_EVENT = 'praem-movement-debug';

/** Dev-only live readout of input, loop and save-queue state. */
export default function MovementDebugOverlay() {
  const [on, setOn] = useState(isMovementDebugOn);
  const [, setTick] = useState(0);
  useEffect(() => {
    const sync = () => setOn(isMovementDebugOn());
    window.addEventListener(MOVEMENT_DEBUG_EVENT, sync);
    return () => window.removeEventListener(MOVEMENT_DEBUG_EVENT, sync);
  }, []);
  useEffect(() => {
    if (!on) return;
    const id = window.setInterval(() => setTick(t => t + 1), 250);
    return () => window.clearInterval(id);
  }, [on]);
  if (!on) return null;
  const now = Date.now();
  const age = (t: number) => (t ? `${now - t}ms` : '—');
  const locks = Object.entries(movementDebug.locks).map(([k, v]) => `${k}=${v ? 1 : 0}`).join(' ') || '—';
  const pending = Object.entries(netDebug.pending).map(([k, v]) => `${k}:${v}`).join(' ') || '—';
  const errors = netDebug.failures.slice(-3).reverse().map(f => `${f.kind} ${f.status} ${Math.round((now - f.time) / 1000)}s`);
  return (
    <div className="font-mono" style={{ position: 'fixed', top: 4, left: 4, zIndex: 2147483647, pointerEvents: 'none', fontSize: 10, lineHeight: 1.35, color: 'hsl(var(--foreground))', background: 'hsl(var(--background) / 0.75)', padding: '4px 6px', whiteSpace: 'pre' }}>
      {`input age ${age(movementDebug.lastInputAt)}
dir ${movementDebug.dir} held ${movementDebug.active ? 1 : 0}
locks ${locks}
pending ${pending}
loop age ${age(movementDebug.lastTickAt)} frame ${movementDebug.frameMs}ms restarts ${movementDebug.loopRestarts}
${errors.length ? errors.join('\n') : 'no request errors'}`}
    </div>
  );
}
