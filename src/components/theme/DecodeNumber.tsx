import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion } from './useReducedMotion';

type Props = { value: number | string; run: boolean; glow: string; msPerDigit?: number; onDone?: () => void };

export default memo(function DecodeNumber({ value, run, glow, msPerDigit = 260, onDone }: Props) {
  const text = String(value);
  const reduced = useReducedMotion();
  const [locked, setLocked] = useState(0);
  const [random, setRandom] = useState(() => text.replace(/./g, () => String(Math.floor(Math.random() * 10))));
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    setLocked(0);
    if (reduced) {
      setLocked(text.length);
      doneRef.current?.();
      return;
    }
    if (!run) return;
    let resolved = 0;
    const scramble = window.setInterval(() => setRandom(text.replace(/./g, () => String(Math.floor(Math.random() * 10)))), 70);
    const resolve = window.setInterval(() => {
      resolved += 1;
      setLocked(resolved);
      if (resolved >= text.length) {
        window.clearInterval(scramble);
        window.clearInterval(resolve);
        doneRef.current?.();
      }
    }, msPerDigit);
    return () => { window.clearInterval(scramble); window.clearInterval(resolve); };
  }, [text, run, msPerDigit, reduced]);
  const complete = locked >= text.length;
  return <div className={`decode-number font-cinzel ${complete ? 'decode-complete' : ''}`} style={{ '--decode-glow': glow } as CSSProperties} aria-label={complete ? text : 'Decoding fragment'}>
    {Array.from(text, (digit, i) => <span key={i} className={i < locked ? 'decode-locked' : 'decode-unresolved'}>{i < locked ? digit : random[i]}</span>)}
  </div>;
});