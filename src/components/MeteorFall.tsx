import { useEffect, useRef } from 'react';
import { METEOR_LINE, METEOR_MS, METEOR_REDUCED_MS } from '@/lib/meteor';

/** Night sky, a burning streak top-right → bottom-left, a flash, a shake, one plated line. Tap to skip. */
export default function MeteorFall({ reduced, onDone }: { reduced: boolean; onDone: () => void }) {
  const done = useRef(false);
  const finish = useRef(onDone); finish.current = onDone;
  const end = () => { if (done.current) return; done.current = true; finish.current(); };
  useEffect(() => { const t = setTimeout(end, reduced ? METEOR_REDUCED_MS : METEOR_MS); return () => clearTimeout(t); }, [reduced]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div role="dialog" aria-label={METEOR_LINE} data-game-ui="true" className={`meteor-fall${reduced ? ' meteor-reduced' : ''}`} onPointerDown={end}>
      <div className="meteor-sky" />
      {!reduced && <div className="meteor-streak" />}
      {!reduced && <div className="meteor-flash" />}
      <p className="meteor-line font-fell italic">{METEOR_LINE}</p>
    </div>
  );
}
